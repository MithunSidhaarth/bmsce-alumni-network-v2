"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const R = 25;
const LENGTH = 2 * Math.PI * R;

/**
 * Back to the top. A paper button that appears once you are a screen down
 * the page; the ring around it fills as you read, so it doubles as a quiet
 * "how far along am I". It sits above the phone tab bar, and steps up out of
 * the way of the note pad on The Wall.
 */
export default function ScrollTop() {
  const pathname = usePathname();
  const ring = useRef<SVGCircleElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ring.current) ring.current.style.strokeDashoffset = String(LENGTH * (1 - progress));
      setShow(window.scrollY > window.innerHeight * 0.9);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  const lifted = pathname.startsWith("/noticeboard");

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to the top"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      data-show={show}
      className={`scroll-top keep-day group fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full md:right-6 ${
        lifted ? "bottom-[calc(var(--scroll-top-base)+7.5rem)]" : "bottom-[var(--scroll-top-base)]"
      }`}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={R} fill="var(--color-paper)" stroke="rgb(19 26 21 / 0.16)" strokeWidth="2.5" className="transition-[fill] duration-200 group-hover:fill-[var(--color-lime)]" />
        <circle ref={ring} cx="28" cy="28" r={R} fill="none" stroke="var(--color-blue)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={LENGTH} strokeDashoffset={LENGTH} />
      </svg>
      <Icon name="up" className="relative h-5 w-5 text-ink transition-transform duration-200 group-hover:-translate-y-0.5" />
      <span className="hand pointer-events-none absolute right-[calc(100%+0.6rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-[1.35rem] text-forest opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block" aria-hidden="true">
        back to the top
      </span>
    </button>
  );
}
