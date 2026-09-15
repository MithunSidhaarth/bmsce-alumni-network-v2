"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { addGalleryPhoto, deleteGalleryPhoto } from "./actions";
import { createClient } from "@/lib/supabase/client";
import {
  resizeImage,
  THUMBNAIL_MAX_DIMENSION,
  THUMBNAIL_QUALITY,
  MEDIUM_MAX_DIMENSION,
  MEDIUM_QUALITY,
} from "@/lib/resizeImage";
import type { GalleryPhoto } from "@/lib/types";

// Caps how many files upload at once so a huge batch doesn't hammer the
// browser or Supabase's API simultaneously — comfortably handles hundreds
// dropped in together since it's just a queue depth, not a hard batch limit.
const CONCURRENCY = 3;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
      }
    }
  );
  await Promise.all(runners);
}

export default function GalleryAdmin({
  existing,
}: {
  existing: GalleryPhoto[];
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(existing);
  const [dragOver, setDragOver] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;

    setBusy(true);
    setTotal(images.length);
    setDone(0);
    setFailed([]);

    const supabase = createClient();

    await runWithConcurrency(images, CONCURRENCY, async (file) => {
      try {
        // Both derivatives are generated in the browser (canvas resize +
        // recompress) before anything is uploaded — the raw file itself
        // never leaves the browser.
        const [thumbBlob, mediumBlob] = await Promise.all([
          resizeImage(file, THUMBNAIL_MAX_DIMENSION, THUMBNAIL_QUALITY),
          resizeImage(file, MEDIUM_MAX_DIMENSION, MEDIUM_QUALITY),
        ]);

        const id = crypto.randomUUID();
        const thumbPath = `thumb/${id}.webp`;
        const mediumPath = `medium/${id}.webp`;

        const [{ error: thumbErr }, { error: mediumErr }] = await Promise.all([
          supabase.storage
            .from("gallery-photos")
            .upload(thumbPath, thumbBlob, { contentType: "image/webp" }),
          supabase.storage
            .from("gallery-photos")
            .upload(mediumPath, mediumBlob, { contentType: "image/webp" }),
        ]);
        if (thumbErr) throw thumbErr;
        if (mediumErr) throw mediumErr;

        const thumbnailUrl = supabase.storage
          .from("gallery-photos")
          .getPublicUrl(thumbPath).data.publicUrl;
        const imageUrl = supabase.storage
          .from("gallery-photos")
          .getPublicUrl(mediumPath).data.publicUrl;

        await addGalleryPhoto({ imageUrl, thumbnailUrl, caption: "" });

        setPhotos((cur) => [
          {
            id,
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            caption: null,
            uploaded_by: null,
            uploaded_at: new Date().toISOString(),
          },
          ...cur,
        ]);
      } catch (err) {
        setFailed((cur) => [
          ...cur,
          `${file.name}: ${err instanceof Error ? err.message : "upload failed"}`,
        ]);
      } finally {
        setDone((n) => n + 1);
      }
    });

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const remove = (id: string) => {
    setDeleting(id);
    deleteGalleryPhoto(id)
      .then(() => setPhotos((cur) => cur.filter((p) => p.id !== id)))
      .catch(() => {
        // leave it in the list; the admin can retry
      })
      .finally(() => setDeleting(null));
  };

  return (
    <div className="flex flex-col gap-10">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragOver
            ? "border-oxblood bg-oxblood/5"
            : "border-gold/40 bg-ivory-dim/40"
        }`}
      >
        <p className="font-display text-xl italic text-ink">
          Drag photos here
        </p>
        <p className="font-sans text-sm text-ink/60">or</p>
        <label className="cursor-pointer rounded-lg border border-gold/40 bg-ivory-dim/60 px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:border-gold">
          Choose files
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => uploadFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <p className="mt-2 font-sans text-xs text-ink/45">
          JPEG, PNG, or WebP — select as many as you like. Resized and
          compressed right in your browser before upload, so large batches
          upload reliably.
        </p>
      </div>

      {busy && (
        <div className="rounded-xl border border-gold/30 bg-ivory-dim/40 px-5 py-4">
          <div className="flex items-center justify-between font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/60">
            <span>Uploading…</span>
            <span>
              {done} / {total}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gold/20">
            <div
              className="h-full bg-oxblood transition-all duration-300"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="rounded-xl border border-oxblood/30 bg-oxblood/5 px-5 py-4">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood">
            {failed.length} {failed.length === 1 ? "photo" : "photos"} failed
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {failed.map((msg, i) => (
              <li key={i} className="font-sans text-xs text-oxblood/80">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-ink">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </h2>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {photos.map((p) => (
              <div
                key={p.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-ivory-dim"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnail_url}
                  alt={p.caption ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={deleting === p.id}
                  aria-label="Delete photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-ivory opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 disabled:opacity-60"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
