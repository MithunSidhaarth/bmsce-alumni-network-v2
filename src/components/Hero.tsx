"use client";

import { useRef } from "react";
import Eyebrow from "./Eyebrow";
import Seal from "./Seal";
import Reveal from "./Reveal";
import Aurora from "./Aurora";
import Marquee from "./Marquee";
import MagneticButton from "./MagneticButton";
import { chapters } from "@/data/chapters";

// A handful of recognizable chapter cities for the hero ticker — not the
// full 31 (that's what the Chapters page is for), just enough to say
// "we're everywhere" at a glance.
const TICKER_CITIES = [
  "Bengaluru",
  "San Francisco",
  "New York",
  "London",
  "Dubai",
  "Singapore",
  "Toronto",
  "Sydney",
].filter((c) => chapters.some((ch) => ch.name === c || ch.name.includes(c)));

export default function Hero() {
  const sealRef = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = sealRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `translate(${px * -24}px, ${py * -24}px)`;
  };

  const resetSeal = () => {
    const el = sealRef.current;
    if (el) el.style.transform = "translate(0, 0)";
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={resetSeal}
    >
      <Aurora />

      <div
        ref={sealRef}
        className="pointer-events-none absolute -right-24 top-8 hidden h-[420px] w-[420px] opacity-[0.06] transition-transform duration-300 ease-out lg:block"
      >
        <Seal
          ringColor="var(--color-oxblood)"
          textColor="var(--color-oxblood)"
          monogramColor="var(--color-oxblood)"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
        <Reveal>
          <Eyebrow>Est. 1946 · Bengaluru</Eyebrow>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-8 max-w-4xl font-display text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.98] tracking-tight text-ink">
            Once BMS.
            <br />
            <span className="bg-gradient-to-r from-oxblood via-maroon to-accent bg-clip-text italic text-transparent">
              Always BMS.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 max-w-md font-sans text-base leading-relaxed text-ink/70 md:text-lg">
            Wherever your degree took you, this is where the network finds
            you back.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory shadow-[0_8px_24px_-8px_rgba(47,37,68,0.5)] transition-colors hover:bg-maroon"
              >
                Join the network
              </a>
            </MagneticButton>
            <MagneticButton>
              <a
                href="/chapters"
                className="group inline-flex items-center gap-2.5 rounded-sm border border-oxblood/30 px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-oxblood transition-colors hover:border-oxblood"
              >
                Explore chapters
                <span
                  aria-hidden="true"
                  className="h-px w-5 bg-oxblood transition-all duration-300 group-hover:w-9"
                />
              </a>
            </MagneticButton>
          </div>
        </Reveal>
      </div>

      {/* Ticker — a quiet flex before the hard stats land in the next
          section, reinforcing "worldwide" as something you scroll past, not
          just a number you're told. */}
      <Reveal delay={320}>
        <div className="relative border-y border-gold/25 bg-ivory-dim/40 py-4 text-ink/50">
          <Marquee items={TICKER_CITIES} />
        </div>
      </Reveal>
    </section>
  );
}
