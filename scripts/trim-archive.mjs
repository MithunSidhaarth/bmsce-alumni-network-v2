// Some archived Instagram thumbnails were saved with bars baked into the file:
// a 4:5 poster padded out to a square with white, or a landscape reel frame
// letterboxed to 9:16 with black. Inside a polaroid frame that reads as a
// picture that does not fill its frame. This trims those bars in place and
// rewrites src/data/instagram-sizes.json, which the Wall uses to cut each
// frame to its picture.
//
//   node scripts/trim-archive.mjs          (report only)
//   node scripts/trim-archive.mjs --write  (rewrite the files)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const dir = new URL("../public/instagram/", import.meta.url);
const write = process.argv.includes("--write");
const sizes = {};
let trimmed = 0;

// White: any real bar (8% or more of a side). A poster's own thin white
// margin is left alone.
// Black: only a clean letterbox or pillarbox (bars on one axis, nothing on
// the other), so a dark poster never loses its own background.
const RULES = [
  {
    name: "white",
    background: "#ffffff",
    corner: (c) => c.min >= 238,
    accept: (cutW, cutH) => Math.max(cutW, cutH) >= 0.08,
  },
  {
    name: "black",
    background: "#000000",
    corner: (c) => c.max <= 18,
    accept: (cutW, cutH) => (cutW >= 0.12 && cutH <= 0.03) || (cutH >= 0.12 && cutW <= 0.03),
  },
];

for (const file of readdirSync(dir).filter((f) => f.endsWith(".jpg"))) {
  const path = new URL(file, dir);
  const input = readFileSync(path);
  const meta = await sharp(input).metadata();
  let width = meta.width;
  let height = meta.height;

  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return { min: Math.min(data[i], data[i + 1], data[i + 2]), max: Math.max(data[i], data[i + 1], data[i + 2]) };
  };
  const corners = [px(1, 1), px(info.width - 2, 1), px(1, info.height - 2), px(info.width - 2, info.height - 2)];

  for (const rule of RULES) {
    if (!corners.every(rule.corner)) continue;
    const out = await sharp(input)
      .trim({ background: rule.background, threshold: 18 })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const cutW = 1 - out.info.width / width;
    const cutH = 1 - out.info.height / height;
    // Never when most of the image would go.
    if (rule.accept(cutW, cutH) && out.info.width >= width * 0.3 && out.info.height >= height * 0.3) {
      trimmed += 1;
      console.log(`${file}: ${rule.name} bars, ${width}x${height} -> ${out.info.width}x${out.info.height}`);
      if (write) writeFileSync(path, out.data);
      width = out.info.width;
      height = out.info.height;
    }
    break;
  }
  sizes[file.replace(".jpg", "")] = [width, height];
}

console.log(`${trimmed} file(s) ${write ? "trimmed" : "would be trimmed"}`);
if (write) writeFileSync(new URL("../src/data/instagram-sizes.json", import.meta.url), JSON.stringify(sizes));
