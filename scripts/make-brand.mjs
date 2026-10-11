// Builds the favicon, app icons and notification badge from the gear mark
// (Brand Guidelines, Edition 2, p. 11: the "On Ink" version, white gears on Ink).
//
//   node scripts/make-brand.mjs
//
// Source: public/brand/gear-white.png. When the Network's master artwork is
// supplied, replace the files in public/brand and run this again.
import sharp from "sharp";

const INK = "#212529";
const gear = "public/brand/gear-white.png";

/** An Ink tile with the gear mark in the middle. `fill` is the gear's share of the height. */
async function tile(size, { fill = 0.62, shape = "square" } = {}) {
  const mark = await sharp(gear).resize({ height: Math.round(size * fill) }).toBuffer();
  const radius = shape === "circle" ? size / 2 : shape === "rounded" ? size * 0.22 : 0;
  const ground = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/></svg>`
  );
  return sharp(ground).composite([{ input: mark, gravity: "centre" }]).png();
}

await (await tile(64, { shape: "circle", fill: 0.68 })).toFile("src/app/icon.png");
// The mark as shown in the site header where the full logo will not fit.
await (await tile(256, { shape: "circle", fill: 0.66 })).toFile("public/brand/gear-on-ink.png");
await (await tile(180)).toFile("src/app/apple-icon.png");
await (await tile(192, { shape: "rounded" })).toFile("public/icons/icon-192.png");
await (await tile(512, { shape: "rounded" })).toFile("public/icons/icon-512.png");
// Maskable: the launcher crops to its own shape, so the mark stays inside the safe middle.
await (await tile(512, { fill: 0.5 })).toFile("public/icons/maskable-512.png");
// Android status-bar badge: the mark alone, white on clear.
await sharp({ create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await sharp(gear).resize({ height: 84 }).toBuffer(), gravity: "centre" }])
  .png()
  .toFile("public/icons/badge-96.png");
console.log("brand icons written");
