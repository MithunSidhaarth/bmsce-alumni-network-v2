"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Draggable, gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

export type Print = { src: string; stamp: string; code: string };

// Where each photograph rests on the desk.
const LAYOUT = [
  { left: "4%", top: "6%", width: "46%", tilt: -6, tape: true },
  { left: "47%", top: "0%", width: "44%", tilt: 5, tape: false },
  { left: "22%", top: "38%", width: "50%", tilt: 2, tape: true },
  { left: "0%", top: "58%", width: "38%", tilt: -4, tape: false },
  { left: "60%", top: "52%", width: "40%", tilt: 7, tape: false },
];

/** One line of the headline, split into letters that rise out of a mask. */
function Letters({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {[...text].map((ch, i) => (
        <span key={i} className="hero-char inline-block will-change-transform">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/**
 * The hero: the headline is set letter by letter, a highlighter is drawn
 * under one word, and five real photographs are dealt onto the desk. With a
 * mouse they can be picked up and thrown; on scroll they drift apart.
 */
export default function HeroDesk({ prints, cta }: { prints: Print[]; cta: { href: string; label: string } }) {
  const root = useRef<HTMLElement | null>(null);
  const [touched, setTouched] = useState(false);
  const [canDrag, setCanDrag] = useState(false);

  useEffect(() => {
    if (!motionOK() || !root.current) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setCanDrag(fine);

    const ctx = gsap.context(() => {
      gsap.set(".hero-pre", { visibility: "visible" });

      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .fromTo(".hero-stamp", { autoAlpha: 0, y: -18, rotate: -14 }, { autoAlpha: 1, y: 0, rotate: -2.5, duration: 0.6, ease: "back.out(2.2)" })
        .fromTo(".hero-char", { yPercent: 118, rotate: 7 }, { yPercent: 0, rotate: 0, duration: 0.95, stagger: 0.03 }, "-=0.35")
        .fromTo(".hero-hl", { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.7, ease: "power2.inOut" }, "-=0.45")
        .fromTo(".hero-fade", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, "-=0.5");

      // Deal the photographs from the bottom of the desk.
      gsap.fromTo(
        ".hero-print",
        { autoAlpha: 0, x: () => gsap.utils.random(-120, 120), y: 460, rotation: () => gsap.utils.random(-55, 55), scale: 0.7 },
        { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: 1.15, stagger: 0.13, delay: 0.3, ease: "back.out(1.1)" }
      );

      // As the page scrolls on, the prints lift away at different speeds.
      gsap.utils.toArray<HTMLElement>(".hero-drift").forEach((el, i) => {
        gsap.to(el, {
          yPercent: -(22 + i * 11),
          rotation: (i % 2 ? 1 : -1) * (4 + i * 2),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
      });

      if (fine) {
        let z = 20;
        Draggable.create(".hero-print", {
          type: "x,y",
          inertia: true,
          bounds: root.current,
          edgeResistance: 0.75,
          onPress(this: Draggable) {
            this.target.style.zIndex = String(++z);
            gsap.to(this.target, { scale: 1.07, duration: 0.2 });
          },
          onDragStart: () => setTouched(true),
          onDrag(this: Draggable) {
            // Lean into the direction of travel, like a card being slid.
            gsap.to(this.target, { rotation: gsap.utils.clamp(-14, 14, this.deltaX * 0.9), duration: 0.25, overwrite: "auto" });
          },
          onRelease(this: Draggable) {
            gsap.to(this.target, { scale: 1, rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
          },
        });
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 md:px-10 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        {/* Hidden for a moment while motion is on, so the entrance never flashes. */}
        <div className="hero-pre relative z-10 motion-ok:invisible motion-ok:[animation:hero-failsafe_0s_4s_forwards]">
          <p className="hero-stamp stamp text-forest">Est. 1946 · Basavanagudi, Bengaluru</p>
          <h1
            aria-label="Once BMS. Always BMS."
            className="mt-7 font-display text-[clamp(3.4rem,11.5vw,8.25rem)] font-extrabold leading-[0.84] tracking-[-0.045em]"
          >
            <span className="-my-[0.14em] block overflow-hidden py-[0.14em]">
              <Letters text="Once BMS." />
            </span>
            <span className="-my-[0.14em] block overflow-hidden py-[0.14em]">
              <Letters text="Always" className="hero-hl hl serif-accent bg-no-repeat pr-[0.08em] text-[0.96em] tracking-[-0.03em]" />
              <Letters text=" BMS." />
            </span>
          </h1>
          <p className="hero-fade mt-7 max-w-[34rem] text-lg leading-relaxed text-ink/75">
            The alumni network of B.M.S. College of Engineering. Find your batch, join your city
            chapter, and leave something on the wall for whoever comes next.
          </p>
          <div className="hero-fade mt-8 flex flex-wrap items-center gap-3">
            <Link href={cta.href} className="btn h-12 px-6 text-base">
              {cta.label}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/noticeboard" className="btn btn-lime h-12 px-6 text-base">
              See The Wall
            </Link>
          </div>
          <p className="hero-fade hand mt-8 -rotate-2 text-[1.55rem] text-forest/80" aria-hidden="true">
            {canDrag && !touched ? "go on, move the photos →" : "your batch is in here somewhere →"}
          </p>
        </div>

        <div className="hero-pre relative mx-auto aspect-[1/1.02] w-full max-w-[34rem] motion-ok:invisible motion-ok:[animation:hero-failsafe_0s_4s_forwards] lg:max-w-none">
          {prints.map((p, i) => {
            const l = LAYOUT[i % LAYOUT.length];
            return (
              <div key={p.code} className="hero-drift absolute" style={{ left: l.left, top: l.top, width: l.width, zIndex: i + 1 }}>
                <div className={`hero-print ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}>
                  <figure
                    className="pinned relative select-none bg-white p-[3.5%] pb-[13%] shadow-[0_22px_34px_-18px_rgb(19_26_21/0.6)]"
                    style={{ ["--tilt" as string]: `${l.tilt}deg` }}
                  >
                    {l.tape ? <span className="tape" aria-hidden="true" /> : <span className="pin" aria-hidden="true" />}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.src}
                      alt="A moment from the BMSCE alumni network"
                      draggable={false}
                      className="pointer-events-none aspect-square w-full object-cover"
                      loading={i < 2 ? "eager" : "lazy"}
                    />
                    <figcaption className="label-mono absolute bottom-[4%] left-[5%] text-ink/55">{p.stamp}</figcaption>
                  </figure>
                </div>
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
      </div>
    </section>
  );
}
