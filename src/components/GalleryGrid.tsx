"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import GalleryLightbox from "./GalleryLightbox";
import type { GalleryPhoto } from "@/lib/types";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";

function formatPhotoDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GalleryGrid({
  initialPhotos,
  initialHasMore,
}: {
  initialPhotos: GalleryPhoto[];
  initialHasMore: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);

    const supabase = createClient();
    const from = photos.length;
    const to = from + GALLERY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("id, image_url, thumbnail_url, caption, uploaded_by, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .range(from, to)
      .returns<GalleryPhoto[]>();
    if (error) console.error("gallery_photos fetch failed:", error.message);

    const batch = data ?? [];
    setPhotos((cur) => [...cur, ...batch]);
    setHasMore(batch.length === GALLERY_PAGE_SIZE);
    setLoadingMore(false);
    loadingRef.current = false;
  }, [hasMore, photos.length]);

  // Infinite scroll: fetch the next batch only once the sentinel at the
  // bottom of the grid actually scrolls into view — nothing beyond the
  // current batch is fetched or rendered until then.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-20 text-center">
        <p className="font-display text-xl italic text-ink">
          No photos yet.
        </p>
        <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
          Check back soon — this fills up as photos are added.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Bento mosaic instead of a flat uniform grid — every 6th tile runs
          big and every 4th runs wide, so the eye has somewhere to land
          instead of scanning a plain checkerboard. grid-flow-dense lets
          smaller tiles fill in around the bigger ones automatically. */}
      <div className="grid auto-rows-[120px] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:auto-rows-[150px] sm:grid-cols-3 md:auto-rows-[170px] md:grid-cols-4 lg:auto-rows-[190px] lg:grid-cols-5">
        {photos.map((photo, i) => {
          const big = i % 6 === 0;
          const wide = !big && i % 4 === 0;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={
                photo.caption ? `Open photo: ${photo.caption}` : "Open photo"
              }
              style={{ animationDelay: `${(i % 12) * 45}ms` }}
              className={`group relative motion-safe:animate-fade-up overflow-hidden rounded-xl bg-ivory-dim ${
                big
                  ? "col-span-2 row-span-2"
                  : wide
                    ? "col-span-2 row-span-1"
                    : "col-span-1 row-span-1"
              }`}
            >
              <Image
                src={photo.thumbnail_url}
                alt={photo.caption ?? ""}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                // Only the first row needs eager loading; next/image lazy-loads
                // (native loading="lazy") everything else by default.
                priority={i < 5}
              />
              {/* Caption + date reveal on hover/focus instead of sitting on
                  the tile permanently — keeps the mosaic clean at rest. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 via-ink/10 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {photo.caption && (
                  <p className="line-clamp-2 font-display text-sm italic leading-snug text-ivory">
                    {photo.caption}
                  </p>
                )}
                <p className="mt-1 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-ivory/60">
                  {formatPhotoDate(photo.uploaded_at)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sentinel: fires the next fetch when it scrolls near the viewport;
          renders nothing itself. */}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

      {loadingMore && (
        <p className="mt-6 text-center font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">
          Loading more…
        </p>
      )}

      {openIndex !== null && (
        <GalleryLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
          onNeedMore={hasMore ? loadMore : undefined}
        />
      )}
    </div>
  );
}
