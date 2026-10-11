"use client";

import { useEffect, useState } from "react";
import { motionOK, setMotion } from "@/lib/motion";

/**
 * The site's own motion switch. By default the site follows the device's
 * "reduce motion" setting; this lets a visitor turn animation on or off for
 * this site specifically. The choice is remembered for a year.
 */
export default function MotionToggle({ className = "", label = true }: { className?: string; label?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(motionOK()), []);

  return (
    <button
      type="button"
      aria-pressed={on ?? false}
      onClick={() => {
        setMotion(on ? "calm" : "full");
        // Scroll-driven sections are set up once on load, so start fresh.
        window.location.reload();
      }}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${on ? "bg-current" : "border border-current"}`} />
      {label && <>Motion {on === null ? "" : on ? "on" : "off"}</>}
    </button>
  );
}
