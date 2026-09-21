"use client";

import { useRef, useState, useEffect } from "react";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import TiltCard from "./TiltCard";

type SpotlightAlum = {
  name: string;
  // Title/role. Optional — omitted when we only have a name for someone.
  role?: string;
  // Graduation year, e.g. "1994". Rendered as "Batch of 1994".
  batch?: string;
  // Optional headshot. Drop a real photo URL here later and it replaces the
  // initials square automatically — no code change needed. Do NOT scrape the
  // web for photos of these real, named people.
  photoUrl?: string;
};

// Real BMSCE alumni — name, role, and batch (no fabricated quotes or companies).
const ALUMNI: SpotlightAlum[] = [
  {
    name: "Sujith Somasundar",
    role: "Former India cricketer",
    batch: "1994",
    photoUrl: "/sujith-somasundar.jpg",
  },
  {
    name: "Naren",
    role: "CEO, Nandu Foods",
    batch: "1995",
    photoUrl: "/naren.jpg",
  },
  {
    name: "Sunil Rao",
    role: "MD, Roblox India",
    batch: "1996",
    photoUrl: "/sunil-rao.jpg",
  },
  {
    name: "Dinesh Gundu Rao",
    role: "Member of the Karnataka Legislative Assembly",
    batch: "1992",
    photoUrl: "/dinesh-gundu-rao.jpg",
  },
  {
    name: "Lathika Pai",
    role: "Microsoft",
    batch: "1990",
    photoUrl: "/lathika-pai.jpg",
  },
];

// Initials for the avatar square: first + last initial (e.g. "Sujith
// Somasundar" -> "SS"), or the first two letters of a single-word name.
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Left-bar accent rotates through the three brand colors (navy / red / plum)
// so the row has rhythm instead of every card looking identical.
const ACCENTS = ["border-t-oxblood", "border-t-accent", "border-t-maroon"];

export default function AlumniSpotlight() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll-snap can settle the strip a few px off zero on mount (the
    // padding/margin combo below confuses the initial snap target) — pin it
    // to a true start so the left arrow's disabled state isn't wrong before
    // the visitor has scrolled anything.
    el.scrollLeft = 0;
    updateEdges();
    const onResize = () => updateEdges();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("article")?.parentElement;
    const amount = (card?.clientWidth ?? 320) + 24; // card width + gap-6
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="border-t border-gold/30">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Reveal>
              <Eyebrow>Notable alumni</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                Alumni making their mark.
              </h2>
            </Reveal>
          </div>

          {/* Desktop scroll arrows — the strip works fine with a trackpad,
              but a discoverable click target reads more intentional than
              leaving mouse users to guess it scrolls. */}
          <div className="hidden shrink-0 gap-2 sm:flex">
            <ScrollArrow
              direction="left"
              disabled={!canScrollLeft}
              onClick={() => scrollBy(-1)}
            />
            <ScrollArrow
              direction="right"
              disabled={!canScrollRight}
              onClick={() => scrollBy(1)}
            />
          </div>
        </div>

        {/* One horizontal scroll strip at every breakpoint — all cards sit
            next to each other rather than wrapping into a grid frame. */}
        <div
          ref={trackRef}
          onScroll={updateEdges}
          className="mt-16 -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 md:-mx-10 md:px-10"
        >
          {ALUMNI.map((person, i) => (
            <Reveal
              key={person.name}
              delay={i * 80}
              className="h-full w-[78vw] shrink-0 snap-start sm:w-[340px]"
            >
              <TiltCard className="h-full">
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold/25 bg-ivory shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(20,34,64,0.5)]">
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-maroon to-oxblood">
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.photoUrl}
                        alt={person.name}
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display text-6xl italic text-ivory">
                        {initials(person.name)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex flex-1 flex-col border-t-4 ${ACCENTS[i % ACCENTS.length]} px-6 py-6`}
                  >
                    <h3 className="font-display text-2xl text-ink">
                      {person.name}
                    </h3>
                    {person.role && (
                      <p className="mt-1.5 font-sans text-sm text-ink/70">
                        {person.role}
                      </p>
                    )}
                    {person.batch && (
                      <p className="mt-1 font-sans text-sm text-ink/55">
                        Batch of {person.batch}
                      </p>
                    )}
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-oxblood transition-colors hover:border-oxblood hover:bg-oxblood hover:text-ivory disabled:pointer-events-none disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
