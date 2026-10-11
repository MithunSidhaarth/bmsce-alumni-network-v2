"use client";

import { useEffect, useRef } from "react";

export type CollagePhoto = { src: string; stamp: string; code: string };

// Where each photograph sits on the desk: position, size, tilt and how far
// it drifts when the pointer moves (deeper = further, for a sense of depth).
const LAYOUT = [
  { left: "4%", top: "6%", width: "46%", tilt: -6, depth: 14, tape: true },
  { left: "47%", top: "0%", width: "44%", tilt: 5, depth: 26, tape: false },
  { left: "22%", top: "38%", width: "50%", tilt: 2, depth: 38, tape: true },
  { left: "0%", top: "58%", width: "38%", tilt: -4, depth: 20, tape: false },
  { left: "60%", top: "52%", width: "40%", tilt: 7, depth: 30, tape: false },
];

/**
 * The hero collage: five real photographs scattered like prints on a desk.
 * They drop in once, then shift slightly with the pointer. With reduced
 * motion, or on touch, they simply sit still.
 */
export default function Collage({ photos }: { photos: CollagePhoto[] }) {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={root}
      className="relative mx-auto aspect-[1/1.02] w-full max-w-[34rem] lg:max-w-none"
      style={{ ["--px" as string]: 0, ["--py" as string]: 0 }}
    >
      {photos.map((p, i) => {
        const l = LAYOUT[i % LAYOUT.length];
        return (
          <div
            key={p.code}
            className="absolute transition-transform duration-500 ease-out"
            style={{
              left: l.left,
              top: l.top,
              width: l.width,
              zIndex: i + 1,
              transform: `translate3d(calc(var(--px) * ${-l.depth}px), calc(var(--py) * ${-l.depth}px), 0)`,
            }}
          >
            <figure
              className="pinned relative bg-white p-[3.5%] pb-[13%] shadow-[0_22px_34px_-18px_rgb(19_26_21/0.6)] motion-safe:animate-[var(--animate-pin-drop)]"
              style={{ ["--tilt" as string]: `${l.tilt}deg`, animationDelay: `${120 + i * 110}ms` }}
            >
              {l.tape ? <span className="tape" aria-hidden="true" /> : <span className="pin" aria-hidden="true" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt="A moment from the BMSCE alumni network"
                className="aspect-square w-full object-cover"
                loading={i < 2 ? "eager" : "lazy"}
              />
              <figcaption className="label-mono absolute bottom-[4%] left-[5%] text-ink/55">{p.stamp}</figcaption>
            </figure>
          </div>
        );
      })}
      <span
        className="stickynote absolute bottom-[2%] right-[4%] z-10 hidden rotate-6 px-4 py-3 sm:block"
        style={{ ["--note" as string]: "#ffd9c7" }}
        aria-hidden="true"
      >
        <span className="hand block text-[1.4rem] leading-none">since 1946</span>
      </span>
    </div>
  );
}
