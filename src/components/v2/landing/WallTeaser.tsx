"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import { pic } from "@/lib/pic";
import Icon from "../Icon";

export type TeaserPhoto = { src: string; ratio: number; stamp: string; code: string };

const TILTS = [-3.5, 2.5, -1.5, 3, -2.5, 1.5];
const DROPS = [0, 22, 8, 14, 0, 26];
const PINS = ["#c8312c", "#016ed2", "#0088cc"];
// Where each print starts before it is thrown onto the board.
const FROM = [
  { x: -260, y: -180, r: -34 },
  { x: 40, y: -320, r: 22 },
  { x: 320, y: -160, r: 38 },
  { x: -300, y: 240, r: 26 },
  { x: 20, y: 340, r: -18 },
  { x: 340, y: 220, r: -30 },
];

/**
 * The noticeboard, introduced: as the section scrolls in, six real
 * photographs fly in from the edges and land on the board, each pin dropping
 * a beat after its print. With a mouse, a print tips toward the pointer.
 */
export default function WallTeaser({ photos }: { photos: TeaserPhoto[] }) {
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!motionOK() || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".wt-word", { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.12, ease: "power4.out", scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });
      const prints = gsap.utils.toArray<HTMLElement>(".wt-print");
      const tl = gsap.timeline({ scrollTrigger: { trigger: ".wt-board", start: "top 88%", end: "top 28%", scrub: 0.8 } });
      prints.forEach((el, i) => {
        const f = FROM[i % FROM.length];
        tl.fromTo(el, { x: f.x, y: f.y, rotation: f.r, scale: 1.25, autoAlpha: 0 }, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, ease: "power3.out", duration: 1 }, i * 0.12);
        tl.fromTo(el.querySelector(".pin"), { scale: 0, y: -14 }, { scale: 1, y: 0, ease: "back.out(4)", duration: 0.35 }, i * 0.12 + 0.85);
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // A print tips toward the pointer, as if lifted by one corner.
  const tip = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse" || !motionOK()) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width - 0.5;
    const y = (e.clientY - box.top) / box.height - 0.5;
    gsap.to(e.currentTarget, { rotateY: x * 16, rotateX: -y * 16, scale: 1.04, duration: 0.3, ease: "power2.out", transformPerspective: 700 });
  };
  const settle = (e: PointerEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.6, ease: "elastic.out(1, 0.6)" });
  };

  return (
    <section ref={root} aria-labelledby="wall-teaser-title" className="board overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="label-mono text-ivory/70">The signature thing</p>
          <h2
            id="wall-teaser-title"
            aria-label="The Wall."
            className="mt-4 font-display text-[clamp(3.2rem,10vw,7rem)] font-extrabold leading-[0.82] tracking-[-0.05em] text-ivory"
          >
            {["The", "Wall."].map((w) => (
              <span key={w} className="-my-[0.12em] block overflow-hidden py-[0.12em]" aria-hidden="true">
                <span className="wt-word block will-change-transform">{w}</span>
              </span>
            ))}
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ivory/85">
            A living noticeboard of the Network: announcements, reunion photos, old fest posters
            and everything the Network posts on Instagram, pinned in one place.
          </p>
          <Link href="/noticeboard" className="btn btn-paper mt-8 h-12 px-6 text-base">
            Walk up to the wall
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <ul className="wt-board grid grid-cols-2 items-start gap-5 sm:grid-cols-3" aria-label="Recent photos from the Network">
          {photos.map((p, i) => (
            <li key={p.code} className={`wt-print will-change-transform ${i > 3 ? "hidden sm:block" : ""}`} style={{ marginTop: DROPS[i % DROPS.length] }}>
              <Link
                href="/noticeboard"
                aria-label="Open The Wall"
                onPointerMove={tip}
                onPointerLeave={settle}
                className="relative block rounded-print bg-white p-2 pb-7 shadow-[0_14px_22px_-12px_rgb(0_0_0/0.55)]"
                style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
              >
                <span className="pin" style={{ ["--pin" as string]: PINS[i % PINS.length] }} aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img {...pic(p.src, "(min-width: 640px) 16rem, 44vw")} alt={`A photo pinned to The Wall, ${p.stamp}`} loading="lazy" style={{ aspectRatio: String(p.ratio) }} className="block h-auto w-full" />
                <span className="label-mono absolute bottom-2 left-2 text-ink/70">{p.stamp}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
