"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "profile_completion_nudge_dismissed_v1";

/**
 * Non-blocking, dismissible banner nudging existing members to fill in the
 * newer profile fields (industry / role). `show` is computed server-side;
 * dismissal is remembered in localStorage so it doesn't nag.
 */
export default function ProfileCompletionNudge({ show }: { show: boolean }) {
  // Start hidden to avoid a flash; reveal after we've checked localStorage.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!show || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-8 flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-sans text-sm leading-relaxed text-ink/80">
        Complete your profile — add your <strong>industry</strong> and{" "}
        <strong>role</strong> so others can find you in the directory.
      </p>
      <div className="flex shrink-0 items-center gap-4">
        <Link
          href="/profile/edit"
          className="rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
        >
          Complete profile
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45 transition-colors hover:text-ink/70"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
