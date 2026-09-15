"use client";

import { useState, useTransition } from "react";
import { reportContent } from "@/app/moderation/actions";

export default function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType:
    | "posting"
    | "profile"
    | "mentor"
    | "discussion_post"
    | "discussion_comment";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await reportContent(targetType, targetId, reason);
        setDone(true);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send report.");
      }
    });
  };

  if (done) {
    return (
      <p className="font-sans text-[11px] uppercase tracking-[0.12em] text-ink/45">
        Reported — thank you
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45 underline decoration-transparent underline-offset-4 transition-colors hover:text-oxblood hover:decoration-accent"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-ivory-dim/50 p-4">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/60">
        Report this to the admins
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's the problem? (optional)"
        className="mt-2 min-h-[70px] w-full resize-y rounded-lg border border-gold/40 bg-ivory/70 px-3 py-2 font-sans text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-sm bg-oxblood px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {busy ? "Sending…" : "Submit report"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="rounded-sm border border-gold/50 px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/70 hover:text-oxblood disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 font-sans text-sm text-oxblood">{error}</p>}
    </div>
  );
}
