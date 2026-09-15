"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { GalleryPhoto } from "@/lib/types";

// How close to the end of the currently-loaded photos (by index) before we
// ask the grid to fetch another batch, so scrolling via the lightbox's
// next/prev never stalls at a page boundary.
const PREFETCH_THRESHOLD = 3;

export default function GalleryLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  onNeedMore,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onNeedMore?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];

  const canPrev = index > 0;
  const canNext = index < photos.length - 1;

  const goPrev = () => canPrev && onIndexChange(index - 1);
  const goNext = () => canNext && onIndexChange(index + 1);

  // The full-resolution image hasn't loaded yet whenever the index changes —
  // the thumbnail placeholder (already cached from the grid) shows instantly
  // underneath it until it does.
  useEffect(() => {
    setLoaded(false);
  }, [index]);

  // Preload the next and previous full-size images in the background, so by
  // the time the user actually navigates there, the browser serves them
  // straight from cache instead of fetching over the network.
  useEffect(() => {
    const toPreload = [photos[index + 1], photos[index - 1]].filter(
      (p): p is GalleryPhoto => Boolean(p)
    );
    const preloaders = toPreload.map((p) => {
      const img = new Image();
      img.src = p.image_url;
      return img;
    });
    return () => {
      preloaders.forEach((img) => {
        img.src = "";
      });
    };
  }, [index, photos]);

  // Ask for more once we're near the end of what's loaded, so the lightbox
  // never dead-ends mid-scroll.
  useEffect(() => {
    if (onNeedMore && index >= photos.length - PREFETCH_THRESHOLD) {
      onNeedMore();
    }
  }, [index, photos.length, onNeedMore]);

  // Keyboard nav + lock page scroll while open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    const SWIPE_THRESHOLD = 50;
    if (dx > SWIPE_THRESHOLD) goPrev();
    else if (dx < -SWIPE_THRESHOLD) goNext();
  };

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[100] flex flex-col bg-ink/95 backdrop-blur-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ivory/60">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 select-none px-4 pb-4 md:px-16 md:pb-8">
        <div className="relative h-full w-full">
          {/* Placeholder: the grid thumbnail, already in the browser cache,
              so it paints instantly — the whole point of "opens near-instant". */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`thumb-${photo.id}`}
            src={photo.thumbnail_url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-105 object-contain opacity-90 blur-md"
          />
          {/* Full-resolution "medium" image, fading in once it loads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`full-${photo.id}`}
            src={photo.image_url}
            alt={photo.caption ?? ""}
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {canPrev && (
          <NavButton side="left" onClick={goPrev} label="Previous photo" />
        )}
        {canNext && (
          <NavButton side="right" onClick={goNext} label="Next photo" />
        )}
      </div>

      {photo.caption && (
        <p className="px-6 pb-6 text-center font-sans text-sm text-ivory/70">
          {photo.caption}
        </p>
      )}
    </div>
  );
}

function NavButton({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 p-2.5 text-ivory/90 backdrop-blur-sm transition-colors hover:bg-ink/60 hover:text-ivory md:flex ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
