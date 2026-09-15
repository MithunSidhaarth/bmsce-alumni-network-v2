"use client";

import { useRef, type ReactNode } from "react";

// A soft glow that tracks the cursor across the card — the "premium SaaS
// dashboard" hover effect. Works on both light and dark tiles: pass the
// glow color to match (white reads on a dark tile, an ink tint on a light
// one). Pure CSS custom properties updated on mousemove, no re-renders.
export default function SpotlightCard({
  children,
  className = "",
  glow = "rgba(255,255,255,0.16)",
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={`group relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(480px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${glow}, transparent 45%)`,
        }}
      />
      {children}
    </div>
  );
}
