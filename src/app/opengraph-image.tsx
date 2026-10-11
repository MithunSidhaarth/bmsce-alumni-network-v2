import archive from "@/data/instagram-archive.json";
import sizes from "@/data/instagram-sizes.json";
import { BLANK_SHOTS } from "@/data/instagram-blank";
import { OG_SIZE, ogCard } from "@/lib/og";

// The default share card for the site (WhatsApp, LinkedIn and X link previews).
export const alt = "BMSCE Alumni Network: Once BMS. Always BMS.";
export const size = OG_SIZE;
export const contentType = "image/png";

// The newest square photograph from the alumni association's own archive.
const SIZES = sizes as Record<string, number[]>;
const cover = (archive as { short_code: string; image_url: string | null; posted_at: string | null }[])
  .filter((p) => p.image_url && p.posted_at && SIZES[p.short_code] && !BLANK_SHOTS.has(p.short_code))
  .filter((p) => Math.abs(SIZES[p.short_code][0] / SIZES[p.short_code][1] - 1) < 0.02)
  .sort((a, b) => (a.posted_at! < b.posted_at! ? 1 : -1))[0];

export default function OgImage() {
  return ogCard({
    eyebrow: "Est. 1946 · Basavanagudi, Bengaluru",
    title: "Once BMS. Always BMS.",
    note: "find your batch, your city, your people",
    image: cover?.image_url ?? null,
  });
}
