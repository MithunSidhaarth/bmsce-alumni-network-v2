"use client";

import { useEffect } from "react";

const WASHED = { filter: "brightness(1.55) contrast(0.42) sepia(0.55)", opacity: 0.4 };

/**
 * Photo prints develop like instant film: when a picture inside a print frame
 * (".rounded-print") finishes loading, it comes up from washed-out to full
 * colour. Done with the Web Animations API, so nothing in the page's markup
 * changes and a picture can never be left half developed.
 */
export default function Develop() {
  useEffect(() => {
    const develop = (e: Event) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.closest(".rounded-print") || !img.animate) return;
      img.animate([WASHED, { filter: "none", opacity: 1 }], { duration: 1800, easing: "ease-out" });
    };
    // "load" does not bubble, but it can be caught on the way down.
    document.addEventListener("load", develop, true);
    return () => document.removeEventListener("load", develop, true);
  }, []);
  return null;
}
