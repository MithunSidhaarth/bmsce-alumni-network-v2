"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "./actions";

export default function DeleteEventButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteEvent(id);
        router.refresh();
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
        className="rounded-sm border border-oxblood/40 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood/80 transition-colors hover:border-oxblood hover:bg-oxblood hover:text-ivory"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-sans text-xs text-ink/60">Delete “{title}”?</span>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded-sm bg-oxblood px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
      >
        {busy ? "…" : "Yes"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="rounded-sm border border-gold/50 px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/70 hover:text-oxblood disabled:opacity-60"
      >
        No
      </button>
      {error && <span className="font-sans text-xs text-oxblood">{error}</span>}
    </div>
  );
}
