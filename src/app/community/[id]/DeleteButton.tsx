"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost, deleteComment } from "../actions";

export default function DeleteButton({
  kind,
  id,
  postId,
}: {
  kind: "post" | "comment";
  id: string;
  postId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === "post") {
          await deletePost(id);
          router.push("/community");
        } else {
          await deleteComment(id, postId);
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
      }
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45 transition-colors hover:text-oxblood"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-oxblood hover:text-maroon disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Confirm delete"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45 hover:text-ink/70 disabled:opacity-60"
      >
        Cancel
      </button>
      {error && <span className="font-sans text-xs text-oxblood">{error}</span>}
    </span>
  );
}
