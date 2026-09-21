"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Loaded only on the client: react-globe.gl/three touch window/WebGL at
// runtime, so SSR must never evaluate this module. ChapterGlobeInner owns the
// actual <Globe> instance/ref internally — next/dynamic's own wrapper doesn't
// forward refs to a dynamically-loaded component, so the ref lives one level
// down, inside the module that's dynamically imported as a whole.
const ChapterGlobeInner = dynamic(() => import("./ChapterGlobeInner"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

function GlobePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/40">
        Loading globe…
      </p>
    </div>
  );
}

export default function ChapterMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        role="img"
        aria-label="Interactive 3D globe of BMS alumni chapter locations"
        className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden bg-transparent sm:max-w-[560px] md:max-w-[600px]"
      >
        {size.width > 0 ? (
          <ChapterGlobeInner width={size.width} height={size.height} />
        ) : (
          <GlobePlaceholder />
        )}
      </div>
      <p className="mt-3 text-center font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">
        Drag to spin · pinch or ctrl + scroll to zoom
      </p>
    </div>
  );
}
