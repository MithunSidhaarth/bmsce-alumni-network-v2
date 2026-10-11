"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { blockMember } from "@/app/messages/actions";
import { reportContent } from "@/app/moderation/actions";
import { clockTime, dayKey, longDate } from "@/lib/format";
import Avatar from "../Avatar";
import Icon from "../Icon";

export type Message = {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

// A message that is on screen but not confirmed by the database yet.
type Draft = Message & { state?: "sending" | "failed"; key?: string };

type Other = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  user_type: string;
  graduation_year: number | null;
  job_title: string | null;
  company: string | null;
};

const PAGE = 40;
const GROUP_GAP_MS = 5 * 60 * 1000;

export default function Thread({
  threadId,
  meId,
  other,
  initial,
  hasEarlier,
  blockedByMe,
  blocked,
}: {
  threadId: string;
  meId: string;
  other: Other;
  initial: Message[];
  hasEarlier: boolean;
  blockedByMe: boolean;
  blocked: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Draft[]>(initial);
  const [earlier, setEarlier] = useState(hasEarlier);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(true);
  const [live, setLive] = useState<"connecting" | "live" | "down">("connecting");
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  const add = useCallback((m: Message) => {
    setMessages((all) => {
      if (all.some((x) => x.id === m.id)) return all;
      // Replace my optimistic copy of the same text, if one is waiting.
      const pending = all.findIndex((x) => x.state === "sending" && x.sender_id === m.sender_id && x.body === m.body);
      if (pending >= 0) {
        const next = [...all];
        next[pending] = m;
        return next;
      }
      return [...all, m];
    });
  }, []);

  // Live updates: new messages in this thread, and read receipts on mine.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Message;
          add(m);
          if (m.sender_id !== meId) supabase.rpc("mark_thread_read", { p_thread: threadId }).then(() => undefined);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED" ? "live" : status === "CLOSED" ? "connecting" : "down"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, meId, add]);

  // Offline awareness, and a catch-up fetch when the connection returns.
  useEffect(() => {
    const sync = async () => {
      setOnline(true);
      const last = messages.filter((m) => !m.state).at(-1)?.id ?? 0;
      const { data } = await createClient()
        .from("dm_messages")
        .select("id, sender_id, body, created_at, read_at")
        .eq("thread_id", threadId)
        .gt("id", last)
        .order("id");
      (data as Message[] | null)?.forEach(add);
    };
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, add]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadEarlier = async () => {
    const el = scroller.current;
    const first = messages[0]?.id;
    if (!first || !el) return;
    setLoadingEarlier(true);
    const before = el.scrollHeight;
    const { data } = await createClient()
      .from("dm_messages")
      .select("id, sender_id, body, created_at, read_at")
      .eq("thread_id", threadId)
      .lt("id", first)
      .order("id", { ascending: false })
      .limit(PAGE + 1);
    const rows = (data ?? []) as Message[];
    setEarlier(rows.length > PAGE);
    stickToBottom.current = false;
    setMessages((all) => [...rows.slice(0, PAGE).reverse(), ...all]);
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight - before;
    });
    setLoadingEarlier(false);
  };

  const deliver = async (draft: Draft) => {
    const { data, error } = await createClient()
      .from("dm_messages")
      .insert({ thread_id: threadId, sender_id: meId, body: draft.body })
      .select("id, sender_id, body, created_at, read_at")
      .single();
    setMessages((all) =>
      all.map((x) => (x.key === draft.key ? (error || !data ? { ...x, state: "failed" } : (data as Message)) : x))
    );
    if (error) setNotice(error.message);
  };

  const send = () => {
    const body = text.trim();
    if (!body || blocked) return;
    const draft: Draft = {
      id: -Date.now(),
      key: crypto.randomUUID(),
      sender_id: meId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      state: "sending",
    };
    stickToBottom.current = true;
    setNotice(null);
    setMessages((all) => [...all, draft]);
    setText("");
    deliver(draft);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const lastMine = [...messages].reverse().find((m) => m.sender_id === meId && !m.state);
  const subtitle =
    other.user_type === "student"
      ? "Student"
      : [other.graduation_year ? `Batch of ${other.graduation_year}` : null, [other.job_title, other.company].filter(Boolean).join(" at ")]
          .filter(Boolean)
          .join(" · ") || "Alumni";

  return (
    <section aria-label={`Conversation with ${other.full_name ?? "member"}`} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-ink/10 px-3 py-2.5 md:px-5">
        <Link href="/messages" aria-label="Back to conversations" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/[0.06] md:hidden">
          <Icon name="back" />
        </Link>
        <Link href={`/directory/${other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={other.full_name} src={other.photo_url} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">{other.full_name ?? "Member"}</span>
            <span className="block truncate text-xs text-ink/55">{subtitle}</span>
          </span>
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Conversation options"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/[0.06]"
          >
            <Icon name="more" className="h-5 w-5 stroke-[2.6]" />
          </button>
          {menu && (
            <div role="menu" className="sheet absolute right-0 top-[calc(100%+0.25rem)] z-20 w-56 p-1.5">
              <Link href={`/directory/${other.id}`} role="menuitem" className="flex items-center gap-2.5 rounded px-3 py-2 text-sm hover:bg-ink/[0.06]">
                <Icon name="user" className="h-4 w-4" /> View profile
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm hover:bg-ink/[0.06]"
                onClick={async () => {
                  setMenu(false);
                  if (!blockedByMe && !window.confirm(`Block ${other.full_name ?? "this member"}? Neither of you will be able to send messages here.`)) return;
                  try {
                    await blockMember(other.id, !blockedByMe);
                    router.refresh();
                  } catch (e) {
                    setNotice(e instanceof Error ? e.message : "Could not update the block.");
                  }
                }}
              >
                <Icon name="lock" className="h-4 w-4" /> {blockedByMe ? "Unblock" : "Block"}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-pin hover:bg-ink/[0.06]"
                onClick={async () => {
                  setMenu(false);
                  const reason = window.prompt("Tell the admins what happened. They will see this note, not your messages.");
                  if (reason === null) return;
                  try {
                    await reportContent("profile", other.id, `Reported from a direct message. ${reason}`);
                    setNotice("Reported to the admins. Thank you.");
                  } catch (e) {
                    setNotice(e instanceof Error ? e.message : "Could not send the report.");
                  }
                }}
              >
                <Icon name="flag" className="h-4 w-4" /> Report
              </button>
            </div>
          )}
        </div>
      </header>

      {(!online || live === "down") && (
        <p role="status" className="bg-tangerine px-4 py-1.5 text-center text-xs font-medium text-white">
          {!online ? "You are offline. Messages will not send until you reconnect." : "Live updates are paused. Trying to reconnect."}
        </p>
      )}

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto bg-ivory/55 px-3 py-4 md:px-6"
      >
        {earlier && (
          <div className="mb-4 text-center">
            <button type="button" onClick={loadEarlier} disabled={loadingEarlier} className="chip">
              {loadingEarlier ? "Loading" : "Earlier messages"}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar name={other.full_name} src={other.photo_url} size={72} />
            <p className="hand mt-4 text-[1.7rem] text-forest">Say hello to {(other.full_name ?? "them").split(" ")[0]}</p>
            <p className="mt-1 max-w-xs text-sm text-ink/60">This is the start of your conversation. Only the two of you can read it.</p>
          </div>
        )}
        <ol className="flex flex-col">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = m.sender_id === meId;
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
            const startsGroup =
              newDay || prev.sender_id !== m.sender_id || +new Date(m.created_at) - +new Date(prev.created_at) > GROUP_GAP_MS;
            const endsGroup =
              !next ||
              next.sender_id !== m.sender_id ||
              dayKey(next.created_at) !== dayKey(m.created_at) ||
              +new Date(next.created_at) - +new Date(m.created_at) > GROUP_GAP_MS;
            return (
              <li key={m.key ?? m.id} className={startsGroup ? "mt-3" : "mt-0.5"}>
                {newDay && (
                  <p className="label-mono my-4 text-center text-ink/45">
                    <time dateTime={m.created_at}>{longDate(m.created_at)}</time>
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap break-words px-3.5 py-2 text-[0.9375rem] leading-relaxed sm:max-w-[70%] ${
                      mine ? "bg-forest text-ivory" : "border border-ink/10 bg-paper"
                    } ${m.state === "failed" ? "opacity-60" : ""}`}
                    style={{
                      borderRadius: mine
                        ? `16px ${startsGroup ? 16 : 5}px ${endsGroup ? 16 : 5}px 16px`
                        : `${startsGroup ? 16 : 5}px 16px 16px ${endsGroup ? 16 : 5}px`,
                    }}
                  >
                    {m.body}
                  </div>
                </div>
                {endsGroup && (
                  <p className={`mt-1 flex items-center gap-2 text-[0.6875rem] text-ink/45 ${mine ? "justify-end" : "justify-start"}`}>
                    {m.state === "failed" ? (
                      <>
                        <span className="text-pin">Not sent.</span>
                        <button
                          type="button"
                          className="font-semibold text-ink underline"
                          onClick={() => {
                            setMessages((all) => all.map((x) => (x.key === m.key ? { ...x, state: "sending" } : x)));
                            deliver(m);
                          }}
                        >
                          Try again
                        </button>
                      </>
                    ) : m.state === "sending" ? (
                      "Sending"
                    ) : (
                      <>
                        <time dateTime={m.created_at}>{clockTime(m.created_at)}</time>
                        {mine && lastMine?.id === m.id && <span>{m.read_at ? "· Seen" : "· Sent"}</span>}
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="border-t border-ink/10 bg-paper px-3 py-3 md:px-5">
        {notice && (
          <p role="status" className="mb-2 text-xs text-ink/65">
            {notice}
          </p>
        )}
        {blocked ? (
          <p className="py-2 text-center text-sm text-ink/60">
            {blockedByMe ? "You blocked this member. Unblock them from the menu to message again." : "You can no longer send messages in this conversation."}
          </p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor="dm-text" className="sr-only">
              Message
            </label>
            <textarea
              id="dm-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              maxLength={4000}
              placeholder="Write a message"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-[22px] border border-ink/20 bg-ivory px-4 py-2.5 text-[0.9375rem] placeholder:text-ink/45 focus:border-ink focus:outline-none [field-sizing:content]"
            />
            <button type="submit" disabled={!text.trim() || !online} aria-label="Send" className="btn h-11 w-11 shrink-0 p-0">
              <Icon name="send" className="h-[1.1rem] w-[1.1rem]" />
            </button>
          </form>
        )}
      </footer>
    </section>
  );
}
