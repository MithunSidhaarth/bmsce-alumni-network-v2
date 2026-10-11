// Share cards: the picture a link shows when it is pasted into WhatsApp,
// LinkedIn or X. Drawn on the server in the site's own look: a photo print
// taped to the page, the title in the display face, a handwritten note.
// Server only.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#131a15";
const asset = (name: string) => readFile(join(process.cwd(), "src/assets/og", name));

type Face = { name: string; data: Buffer; weight: 700 | 800; style: "normal" };
let faces: Promise<Face[]> | null = null;
/** Bricolage for titles, Caveat for handwriting, Arimo (an Arial lookalike) for card print. */
export function ogFonts(): Promise<Face[]> {
  faces ??= Promise.all([asset("Bricolage-800.ttf"), asset("Caveat-700.ttf"), asset("Arimo-700.ttf")]).then(([b, c, a]) => [
    { name: "Bricolage", data: b, weight: 800, style: "normal" },
    { name: "Caveat", data: c, weight: 700, style: "normal" },
    { name: "Arimo", data: a, weight: 700, style: "normal" },
  ]);
  return faces;
}

const STORAGE = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

/**
 * A picture as a JPEG data URI, sized for a card. Only this site's own files
 * (under /public) and its own storage are read; anything else gives null and
 * the card is drawn without a photograph.
 */
export async function ogPicture(src: string | null | undefined, box = 760): Promise<string | null> {
  if (!src) return null;
  try {
    let raw: Buffer;
    if (src.startsWith("/")) {
      if (src.includes("..") || !/^\/[\w\-./]+\.(jpg|jpeg|png|webp)$/i.test(src)) return null;
      raw = await readFile(join(process.cwd(), "public", src));
    } else {
      if (!STORAGE || !src.startsWith(`${STORAGE}/storage/v1/object/public/`)) return null;
      const res = await fetch(src, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      raw = Buffer.from(await res.arrayBuffer());
      if (raw.length > 8_000_000) return null;
    }
    const jpeg = await sharp(raw).rotate().resize(box, box, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The standard card: brand, a small label, the title, a handwritten line, and a taped photo print if there is a picture. */
export async function ogCard({
  eyebrow,
  title,
  note = "Once BMS. Always BMS.",
  image,
}: {
  eyebrow?: string | null;
  title: string;
  note?: string;
  image?: string | null;
}) {
  const [photo, crestPng, fonts] = await Promise.all([ogPicture(image, 760), readFile(join(process.cwd(), "public", "bmsce-crest.png")), ogFonts()]);
  const crest = `data:image/png;base64,${crestPng.toString("base64")}`;
  const heading = clip(title.replace(/\s+/g, " ").trim(), photo ? 90 : 120);
  const size = heading.length > 70 ? 50 : heading.length > 40 ? 62 : 76;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#f4eedd", color: INK, fontFamily: "Arimo", padding: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: photo ? 600 : 1080 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={crest} width={70} height={70} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
              <span style={{ fontFamily: "Bricolage", fontSize: 32, lineHeight: 1 }}>BMSCE</span>
              <span style={{ fontFamily: "Caveat", fontSize: 30, lineHeight: 1, marginTop: 2 }}>alumni network</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {eyebrow ? (
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#e8501f" }}>{clip(eyebrow, 46)}</div>
            ) : null}
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: size, lineHeight: 1.03, letterSpacing: -2, marginTop: 14 }}>{heading}</div>
          </div>

          <div style={{ display: "flex", fontFamily: "Caveat", fontSize: 44, color: "#0f3b2a" }}>{clip(note, 44)}</div>
        </div>

        {photo ? (
          <div
            style={{
              position: "absolute",
              right: 66,
              top: 66,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "#ffffff",
              padding: 18,
              paddingBottom: 70,
              borderRadius: 8,
              transform: "rotate(4deg)",
              boxShadow: "0 34px 54px rgba(19, 26, 21, 0.38)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={photo} width={400} height={400} style={{ objectFit: "cover" }} />
            <div style={{ position: "absolute", top: -20, left: 150, width: 140, height: 40, background: "rgba(200, 245, 60, 0.88)", transform: "rotate(-4deg)" }} />
          </div>
        ) : (
          <div style={{ position: "absolute", right: 60, bottom: 60, display: "flex", width: 150, height: 150, borderRadius: 75, background: "#c8f53c", transform: "rotate(8deg)", alignItems: "center", justifyContent: "center", fontFamily: "Caveat", fontSize: 34, textAlign: "center", lineHeight: 1 }}>
            est. 1946
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
