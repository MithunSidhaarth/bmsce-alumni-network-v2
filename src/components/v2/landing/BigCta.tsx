"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

/**
 * The closing line. Its letters start as a faint outline and fill with ink
 * as you scroll through; the button leans toward a nearby pointer.
 */
export default function BigCta({ cta }: { cta: { href: string; label: string } }) {
  const root = useRef<HTMLElement | null>(null);
  const magnet = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!motionOK() || !root.current) return;
    const ctx = gsap.context(() => {
      // The ink sweeps across once, when the section comes into view. It plays
      // through on its own, so the headline can never be left half drawn.
      gsap.fromTo(
        ".cta-fill",
        { backgroundPositionX: "100%" },
        { backgroundPositionX: "0%", duration: 0.9, ease: "power2.out", stagger: 0.22, scrollTrigger: { trigger: root.current, start: "top 82%", once: true } }
      );
    }, root);

    const el = magnet.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const move = (e: PointerEvent) => {
      if (!el) return;
      const box = el.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      const near = Math.hypot(dx, dy) < 190;
      gsap.to(el, { x: near ? dx * 0.32 : 0, y: near ? dy * 0.32 : 0, duration: near ? 0.35 : 0.8, ease: near ? "power3.out" : "elastic.out(1, 0.45)", overwrite: "auto" });
    };
    if (fine) window.addEventListener("pointermove", move, { passive: true });
    return () => {
      ctx.revert();
      window.removeEventListener("pointermove", move);
    };
  }, []);

  // Ink for the left half of the gradient, a faint outline tone for the right;
  // sliding the background reveals the ink from left to right.
  const fill =
    "cta-fill block bg-[linear-gradient(90deg,var(--color-ink)_50%,rgb(33_37_41/0.3)_50%)] bg-[length:200%_100%] bg-clip-text text-transparent motion-ok:[background-position-x:100%]";

  return (
    <section ref={root} aria-labelledby="cta-title" className="overflow-hidden border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <p className="label-mono text-tangerine">One more thing</p>
        <h2
          id="cta-title"
          aria-label="Your class is already here."
          className="mt-5 font-display text-[clamp(3rem,11vw,9.5rem)] font-extrabold leading-[0.84] tracking-[-0.05em]"
        >
          <span className={fill} aria-hidden="true">Your class</span>
          <span className={fill} aria-hidden="true">is already</span>
          <span className={`${fill} serif-accent`} aria-hidden="true">here.</span>
        </h2>
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <div ref={magnet} className="will-change-transform">
            <Link href={cta.href} className="btn h-16 px-9 text-lg">
              {cta.label}
              <Icon name="arrow" className="h-5 w-5" />
            </Link>
          </div>
          <p className="max-w-xs text-ink/70">It takes two minutes to join, and a lifetime of BMSCE to catch up on.</p>
        </div>
      </div>
    </section>
  );
}
