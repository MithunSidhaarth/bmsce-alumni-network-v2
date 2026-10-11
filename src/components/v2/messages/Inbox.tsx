"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import Avatar from "../Avatar";
import Icon from "../Icon";

export type InboxRow = {
  thread_id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  other_type: string;
  last_message_at: string;
  last_preview: string | null;
  last_sender_id: string | null;
  unread: number;
  blocked: boolean;
};

export default function Inbox({ rows, meId, verified }: { rows: InboxRow[]; meId: string; verified: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const openId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;

  // Any new message in one of my threads (RLS filters the stream) re-pulls
  // the inbox so order, previews and unread dots stay current.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox:${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, router]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) => (r.other_name ?? "").toLowerCase().includes(needle) || (r.last_preview ?? "").toLowerCase().includes(needle)
    );
  }, [q, rows]);

  return (
    <aside
      aria-label="Conversations"
      className={`min-h-0 w-full shrink-0 flex-col border-ink/12 md:flex md:w-[21rem] md:border-r ${openId ? "hidden" : "flex"}`}
    >
      <div className="border-b border-ink/10 px-4 pb-3 pt-4">
        <h1 className="font-display text-2xl">Messages</h1>
        <div className="relative mt-3">
          <label htmlFor="inbox-q" className="sr-only">
            Search conversations
          </label>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
          <input
            id="inbox-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations"
            className="h-10 w-full rounded-full border border-ink/15 bg-ivory pl-9 pr-3 text-sm placeholder:text-ink/45 focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {shown.map((r) => {
          const active = r.thread_id === openId;
          const mine = r.last_sender_id === meId;
          return (
            <li key={r.thread_id}>
              <Link
                href={`/messages/${r.thread_id}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 border-b border-ink/[0.07] px-4 py-3 transition-colors ${
                  active ? "bg-lime/45" : "hover:bg-ink/[0.04]"
                }`}
              >
                <Avatar name={r.other_name} src={r.other_photo} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[0.9375rem] ${r.unread ? "font-bold" : "font-semibold"}`}>
                      {r.other_name ?? "Member"}
                    </span>
                    <time dateTime={r.last_message_at} className="shrink-0 text-xs text-ink/50">
                      {timeAgo(r.last_message_at)}
                    </time>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={`truncate text-sm ${r.unread ? "font-semibold text-ink" : "text-ink/60"}`}>
                      {mine && "You: "}
                      {r.last_preview}
                    </span>
                    {r.unread > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-tangerine px-1.5 font-mono text-[10px] text-white">
                        {r.unread}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="px-6 py-12 text-center">
            <p className="hand text-[1.6rem] text-forest">{rows.length === 0 ? "No conversations yet" : "No matches"}</p>
            <p className="mt-2 text-sm text-ink/65">
              {!verified
                ? "Messaging opens once an admin has verified your account."
                : rows.length === 0
                ? "Find someone in the Alumni Network and say hello from their profile."
                : "Try a different name."}
            </p>
            {verified && rows.length === 0 && (
              <Link href="/directory" className="btn btn-sm mt-4">
                Browse members
              </Link>
            )}
          </li>
        )}
      </ul>
    </aside>
  );
}
