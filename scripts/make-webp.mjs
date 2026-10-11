// Makes WebP copies of the archive photographs in public/instagram: one at
// full size and one 320 pixels wide for small frames. Runs before "dev" and
// "build" (see package.json); the copies are not committed. Photos that
// already have up-to-date copies are skipped, so repeat runs are instant.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/instagram";
const OUT = path.join(SRC, "w");
fs.mkdirSync(OUT, { recursive: true });

let made = 0;
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".jpg"))) {
  const from = path.join(SRC, file);
  const code = file.slice(0, -4);
  const stamp = fs.statSync(from).mtimeMs;
  for (const [name, width] of [[`${code}.webp`, null], [`${code}-320.webp`, 320]]) {
    const to = path.join(OUT, name);
    if (fs.existsSync(to) && fs.statSync(to).mtimeMs >= stamp) continue;
    let img = sharp(from);
    if (width) img = img.resize({ width, withoutEnlargement: true });
    await img.webp({ quality: width ? 68 : 74 }).toFile(to);
    made += 1;
  }
}
if (made) console.log(`make-webp: wrote ${made} file(s) to ${OUT}`);
