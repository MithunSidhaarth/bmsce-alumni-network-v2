"use client";

import { useEffect, useRef, useState } from "react";
import { Draggable, gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";

const NOTE = ["#fcf9f0", "#e3f5ab", "#ffd9c7", "#e2dbff"];

/**
 * The fun facts as a deck of index cards you drag sideways and flick. On
 * touch screens, and with motion off, it is a normal swipeable row.
 */
export default function FactsDeck({ facts }: { facts: string[] }) {
  const frame = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLOListElement | null>(null);
  const [grab, setGrab] = useState(false);

  useEffect(() => {
    const f = frame.current;
    const t = track.current;
    if (!f || !t || !motionOK()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setGrab(true);
    const min = () => Math.min(0, f.clientWidth - t.scrollWidth);
    let onResize = () => {};
    const ctx = gsap.context(() => {
      const [drag] = Draggable.create(t, {
        type: "x",
        inertia: true,
        edgeResistance: 0.8,
        bounds: { minX: min(), maxX: 0 },
        onDrag(this: Draggable) {
          gsap.to(".fact-card", { rotate: gsap.utils.clamp(-5, 5, this.deltaX * 0.4), duration: 0.3, overwrite: "auto" });
        },
        onThrowComplete: () => gsap.to(".fact-card", { rotate: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" }),
        onRelease: () => gsap.to(".fact-card", { rotate: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" }),
      });
      onResize = () => drag.applyBounds({ minX: min(), maxX: 0 });
      // The cards are dealt in from the right the first time they are seen.
      gsap.fromTo(".fact-card", { x: 240, autoAlpha: 0, rotate: 8 }, { x: 0, autoAlpha: 1, rotate: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: f, start: "top 80%", once: true } });
    }, f);
    const resize = () => onResize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      ctx.revert();
      setGrab(false);
    };
  }, []);

  return (
    <section aria-labelledby="facts-title" className="overflow-hidden py-20 md:py-28">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-5 md:px-10">
        <div>
          <p className="label-mono text-tangerine">Did you know</p>
          <h2 id="facts-title" className="mt-4 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.95]">
            Ten things about <span className="serif-accent hl">BMS</span>.
          </h2>
        </div>
        <p className="hand text-[1.6rem] text-forest/80" aria-hidden="true">
          {grab ? "drag the cards ←" : "swipe ←"}
        </p>
      </div>
      <div ref={frame} className={`mt-10 ${grab ? "overflow-hidden" : "overflow-x-auto no-scrollbar"}`}>
        <ol
          ref={track}
          className={`flex w-max gap-5 px-5 pb-6 pt-3 md:px-10 ${grab ? "cursor-grab active:cursor-grabbing" : "snap-x"}`}
        >
          {facts.map((fact, i) => (
            <li
              key={i}
              className="fact-card relative flex w-[78vw] max-w-[21rem] shrink-0 snap-start select-none flex-col border border-ink/12 px-6 pb-7 pt-8 shadow-[var(--shadow-sheet)]"
              style={{ background: NOTE[i % NOTE.length] }}
            >
              <span className="absolute left-0 right-0 top-0 h-2 bg-ink/[0.07]" aria-hidden="true" />
              <span className="font-display text-6xl font-extrabold leading-none tracking-tight text-ink/85">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-ink/85">{fact}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
