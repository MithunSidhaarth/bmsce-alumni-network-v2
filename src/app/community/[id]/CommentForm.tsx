"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "../actions";

export default function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addComment(postId, body);
        setBody("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reply.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="comment-body" className="sr-only">
        Write a reply
      </label>
      <textarea
        id="comment-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        maxLength={5000}
        required
        className="min-h-[100px] w-full resize-y rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      {error && <p className="font-sans text-sm text-oxblood">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
      >
        {busy ? "Posting…" : "Reply"}
      </button>
    </form>
  );
}
