"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleRsvp } from "./actions";

export default function RsvpButton({
  eventId,
  initialGoing,
  count,
  canRsvp,
  signedIn,
}: {
  eventId: string;
  initialGoing: boolean;
  count: number;
  canRsvp: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [n, setN] = useState(count);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Logged out: point to sign-in. Signed in but unverified: gentle note.
  if (!signedIn) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-xs text-ink/50">{n} going</span>
        <Link
          href="/login?next=/events"
          className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
        >
          Sign in to RSVP
        </Link>
      </div>
    );
  }
  if (!canRsvp) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-xs text-ink/50">{n} going</span>
        <span className="font-sans text-[11px] uppercase tracking-[0.12em] text-ink/40">
          Verify to RSVP
        </span>
      </div>
    );
  }

  const click = () => {
    setError(null);
    setGoing((v) => !v);
    setN((v) => v + (going ? -1 : 1));
    startTransition(async () => {
      try {
        await toggleRsvp(eventId);
        router.refresh();
      } catch (e) {
        setGoing(initialGoing);
        setN(count);
        setError(e instanceof Error ? e.message : "Could not RSVP.");
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-sans text-xs text-ink/50">{n} going</span>
      <button
        type="button"
        onClick={click}
        disabled={busy}
        aria-pressed={going}
        className={`rounded-sm px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] transition-colors disabled:opacity-60 ${
          going
            ? "border border-oxblood text-oxblood hover:bg-oxblood/5"
            : "bg-oxblood text-ivory hover:bg-maroon"
        }`}
      >
        {going ? "Cancel RSVP" : "RSVP"}
      </button>
      {error && <span className="font-sans text-xs text-oxblood">{error}</span>}
    </div>
  );
}
