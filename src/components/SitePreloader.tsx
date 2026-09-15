"use client";

import { useEffect, useState } from "react";

// Full-screen splash shown once per hard page load (mounted in the root
// layout, outside PageTransition, so client-side navigation never re-triggers
// it). Reads as an official seal being stamped in — concentric rings drawing
// themselves in, then the institution's monogram and founding year settling
// into place — rather than a generic spinner, on the theory that the first
// thing a visitor sees should look like it belongs to a 1946 engineering
// college, not a SaaS product.
export default function SitePreloader() {
  const [stage, setStage] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    const outTimer = window.setTimeout(() => setStage("out"), 1450);
    const doneTimer = window.setTimeout(() => setStage("done"), 2050);
    return () => {
      window.clearTimeout(outTimer);
      window.clearTimeout(doneTimer);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  useEffect(() => {
    if (stage === "out" && typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }, [stage]);

  if (stage === "done") return null;

  return (
    <div
      role="status"
      aria-label="BMSCE Alumni Network is loading"
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-oxblood ${
        stage === "out" ? "preloader-out" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(213,50,43,0.16)_0%,transparent_60%)]" />
      </div>

      <svg
        viewBox="0 0 160 160"
        width={132}
        height={132}
        className="relative animate-[seal-settle_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
      >
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1"
          strokeDasharray="440"
          strokeDashoffset="440"
          className="animate-[seal-draw_1.1s_cubic-bezier(0.65,0,0.35,1)_0.05s_forwards]"
        />
        <circle
          cx="80"
          cy="80"
          r="58"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="0.75"
          strokeDasharray="365"
          strokeDashoffset="365"
          opacity="0.7"
          className="animate-[seal-draw-reverse_1s_cubic-bezier(0.65,0,0.35,1)_0.25s_forwards]"
        />
        <text
          x="80"
          y="72"
          textAnchor="middle"
          className="fill-ivory font-display text-[34px] italic opacity-0 animate-[seal-fade_0.6s_ease-out_0.7s_forwards]"
        >
          BMS
        </text>
        <line
          x1="58"
          y1="86"
          x2="102"
          y2="86"
          stroke="var(--color-gold)"
          strokeWidth="0.75"
          opacity="0"
          className="animate-[seal-fade_0.5s_ease-out_0.9s_forwards]"
        />
        <text
          x="80"
          y="100"
          textAnchor="middle"
          className="fill-gold font-sans text-[8px] font-medium opacity-0 animate-[seal-fade_0.5s_ease-out_1s_forwards]"
          style={{ letterSpacing: "0.22em" }}
        >
          EST. 1946
        </text>
      </svg>

      <p
        className="relative mt-7 font-sans text-[11px] font-medium uppercase text-ivory/80 opacity-0 animate-[seal-fade_0.6s_ease-out_1.05s_forwards]"
        style={{ letterSpacing: "0.32em" }}
      >
        Alumni Network
      </p>

      <div className="relative mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-ivory/15">
        <div className="h-full w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-accent to-gold animate-[seal-progress_1.1s_cubic-bezier(0.65,0,0.35,1)_0.35s_forwards]" />
      </div>
    </div>
  );
}
