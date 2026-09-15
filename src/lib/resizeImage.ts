"use client";

// Client-side resize/compress via <canvas>, run entirely in the browser
// before upload. This is what keeps gallery uploads fast and reliable at
// scale: the raw photo (which can be 10-20MB straight off a phone) never
// leaves the browser or hits a server — only the already-small derivative
// blob gets uploaded to storage. `createImageBitmap`'s `imageOrientation:
// "from-image"` option auto-applies EXIF rotation so photos don't come out
// sideways.
export async function resizeImage(
  file: File,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
  if (!blob) throw new Error("Could not encode the resized image.");
  return blob;
}

// Tuned for a gallery: thumbnails cover a small grid tile, medium covers a
// full-viewport lightbox without ever needing the raw original.
export const THUMBNAIL_MAX_DIMENSION = 400;
export const THUMBNAIL_QUALITY = 0.7;
export const MEDIUM_MAX_DIMENSION = 1600;
export const MEDIUM_QUALITY = 0.82;
