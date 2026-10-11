"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import Icon from "../Icon";

const MAX = 1.6;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * A surface you drag to move around and zoom into, like a map. One finger or
 * the mouse pans; two fingers pinch; Ctrl + wheel (or a trackpad pinch) and
 * the buttons zoom. A plain wheel still scrolls the page, so nobody gets
 * stuck. Tabbing to something outside the frame brings it into view.
 */
export default function PanZoom({
  width,
  height,
  label,
  className = "",
  children,
}: {
  width: number;
  height: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement | null>(null);
  const plane = useRef<HTMLDivElement | null>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, dist: 0, k: 1 });
  const [k, setK] = useState(1);
  const [minK, setMinK] = useState(0.3);
  const [dragging, setDragging] = useState(false);

  // The smallest zoom shows the whole board.
  const floor = useCallback(() => {
    const f = frame.current;
    if (!f) return 0.3;
    return clamp(Math.min(f.clientWidth / width, f.clientHeight / height), 0.15, 1);
  }, [width, height]);

  const apply = useCallback(
    (next: Partial<{ x: number; y: number; k: number }>, animate = false) => {
      const f = frame.current;
      const p = plane.current;
      if (!f || !p) return;
      const v = { ...view.current, ...next };
      v.k = clamp(v.k, floor(), MAX);
      // Keep the board inside the frame; centre it when it is smaller.
      const w = width * v.k;
      const h = height * v.k;
      v.x = w <= f.clientWidth ? (f.clientWidth - w) / 2 : clamp(v.x, f.clientWidth - w, 0);
      v.y = h <= f.clientHeight ? (f.clientHeight - h) / 2 : clamp(v.y, f.clientHeight - h, 0);
      view.current = v;
      p.style.transition = animate ? "transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
      p.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.k})`;
      setK(v.k);
    },
    [floor, width, height]
  );

  /** Zoom to scale "to", keeping the point (cx, cy) of the frame where it is. */
  const zoomTo = useCallback(
    (to: number, cx: number, cy: number, animate = false) => {
      const v = view.current;
      const nk = clamp(to, floor(), MAX);
      apply({ k: nk, x: cx - ((cx - v.x) * nk) / v.k, y: cy - ((cy - v.y) * nk) / v.k }, animate);
    },
    [apply, floor]
  );

  const zoomBy = (factor: number) => {
    const f = frame.current;
    if (f) zoomTo(view.current.k * factor, f.clientWidth / 2, f.clientHeight / 2, true);
  };

  // Open on a comfortable reading size; refit when the window or board changes.
  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    apply({ x: 0, y: 0, k: clamp(f.clientWidth / 1000, 0.5, 1) });
    const onResize = () => {
      setMinK(floor());
      apply({});
    };
    onResize();
    window.addEventListener("resize", onResize);
    // Ctrl + wheel and trackpad pinches zoom toward the pointer.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const box = f.getBoundingClientRect();
      zoomTo(view.current.k * Math.exp(-e.deltaY * 0.01), e.clientX - box.left, e.clientY - box.top);
    };
    f.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("resize", onResize);
      f.removeEventListener("wheel", onWheel);
    };
  }, [apply, floor, zoomTo]);

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current.moved = 0;
    if (pointers.current.size === 2) gesture.current = { moved: 99, dist: spread(), k: view.current.k };
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const box = e.currentTarget.getBoundingClientRect();
      if (gesture.current.dist > 0) {
        zoomTo((gesture.current.k * spread()) / gesture.current.dist, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top);
      }
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    // A small wobble is still a click; only a real drag moves the board (and,
    // by capturing the pointer, keeps the release from opening a card).
    if (gesture.current.moved < 6) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    apply({ x: view.current.x + dx, y: view.current.y + dy });
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={frame}
        role="group"
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          if (gesture.current.moved >= 6) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onFocusCapture={(e) => {
          // The browser scrolls a hidden-overflow box to reveal focus; undo
          // that and move the board instead.
          const f = e.currentTarget;
          f.scrollTop = 0;
          f.scrollLeft = 0;
          const spot = (e.target as HTMLElement).closest<HTMLElement>("[data-spot]");
          if (!spot) return;
          const v = view.current;
          apply(
            {
              x: f.clientWidth / 2 - (spot.offsetLeft + spot.offsetWidth / 2) * v.k,
              y: f.clientHeight / 2 - (spot.offsetTop + spot.offsetHeight / 2) * v.k,
            },
            true
          );
        }}
        className={`h-full w-full touch-none select-none overflow-hidden ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div ref={plane} className="relative origin-top-left will-change-transform" style={{ width, height }}>
          {children}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-ink/15 bg-paper p-1 text-ink shadow-[var(--shadow-lift)]">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.3)}
          disabled={k <= minK + 0.001}
          aria-label="Zoom out"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-lime disabled:opacity-35"
        >
          <Icon name="minus" />
        </button>
        <span className="w-11 text-center font-mono text-xs" aria-live="polite">
          {Math.round(k * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1.3)}
          disabled={k >= MAX - 0.001}
          aria-label="Zoom in"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-lime disabled:opacity-35"
        >
          <Icon name="plus" />
        </button>
        <button
          type="button"
          onClick={() => apply({ k: floor(), x: 0, y: 0 }, true)}
          className="h-10 rounded-full px-3 text-xs font-semibold hover:bg-lime"
        >
          Whole board
        </button>
      </div>
    </div>
  );
}
