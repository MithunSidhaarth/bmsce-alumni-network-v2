"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike, toggleCommentLike } from "../actions";

type LikeButtonProps = {
  liked: boolean;
  count: number;
} & ({ postId: string; commentId?: never } | { commentId: string; postId?: never });

export default function LikeButton({
  liked,
  count,
  postId,
  commentId,
}: LikeButtonProps) {
  const router = useRouter();
  // Optimistic local state; the server action + revalidate is the source of truth.
  const [on, setOn] = useState(liked);
  const [n, setN] = useState(count);
  const [busy, startTransition] = useTransition();

  const click = () => {
    setOn((v) => !v);
    setN((v) => v + (on ? -1 : 1));
    startTransition(async () => {
      try {
        if (postId) {
          await toggleLike(postId);
        } else if (commentId) {
          await toggleCommentLike(commentId);
        }
        router.refresh();
      } catch {
        // revert on failure
        setOn(liked);
        setN(count);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-sans text-[12px] font-medium uppercase tracking-[0.12em] transition-colors disabled:opacity-60 ${
        on
          ? "border-oxblood bg-oxblood text-ivory"
          : "border-gold/50 text-ink/70 hover:border-oxblood hover:text-oxblood"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-6.7-4.35-9.33-8.02C.9 10.36 1.4 7.3 3.7 5.9c1.9-1.16 4.3-.6 5.6 1.02L12 9.6l2.7-2.68c1.3-1.62 3.7-2.18 5.6-1.02 2.3 1.4 2.8 4.46 1.03 7.08C18.7 16.65 12 21 12 21Z" />
      </svg>
      {on ? "Liked" : "Like"} · {n}
    </button>
  );
}
