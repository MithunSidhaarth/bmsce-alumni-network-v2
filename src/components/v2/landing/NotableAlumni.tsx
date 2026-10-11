"use client";

import { useEffect, useRef, useState } from "react";
import { notableAlumni } from "@/data/notableAlumni";
import { gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

const TILTS = [-2.4, 1.8, -1.2, 2.6, -1.9];

/**
 * Notable alumni as a row of photo prints you slide through: swipe on a
 * phone, use the arrows (or a trackpad) on a desktop. The prints are dealt in
 * from the right the first time the row comes into view.
 */
export default function NotableAlumni({ heading = "h2" }: { heading?: "h1" | "h2" }) {
  const root = useRef<HTMLElement | null>(null);
  const track = useRef<HTMLUListElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: true });
  const Title = heading;

  const measure = () => {
    const el = track.current;
    if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 });
  };

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    if (!motionOK() || !root.current) return () => window.removeEventListener("resize", measure);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".na-card",
        { x: 220, autoAlpha: 0, rotate: 9 },
        { x: 0, autoAlpha: 1, rotate: 0, duration: 0.85, stagger: 0.09, ease: "power3.out", scrollTrigger: { trigger: track.current, start: "top 82%", once: true } }
      );
    }, root);
    return () => {
      window.removeEventListener("resize", measure);
      ctx.revert();
    };
  }, []);

  const slide = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>("li");
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 28), behavior: "smooth" });
  };

  return (
    <section ref={root} aria-labelledby="notable-title" className="overflow-hidden border-t border-ink/10 py-20 md:py-28">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 px-5 md:px-10">
        <div>
          <p className="label-mono text-tangerine">Notable alumni</p>
          <Title id="notable-title" className="mt-4 max-w-xl font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.95]">
            Alumni making <span className="serif-accent hl">their mark</span>.
          </Title>
        </div>
        <div className="flex items-center gap-2">
          <p className="hand mr-2 text-[1.5rem] text-forest sm:hidden" aria-hidden="true">
            swipe ←
          </p>
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => slide(dir)}
              disabled={dir === -1 ? !edges.left : !edges.right}
              aria-label={dir === -1 ? "Previous alumni" : "More alumni"}
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-ink/25 transition-colors hover:border-ink hover:bg-ink hover:text-ivory disabled:pointer-events-none disabled:opacity-30 sm:flex"
            >
              <Icon name={dir === -1 ? "back" : "arrow"} />
            </button>
          ))}
        </div>
      </div>

      <ul
        ref={track}
        onScroll={measure}
        className="mt-10 flex snap-x snap-mandatory gap-7 overflow-x-auto px-5 pb-8 pt-6 no-scrollbar md:px-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]"
      >
        {notableAlumni.map((person, i) => (
          <li key={person.name} className="w-[74vw] max-w-[19rem] shrink-0 snap-center sm:w-[19rem] sm:snap-start">
            <figure
              className="na-card pinned relative rounded-print bg-white p-3 pb-5 shadow-[0_22px_38px_-18px_rgb(19_26_21/0.55)]"
              style={{ ["--tilt" as string]: `${TILTS[i % TILTS.length]}deg` }}
            >
              <span className={`tape ${i % 2 ? "tape-lime" : ""}`} aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={person.photo} alt={person.name} loading="lazy" draggable={false} className="aspect-[4/5] w-full object-cover object-top" />
              <figcaption className="px-1 pt-4">
                <span className="hand block text-[2rem] leading-none text-ink">{person.name}</span>
                <span className="mt-2 block text-sm leading-snug text-ink/70">{person.role}</span>
                <span className="stamp mt-3 text-forest">Batch of {person.batch}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
