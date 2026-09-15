"use client";

import { useEffect, useState } from "react";

// Full-screen splash shown once per hard page load (mounted in the root
// layout, outside PageTransition, so client-side navigation never
// re-triggers it). Ivory/brass, not the house oxblood — a full dark screen
// read as a nightclub splash rather than a college one; the official
// gear-and-bridge college crest (public/bmsce-crest.png, background
// already removed) is what actually says "university," more than any
// drawn substitute.
export default function SitePreloader() {
  const [stage, setStage] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    const outTimer = window.setTimeout(() => setStage("out"), 1650);
    const doneTimer = window.setTimeout(() => setStage("done"), 2250);
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
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-ivory ${
        stage === "out" ? "preloader-out" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(184,147,63,0.1)_0%,transparent_65%)]" />
        <div className="absolute inset-0 border-[10px] border-brass/10" />
      </div>

      {/* Crest settles in, then a thin brass ring keeps turning around it
          for as long as the page is actually loading — a seal spinning
          into place, not a generic spinner bolted on top of a logo. */}
      <div className="relative flex h-[196px] w-[196px] items-center justify-center animate-[seal-settle_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
        <svg
          viewBox="0 0 196 196"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full motion-safe:animate-spin"
          style={{ animationDuration: "3.6s" }}
        >
          <circle
            cx="98"
            cy="98"
            r="92"
            fill="none"
            stroke="var(--color-brass)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="8 14"
            opacity="0.55"
          />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bmsce-crest.png"
          alt="B.M.S. College of Engineering"
          width={160}
          height={160}
          fetchPriority="high"
          className="relative h-[160px] w-[160px] object-contain drop-shadow-[0_8px_20px_rgba(47,37,68,0.18)]"
        />
      </div>

      <p
        className="relative mt-5 font-sans text-[11px] font-medium uppercase text-oxblood/70 opacity-0 animate-[seal-fade_0.6s_ease-out_1.1s_forwards]"
        style={{ letterSpacing: "0.32em" }}
      >
        Alumni Network
      </p>

      <div className="relative mt-7 h-[2px] w-40 overflow-hidden rounded-full bg-brass/15">
        <div className="h-full w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-brass to-brass-light animate-[seal-progress_1.1s_cubic-bezier(0.65,0,0.35,1)_0.4s_forwards]" />
      </div>
    </div>
  );
}
