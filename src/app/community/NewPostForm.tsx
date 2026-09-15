"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "./actions";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function NewPostForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const id = await createPost(title, body);
        setTitle("");
        setBody("");
        setOpen(false);
        router.push(`/community/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not post.");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-sm bg-oxblood px-7 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
      >
        Start a discussion
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl border border-gold/30 bg-ivory-dim/40 p-6 md:p-8"
    >
      <label className="block">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60">
          Title
        </span>
        <input
          className={`${FIELD} mt-2`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to ask or discuss?"
          maxLength={200}
          required
        />
      </label>
      <label className="block">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60">
          Details
        </span>
        <textarea
          className={`${FIELD} mt-2 min-h-[140px] resize-y`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add context. Plain text or basic Markdown is fine."
          maxLength={10000}
          required
        />
      </label>

      {error && <p className="font-sans text-sm text-oxblood">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {busy ? "Posting…" : "Post"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="rounded-sm border border-gold/50 px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/70 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
