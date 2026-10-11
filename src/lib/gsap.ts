"use client";

// One place that registers the GSAP plugins this site uses. GSAP and all of
// its plugins are free to use (including commercially) since version 3.13.
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
// A phone's address bar sliding away resizes the window; re-measuring every
// pinned section each time makes the page jump.
ScrollTrigger.config({ ignoreMobileResize: true });

// Development only: a handle for stepping animations by hand from the console
// (browsers pause animation frames in background tabs, which makes scroll
// choreography hard to inspect otherwise). Never present in production.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as { __gsap?: unknown }).__gsap = { gsap, ScrollTrigger };
}

export { gsap, ScrollTrigger, Draggable };
