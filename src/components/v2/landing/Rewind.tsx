"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

export type RewindPhoto = { src: string; ratio: number; stamp: string; code: string };
export type RewindYear = { year: number; count: number; photos: RewindPhoto[] };

const TILTS = [-5, 3, -2, 6, -4, 2];
const DROPS = ["-6vh", "9vh", "-11vh", "6vh", "-3vh", "12vh"];
const DEPTHS = [0.35, 1, 0.6, 1.25, 0.2, 0.85];

/**
 * "Rewind": the page stops scrolling down and travels sideways through the
 * years instead, newest first. Photographs pass at different speeds, the way
 * near and far things do from a train window. On phones, and with motion off,
 * it is an ordinary strip you swipe through.
 */
export default function Rewind({ years, total }: { years: RewindYear[]; total: number }) {
  const root = useRef<HTMLElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);

  // Step 1: decide whether this screen gets the pinned, sideways version.
  useEffect(() => {
    if (!motionOK()) return;
    const wide = window.matchMedia("(min-width: 900px) and (min-height: 560px)");
    const update = () => setPinned(wide.matches);
    update();
    wide.addEventListener("change", update);
    return () => wide.removeEventListener("change", update);
  }, []);

  // Step 2: once the layout has switched to its pinned form, wire it to scroll.
  useEffect(() => {
    if (!pinned || !root.current || !track.current) return;
    const ctx = gsap.context(() => {
      const t = track.current!;
      const distance = () => Math.max(0, t.scrollWidth - window.innerWidth);
      // Sideways travel is quicker than the scroll that drives it, so the
      // section never outstays its welcome.
      const scroll = () => distance() * 0.5;
      const travel = gsap.to(t, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${scroll()}`,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
        const d = Number(el.dataset.depth);
        gsap.fromTo(
          el,
          { x: 90 * d },
          { x: -90 * d, ease: "none", scrollTrigger: { trigger: el, containerAnimation: travel, start: "left right", end: "right left", scrub: true } }
        );
      });
      gsap.utils.toArray<HTMLElement>(".rw-year").forEach((el) => {
        gsap.fromTo(
          el,
          { xPercent: 22 },
          { xPercent: -22, ease: "none", scrollTrigger: { trigger: el, containerAnimation: travel, start: "left right", end: "right left", scrub: true } }
        );
      });
      gsap.to(".rw-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${scroll()}`, scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, [pinned]);

  return (
    <section
      ref={root}
      aria-labelledby="rewind-title"
      className={`relative bg-ink text-ivory ${pinned ? "h-dvh overflow-hidden" : "overflow-x-auto py-16 no-scrollbar"}`}
    >
      <div ref={track} className={`flex w-max items-stretch ${pinned ? "h-full will-change-transform" : "snap-x"}`}>
        {/* Title panel */}
        <div className="flex w-[88vw] shrink-0 snap-start flex-col justify-center px-5 md:w-[62vw] md:px-16">
          <p className="label-mono text-tangerine">Rewind</p>
          <h2 id="rewind-title" className="mt-4 font-display text-[clamp(3rem,9vw,7.5rem)] font-extrabold leading-[0.84] tracking-[-0.045em]">
            Keep scrolling.
            <br />
            <span className="serif-accent text-[0.92em] text-ivory/70">We are going back.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg text-ivory/70">
            {total} moments from the alumni association&rsquo;s own photographs, year by year.
            {pinned ? "" : " Swipe sideways."}
          </p>
          <Icon name="arrow" className="mt-8 h-10 w-10 text-tangerine" />
        </div>

        {years.map((y) => (
          <div key={y.year} className="relative flex shrink-0 snap-start items-center gap-7 px-6 md:gap-10 md:px-14">
            {/* The year, as a huge outline behind its photographs. */}
            <p
              aria-hidden="true"
              className="rw-year pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 select-none font-display text-[46vh] font-extrabold leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_rgb(244_238_221/0.2)] md:text-[62vh]"
            >
              {y.year}
            </p>
            <div className="relative w-40 shrink-0 md:w-56">
              <h3 className="font-display text-6xl font-extrabold leading-none md:text-8xl">{y.year}</h3>
              <p className="label-mono mt-3 text-ivory/60">{y.count} moments pinned</p>
            </div>
            {y.photos.map((p, i) => (
              <div key={p.code} data-depth={DEPTHS[i % DEPTHS.length]} className="relative shrink-0" style={{ top: DROPS[i % DROPS.length] }}>
                <Link
                  href="/noticeboard"
                  aria-label={`A moment from ${y.year}. Open The Wall.`}
                  className="pinned block w-[52vw] max-w-[17rem] bg-white p-2.5 pb-9 shadow-[0_26px_40px_-18px_rgb(0_0_0/0.8)] md:w-[19vw] md:max-w-[19rem]"
                  style={{ ["--tilt" as string]: `${TILTS[i % TILTS.length]}deg` }}
                >
                  <span className="tape" aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" loading="lazy" decoding="async" style={{ aspectRatio: String(p.ratio) }} className="block h-auto w-full" />
                  <span className="label-mono absolute bottom-2.5 left-3 text-ink/60">{p.stamp}</span>
                </Link>
              </div>
            ))}
          </div>
        ))}

        {/* End panel */}
        <div className="flex w-[88vw] shrink-0 snap-start flex-col justify-center px-5 md:w-[54vw] md:px-16">
          <p className="hand text-[2.2rem] leading-none text-tangerine">and that is only the start</p>
          <h3 className="mt-4 font-display text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
            Every one of these is pinned to The Wall.
          </h3>
          <Link href="/noticeboard" className="btn btn-paper mt-8 h-12 self-start px-6 text-base">
            Walk up to the wall <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {pinned && (
        <div className="absolute inset-x-6 bottom-6 h-[3px] bg-ivory/15 md:inset-x-16" aria-hidden="true">
          <div className="rw-progress h-full origin-left scale-x-0 bg-tangerine" />
        </div>
      )}
    </section>
  );
}
