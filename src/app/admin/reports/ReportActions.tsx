"use client";

import { useState, useTransition } from "react";
import { setReportStatus } from "@/app/moderation/actions";

export default function ReportActions({ id }: { id: string }) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (status: "resolved" | "dismissed") => {
    setError(null);
    startTransition(async () => {
      try {
        await setReportStatus(id, status);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act("resolved")}
          className="rounded-sm bg-oxblood px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          Resolve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("dismissed")}
          className="rounded-sm border border-gold/50 px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/70 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60"
        >
          Dismiss
        </button>
      </div>
      {error && <p className="font-sans text-xs text-oxblood">{error}</p>}
    </div>
  );
}
