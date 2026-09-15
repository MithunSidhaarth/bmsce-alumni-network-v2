"use client";

import { useState, useTransition } from "react";
import { setCareersEnabled } from "./actions";

export default function CareersToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    const next = !on;
    setOn(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        await setCareersEnabled(next);
      } catch (e) {
        setOn(!next); // revert on failure
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h3 className="font-display text-lg text-ink">Careers section</h3>
          <p className="mt-1 max-w-md font-sans text-sm leading-relaxed text-ink/65">
            Jobs, internships and mentorship. Off for now until there are mentors
            signed up — flip it on and it appears in the nav, homepage and routes
            immediately, for everyone.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Toggle Careers section"
          disabled={busy}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            on ? "bg-oxblood" : "bg-ink/20"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-ivory transition-all ${
              on ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
      <p className="mt-3 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        Careers is currently{" "}
        <span className={on ? "text-oxblood" : "text-ink/60"}>
          {on ? "ON" : "OFF"}
        </span>
      </p>
      {error && <p className="mt-2 font-sans text-sm text-oxblood">{error}</p>}
    </div>
  );
}
