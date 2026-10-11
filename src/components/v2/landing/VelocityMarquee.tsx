"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";

/**
 * The chapter ticker. It drifts on its own, and it listens to the page: scroll
 * faster and it speeds up and leans, change direction and it turns around.
 * Without motion it is a still row of names.
 */
export default function VelocityMarquee({ items }: { items: string[] }) {
  const track = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || !motionOK()) return;
    const setX = gsap.quickSetter(el, "x", "px");
    const setSkew = gsap.quickSetter(el, "skewX", "deg");
    let x = 0;
    let dir = -1;
    let skew = 0;
    const watcher = ScrollTrigger.create({
      onUpdate: (self) => {
        dir = self.direction === 1 ? -1 : 1;
      },
    });
    const tick = (_time: number, delta: number) => {
      const half = el.scrollWidth / 2;
      if (!half) return;
      const velocity = Math.min(Math.abs(watcher.getVelocity()), 5000);
      x += (0.05 + velocity / 700) * delta * dir;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      skew += (gsap.utils.clamp(-9, 9, (velocity / 260) * -dir) - skew) * 0.12;
      setX(x);
      setSkew(skew);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      watcher.kill();
    };
  }, []);

  return (
    <div className="overflow-hidden border-y-[1.5px] sig border-brand-ink bg-brand-ink py-3.5 text-ivory">
      <div ref={track} className="flex w-max will-change-transform" aria-hidden="true">
        {[0, 1].map((n) => (
          <ul key={n} className="flex shrink-0 items-center">
            {items.map((c) => (
              <li key={c} className="flex items-center font-display text-[1.35rem] font-bold uppercase tracking-wide">
                <span className="px-6">{c}</span>
                <span className="text-tangerine">✳</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="sr-only">Chapters in {items.join(", ")}.</p>
    </div>
  );
}
