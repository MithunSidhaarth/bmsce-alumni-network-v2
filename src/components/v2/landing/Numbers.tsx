"use client";

import { useEffect, useRef, useState } from "react";
import { motionOK } from "@/lib/motion";

export type Figure = { value: number; label: string; note: string };

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOK() || !("IntersectionObserver" in window)) return;
    setShown(0);
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1400;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // Ease out: fast at first, settling on the real number.
          setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

/** Three real numbers about the network, counted up as they come into view. */
export default function Numbers({ figures }: { figures: Figure[] }) {
  return (
    <section aria-label="The Network in numbers" className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-24">
      {/* Phones: one figure per row, the number on the left and its words beside
          it. Wider screens: three columns. */}
      <dl className="grid gap-y-7 sm:grid-cols-3 sm:gap-y-10 sm:divide-x sm:divide-ink/20">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`grid grid-cols-[minmax(7.25rem,auto)_1fr] items-center gap-x-5 border-b border-ink/15 pb-7 last:border-b-0 last:pb-0 sm:flex sm:flex-col sm:items-stretch sm:border-b-0 sm:pb-0 ${
              i ? "sm:pl-10" : ""
            }`}
          >
            <dd className="row-span-2 font-display text-[clamp(4.5rem,25vw,7rem)] font-extrabold leading-[0.82] tracking-[-0.05em] sm:order-1 sm:text-[clamp(4.5rem,13vw,10rem)]">
              <Counter value={f.value} />
            </dd>
            <dt className="self-end font-display text-2xl font-bold leading-tight sm:order-2 sm:mt-3 sm:self-auto">{f.label}</dt>
            <p className="mt-1 self-start text-sm text-ink/70 sm:order-3 sm:max-w-[22ch] sm:self-auto">{f.note}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
