"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

export type Print = { src: string; stamp: string; code: string };

const STEP = 40; // degrees between neighbouring photographs on the spiral

/**
 * A headline line split into letters that rise out of a mask. Letters are
 * grouped by word, and a word never breaks across lines.
 */
function Letters({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {text.split(" ").map((word, w, all) => (
        <span key={w} className="inline-block whitespace-nowrap">
          {[...word].map((ch, i) => (
            <span key={i} className="hero-char inline-block will-change-transform">
              {ch}
            </span>
          ))}
          {w < all.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * The hero. The headline is set letter by letter and a highlighter is drawn
 * under one word. Beside it, real photographs hang on a spiral in 3D space:
 * they fly in from the distance, turn slowly, lean toward the pointer, and
 * can be grabbed and spun. Everything is CSS 3D transforms (no WebGL), so it
 * stays light on ordinary laptops and phones.
 */
export default function HeroDesk({ prints, cta }: { prints: Print[]; cta: { href: string; label: string } }) {
  const root = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const ring = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);
  const [spun, setSpun] = useState(false);
  const dragged = useRef(false);

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const rg = ring.current;
    if (!el || !st || !rg || !motionOK()) return;
    setLive(true);

    const cards = Array.from(rg.querySelectorAll<HTMLElement>(".ring-card"));
    const state = { angle: -18, velocity: 0, tilt: -9, tiltTo: -9, dragging: false, lastX: 0, moved: 0, started: false };
    const sizeRing = () => rg.style.setProperty("--r", `${Math.round(Math.min(st.clientWidth * 0.6, st.clientHeight * 0.95))}px`);
    sizeRing();
    window.addEventListener("resize", sizeRing);

    const ctx = gsap.context(() => {
      gsap.set(".hero-pre", { visibility: "visible" });
      gsap.set(".hero-char", { yPercent: 118, rotate: 7 });
      gsap.set(".hero-hl", { backgroundSize: "0% 100%" });
      gsap.set([".hero-stamp", ".hero-fade"], { autoAlpha: 0 });
      gsap.set(cards, { "--pop": "1500px", autoAlpha: 0 });

      // The entrance waits until the hero is really on screen, so it is never
      // spent while the page sits in a background tab.
      const intro = gsap
        .timeline({ paused: true, defaults: { ease: "power4.out" } })
        .to(".hero-stamp", { autoAlpha: 1, duration: 0.5 })
        .to(".hero-char", { yPercent: 0, rotate: 0, duration: 0.95, stagger: 0.03 }, "-=0.3")
        .to(".hero-hl", { backgroundSize: "100% 100%", duration: 0.7, ease: "power2.inOut" }, "-=0.45")
        .to(".hero-fade", { autoAlpha: 1, duration: 0.7, stagger: 0.1 }, "-=0.5")
        .to(cards, { "--pop": "0px", autoAlpha: 1, duration: 1.3, stagger: 0.09, ease: "expo.out" }, 0.15)
        .add(() => {
          state.started = true;
        }, 0.2);
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          intro.play();
        },
        { threshold: 0.25 }
      );
      io.observe(el);

      // Scrolling on: the spiral sinks back and the page takes over.
      gsap.to(st, { yPercent: 14, scale: 0.86, autoAlpha: 0.35, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.5 } });
      const watcher = ScrollTrigger.create({});

      const tick = (_t: number, delta: number) => {
        if (!state.started) return;
        const dt = Math.min(delta, 50);
        if (!state.dragging) {
          const scrollPush = gsap.utils.clamp(-0.5, 0.5, watcher.getVelocity() / 9000);
          state.angle += (0.0075 + scrollPush) * dt + state.velocity;
          state.velocity *= 0.94;
        }
        state.tilt += (state.tiltTo - state.tilt) * 0.08;
        rg.style.setProperty("--angle", `${state.angle.toFixed(2)}deg`);
        rg.style.setProperty("--tilt", `${state.tilt.toFixed(2)}deg`);
        // Light the photographs from the front: the more a card faces away,
        // the darker it gets, which is what makes the turn read as depth.
        cards.forEach((card, i) => {
          const facing = Math.cos(((state.angle + i * STEP) * Math.PI) / 180);
          card.style.filter = `brightness(${(0.5 + 0.5 * Math.max(0, facing)).toFixed(2)})`;
        });
      };
      gsap.ticker.add(tick);

      const down = (e: PointerEvent) => {
        state.dragging = true;
        state.lastX = e.clientX;
        state.moved = 0;
        dragged.current = false;
      };
      const move = (e: PointerEvent) => {
        if (state.dragging) {
          const dx = e.clientX - state.lastX;
          state.lastX = e.clientX;
          state.moved += Math.abs(dx);
          state.angle += dx * 0.32;
          state.velocity = dx * 0.32;
          // Only now is it a drag: keep receiving the pointer even if it
          // leaves the stage, and swallow the click that would follow.
          if (state.moved > 6 && !dragged.current) {
            dragged.current = true;
            setSpun(true);
            st.setPointerCapture(e.pointerId);
          }
        }
        const box = st.getBoundingClientRect();
        state.tiltTo = -9 - ((e.clientY - box.top) / box.height - 0.5) * 12;
      };
      const up = () => {
        state.dragging = false;
      };
      const leave = () => {
        state.tiltTo = -9;
      };
      st.addEventListener("pointerdown", down);
      st.addEventListener("pointermove", move);
      st.addEventListener("pointerup", up);
      st.addEventListener("pointercancel", up);
      st.addEventListener("pointerleave", leave);

      return () => {
        io.disconnect();
        gsap.ticker.remove(tick);
        st.removeEventListener("pointerdown", down);
        st.removeEventListener("pointermove", move);
        st.removeEventListener("pointerup", up);
        st.removeEventListener("pointercancel", up);
        st.removeEventListener("pointerleave", leave);
      };
    }, el);

    return () => {
      window.removeEventListener("resize", sizeRing);
      ctx.revert();
      setLive(false);
    };
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-14 pt-8 md:px-10 md:pb-20 md:pt-12 lg:grid-cols-[1.02fr_1fr] lg:items-center">
        {/* Hidden for a moment while motion is on, so the entrance never flashes. */}
        <div className="hero-pre relative z-10 motion-ok:invisible motion-ok:[animation:hero-failsafe_0s_4s_forwards]">
          <p className="hero-stamp stamp text-forest">Est. 1946 · Basavanagudi, Bengaluru</p>
          <h1
            aria-label="Once BMS. Always BMS."
            className="mt-6 font-display text-[clamp(3.2rem,13vw,6.5rem)] font-extrabold leading-[0.86] tracking-[-0.045em] lg:text-[clamp(3.6rem,7.3vw,7.4rem)]"
          >
            <span className="-my-[0.14em] block overflow-hidden py-[0.14em]">
              <Letters text="Once BMS." />
            </span>
            <span className="-my-[0.14em] block overflow-hidden py-[0.14em]">
              <Letters text="Always" className="hero-hl hl serif-accent bg-no-repeat pr-[0.08em] text-[0.96em] tracking-[-0.03em]" />
              <Letters text=" BMS." />
            </span>
          </h1>
          <p className="hero-fade mt-6 max-w-[34rem] text-lg leading-relaxed text-ink/75">
            The alumni network of B.M.S. College of Engineering. Find your batch, join your city
            chapter, and leave something on the wall for whoever comes next.
          </p>
          <div className="hero-fade mt-7 flex flex-wrap items-center gap-3">
            <Link href={cta.href} className="btn h-12 px-6 text-base">
              {cta.label}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/noticeboard" className="btn btn-lime h-12 px-6 text-base">
              See The Wall
            </Link>
          </div>
          <p className="hero-fade hand mt-7 -rotate-2 text-[1.55rem] text-forest/80" aria-hidden="true">
            {live && !spun ? "grab the photos and spin them →" : "your batch is in here somewhere →"}
          </p>
        </div>

        {/* The 3D stage. */}
        <div
          ref={stage}
          className={`hero-pre hero-stage relative mx-auto h-[min(26rem,78vw)] w-full max-w-[36rem] touch-pan-y select-none motion-ok:invisible motion-ok:[animation:hero-failsafe_0s_4s_forwards] lg:h-[min(34rem,74vh)] lg:max-w-none ${
            live ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          <div ref={ring} className="hero-ring absolute inset-0">
            {prints.map((p, i) => (
              <div
                key={p.code}
                className="ring-card absolute left-1/2 top-1/2"
                style={{ ["--i" as string]: i, ["--lift" as string]: `${(i - (prints.length - 1) / 2) * 7}%` }}
              >
                <Link
                  href="/noticeboard"
                  draggable={false}
                  aria-label="A moment from the network. Open The Wall."
                  onClick={(e) => dragged.current && e.preventDefault()}
                  className="block rounded-print bg-white p-[4%] pb-[14%] shadow-[0_24px_40px_-18px_rgb(19_26_21/0.65)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" draggable={false} loading={i < 4 ? "eager" : "lazy"} className="pointer-events-none aspect-square w-full object-cover" />
                  <span className="label-mono absolute bottom-[4%] left-[6%] text-ink/55">{p.stamp}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
