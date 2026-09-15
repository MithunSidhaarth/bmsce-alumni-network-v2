"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closePosting, reopenPosting } from "@/app/careers/actions";

/**
 * Two-step delete for a posting. Never deletes on a single click.
 * Only rendered for the posting's owner (or an admin) — the server action and
 * RLS enforce that independently of this UI.
 */
export default function DeletePostingButton({
  jobId,
  closed,
  size = "normal",
  redirectTo,
}: {
  jobId: string;
  closed: boolean;
  size?: "normal" | "small";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pad = size === "small" ? "px-4 py-2 text-[11px]" : "px-5 py-2.5 text-[12px]";

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setConfirming(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  // Closed → offer restore
  if (closed) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => reopenPosting(jobId))}
          className={`rounded-sm border border-gold/50 ${pad} font-sans font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60`}
        >
          {busy ? "Restoring…" : "Restore posting"}
        </button>
        {error && <p className="font-sans text-sm text-oxblood">{error}</p>}
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`rounded-sm border border-oxblood/40 ${pad} font-sans font-medium uppercase tracking-[0.12em] text-oxblood/80 transition-colors hover:border-oxblood hover:bg-oxblood hover:text-ivory`}
        >
          Delete posting
        </button>
        {error && <p className="font-sans text-sm text-oxblood">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-oxblood/30 bg-oxblood/5 p-4">
      <p className="font-sans text-sm font-medium text-oxblood">
        Delete this posting?
      </p>
      <p className="mt-1.5 max-w-sm font-sans text-sm leading-relaxed text-ink/70">
        It disappears from the careers board straight away. Applications
        you&rsquo;ve already received are kept, and you can restore it from My
        postings.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => closePosting(jobId))}
          className={`rounded-sm bg-oxblood ${pad} font-sans font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60`}
        >
          {busy ? "Deleting…" : "Yes, delete it"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className={`rounded-sm border border-gold/50 ${pad} font-sans font-medium uppercase tracking-[0.12em] text-ink/70 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60`}
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
    </div>
  );
}
