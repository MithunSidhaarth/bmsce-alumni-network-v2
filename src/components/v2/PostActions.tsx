"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePost, react, setHidden, setPinned, suggestForWall } from "@/app/posts/actions";
import { reportContent } from "@/app/moderation/actions";
import { REACTIONS } from "@/lib/posts";
import { motionOK } from "@/lib/motion";
import type { ReactionKind } from "@/lib/types";
import Icon from "./Icon";
import { said } from "@/lib/fail";

export default function PostActions({
  postId,
  href,
  reactionCount,
  commentCount,
  myReaction,
  isOwn,
  canModerate,
  isAdmin,
  isPinned,
  isHidden,
}: {
  postId: string;
  href: string;
  reactionCount: number;
  commentCount: number;
  myReaction: ReactionKind | null;
  isOwn: boolean;
  canModerate: boolean;
  isAdmin: boolean;
  isPinned: boolean;
  isHidden: boolean;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<ReactionKind | null>(myReaction);
  const [count, setCount] = useState(reactionCount);
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // A fresh number each time a reaction is added, so the burst replays.
  const [burst, setBurst] = useState<{ key: number; glyph: string } | null>(null);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!picker && !menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) {
        setPicker(false);
        setMenu(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [picker, menu]);

  // Optimistic: the number moves the moment you tap, and rolls back on error.
  const choose = (kind: ReactionKind | null) => {
    const before = { mine, count };
    setPicker(false);
    setMine(kind);
    setCount((c) => c + (kind && !mine ? 1 : !kind && mine ? -1 : 0));
    if (kind && motionOK()) {
      const glyph = REACTIONS.find((r) => r.kind === kind)?.glyph ?? "♥";
      const key = Date.now();
      setBurst({ key, glyph });
      window.setTimeout(() => setBurst((b) => (b?.key === key ? null : b)), 800);
    }
    start(async () => {
      try {
        await react(postId, kind);
      } catch (e) {
        setMine(before.mine);
        setCount(before.count);
        setNote(said(e) ?? "Could not save your reaction.");
      }
    });
  };

  const run = (fn: () => Promise<unknown>, done?: string) => {
    setMenu(false);
    start(async () => {
      try {
        await fn();
        if (done) setNote(done);
        router.refresh();
      } catch (e) {
        setNote(said(e) ?? "Something went wrong.");
      }
    });
  };

  const share = async () => {
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        setNote("Link copied");
      }
    } catch {
      /* the share sheet was dismissed */
    }
  };

  const current = REACTIONS.find((r) => r.kind === mine);
  const item = "flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm hover:bg-ink/[0.06]";

  return (
    <div ref={wrap} className="relative mt-4 border-t border-ink/10 pt-1.5">
      <div className="flex items-center gap-1 text-sm text-ink/70">
        <div className="relative">
          <button
            type="button"
            onClick={() => (mine ? choose(null) : choose("like"))}
            onContextMenu={(e) => {
              e.preventDefault();
              setPicker(true);
            }}
            aria-pressed={Boolean(mine)}
            disabled={pending}
            className={`relative flex h-10 items-center gap-1.5 rounded-full px-3 font-medium transition-colors hover:bg-ink/[0.06] ${
              mine ? "text-tangerine" : ""
            }`}
          >
            <Icon name="heart" filled={Boolean(mine)} className={`h-[1.15rem] w-[1.15rem] ${burst ? "react-pop" : ""}`} />
            {burst && (
              <span key={burst.key} className="pointer-events-none absolute left-5 top-1/2" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, i) => {
                  const angle = (i / 9) * Math.PI * 2 + 0.3;
                  const reach = 26 + (i % 3) * 12;
                  return (
                    <span
                      key={i}
                      className="react-burst absolute text-[0.8rem] leading-none text-tangerine"
                      style={{
                        ["--dx" as string]: `${Math.round(Math.cos(angle) * reach)}px`,
                        ["--dy" as string]: `${Math.round(Math.sin(angle) * reach - 10)}px`,
                        ["--rot" as string]: `${(i % 2 ? 1 : -1) * (20 + i * 9)}deg`,
                        animationDelay: `${i * 12}ms`,
                      }}
                    >
                      {burst.glyph}
                    </span>
                  );
                })}
              </span>
            )}
            <span>{current && current.kind !== "like" ? current.label : mine ? "Liked" : "Like"}</span>
            {count > 0 && <span className="font-mono text-xs">{count}</span>}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPicker((v) => !v)}
          aria-expanded={picker}
          aria-label="More reactions"
          className="flex h-10 w-8 items-center justify-center rounded-full text-ink/45 hover:bg-ink/[0.06] hover:text-ink"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
        </button>

        <Link href={`${href}#replies`} className="flex h-10 items-center gap-1.5 rounded-full px-3 font-medium hover:bg-ink/[0.06]">
          <Icon name="comment" className="h-[1.15rem] w-[1.15rem]" />
          <span>Reply</span>
          {commentCount > 0 && <span className="font-mono text-xs">{commentCount}</span>}
        </Link>

        <button type="button" onClick={share} className="flex h-10 items-center gap-1.5 rounded-full px-3 font-medium hover:bg-ink/[0.06]">
          <Icon name="share" className="h-[1.15rem] w-[1.15rem]" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <span role="status" className="ml-1 truncate text-xs text-ink/55">
          {note}
        </span>

        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label="Post options"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/[0.06]"
        >
          <Icon name="more" className="h-5 w-5 stroke-[2.6]" />
        </button>
      </div>

      {picker && (
        <div
          role="group"
          aria-label="Choose a reaction"
          className="sheet absolute bottom-[calc(100%-0.25rem)] left-0 z-20 flex gap-1 p-1.5 motion-ok:animate-[var(--animate-rise)]"
        >
          {REACTIONS.map((r) => (
            <button
              key={r.kind}
              type="button"
              onClick={() => choose(mine === r.kind ? null : r.kind)}
              aria-pressed={mine === r.kind}
              className={`flex flex-col items-center gap-1 rounded px-3 py-2 text-xs font-medium transition-transform hover:-translate-y-0.5 hover:bg-lime ${
                mine === r.kind ? "bg-lime" : ""
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">{r.glyph}</span>
              {r.label}
            </button>
          ))}
        </div>
      )}

      {menu && (
        <div role="menu" className="sheet absolute right-0 top-[calc(100%-0.25rem)] z-20 w-60 p-1.5 motion-ok:animate-[var(--animate-rise)]">
          {isOwn && (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() =>
                run(async () => {
                  const status = await suggestForWall(postId);
                  setNote(status === "published" ? "Already on The Wall" : "Sent to the admins for The Wall");
                })
              }
            >
              <Icon name="pin" className="h-4 w-4" /> Suggest for The Wall
            </button>
          )}
          {canModerate && (
            <button type="button" role="menuitem" className={item} onClick={() => run(() => setPinned(postId, !isPinned), isPinned ? "Unpinned" : "Pinned")}>
              <Icon name="star" className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin this post"}
            </button>
          )}
          {canModerate && (
            <button type="button" role="menuitem" className={item} onClick={() => run(() => setHidden(postId, !isHidden), isHidden ? "Visible again" : "Hidden")}>
              <Icon name="eye" className="h-4 w-4" /> {isHidden ? "Unhide" : "Hide from members"}
            </button>
          )}
          {!isOwn && (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                const reason = window.prompt("What is wrong with this post? (optional)");
                if (reason === null) return setMenu(false);
                run(() => reportContent("post", postId, reason), "Reported. Thank you.");
              }}
            >
              <Icon name="flag" className="h-4 w-4" /> Report
            </button>
          )}
          {(isOwn || isAdmin) && (
            <button
              type="button"
              role="menuitem"
              className={`${item} text-pin`}
              onClick={() => {
                if (window.confirm("Delete this post and its replies? This cannot be undone.")) {
                  run(() => deletePost(postId));
                } else setMenu(false);
              }}
            >
              <Icon name="trash" className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
