"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleRsvp } from "./actions";
import { said } from "@/lib/fail";

const TABS = 8;

/**
 * RSVP as the strip of tear-off tabs at the bottom of a noticeboard poster.
 * Tearing a tab off says "I am going"; every tab already missing is someone
 * who got there first. The count beside it is the real number of RSVPs.
 */
export default function TearOffRsvp({
  eventId,
  initialGoing,
  count,
  canRsvp,
  signedIn,
  label,
}: {
  eventId: string;
  initialGoing: boolean;
  count: number;
  canRsvp: boolean;
  signedIn: boolean;
  /** Written down each tab, e.g. the date. */
  label: string;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [n, setN] = useState(count);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Missing tabs stand for people going. One always stays for the next person.
  const torn = Math.min(n, going ? TABS : TABS - 1);

  const commit = (next: boolean) => {
    setError(null);
    setGoing(next);
    setN((v) => Math.max(0, v + (next ? 1 : -1)));
    start(async () => {
      try {
        await toggleRsvp(eventId);
        router.refresh();
      } catch (e) {
        setGoing(initialGoing);
        setN(count);
        setError(said(e) ?? "That RSVP did not go through.");
      }
    });
  };

  const tear = (el: HTMLButtonElement) => {
    if (busy) return;
    // The tab rips away and falls, then the RSVP is recorded.
    const fall = el.animate?.(
      [
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: `translateY(18px) rotate(${Math.random() > 0.5 ? 9 : -9}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translateY(120px) rotate(${Math.random() > 0.5 ? 38 : -38}deg)`, opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(0.5, 0, 0.9, 0.5)" }
    );
    if (fall) fall.finished.then(() => commit(true)).catch(() => commit(true));
    else commit(true);
  };

  return (
    <div>
      <p className="flex flex-wrap items-center justify-between gap-2 px-5 text-xs text-ink/70">
        <span className="font-mono">
          {n} going{going ? " · you are in" : ""}
        </span>
        {going && (
          <button type="button" onClick={() => commit(false)} disabled={busy} className="font-semibold underline underline-offset-2 hover:text-ink">
            Put my tab back
          </button>
        )}
        {!signedIn && (
          <Link href="/login?next=/events" className="font-semibold text-forest underline underline-offset-2">
            Sign in to take a tab
          </Link>
        )}
        {signedIn && !canRsvp && <span>Verified members can take a tab</span>}
      </p>

      <div role="group" aria-label="RSVP" className="mt-2 flex h-[4.5rem] overflow-hidden border-t-2 border-dashed border-ink/30">
        {Array.from({ length: TABS }, (_, i) => {
          // Tabs go missing from the right-hand end first.
          const gone = i >= TABS - torn;
          // A torn-off tab leaves a gap you can see the desk through.
          if (gone) return <span key={i} aria-hidden="true" className="flex-1 bg-ivory shadow-[inset_0_7px_6px_-5px_rgb(33_37_41/0.4)]" />;
          const face = (
            <span className="rotate-180 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] [writing-mode:vertical-rl]">{label}</span>
          );
          const shape = "flex flex-1 items-center justify-center border-l border-dashed border-ink/25 bg-paper text-ink/75 first:border-l-0";
          return canRsvp && !going ? (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={(e) => tear(e.currentTarget)}
              aria-label="Tear off a tab: I am going"
              className={`${shape} origin-top cursor-pointer transition-colors hover:bg-lime hover:text-ink`}
            >
              {face}
            </button>
          ) : (
            <span key={i} aria-hidden="true" className={shape}>
              {face}
            </span>
          );
        })}
      </div>
      {canRsvp && !going && <p className="hand px-5 pt-1.5 text-[1.15rem] leading-none text-forest">tear a tab off to say you are coming</p>}
      {error && (
        <p role="alert" className="px-5 pt-1.5 text-xs text-pin">
          {error}
        </p>
      )}
    </div>
  );
}
