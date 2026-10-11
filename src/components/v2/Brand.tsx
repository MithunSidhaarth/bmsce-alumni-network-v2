/* eslint-disable @next/next/no-img-element */
// The Network's logo and gear mark (Brand Guidelines, Edition 2, pp. 8 to 11).
//
// The artwork is the files in /public/brand, always shown whole: never
// retyped, redrawn, recoloured, stretched, boxed or animated.
//  - Full logo: clear space of x (a third of its height) on every side. Full
//    colour on a light ground; the white logo on a dark one. The guide asks
//    for at least 75 px; the site owner chose a smaller header logo (52 px,
//    and 36 to 40 px in the phone bars) so it sits neatly in the bar.
//  - Gear mark: at least 32 px, only where the full logo will not fit, and
//    always with the full name beside it. Shown in its "On Ink" version.
//
// `on` says what the logo sits on: "light", "dark", or "page" (the page
// itself, which is light by day and dark at night).

type Ground = "page" | "light" | "dark";
const NAME = "BMSCE Alumni Network";
const RATIO = 503 / 177;

export function Logo({ height = 52, on = "page", clear = true, className = "" }: { height?: number; on?: Ground; clear?: boolean; className?: string }) {
  const h = height;
  const w = Math.round(h * RATIO);
  const x = clear ? Math.round(h / 3) : 0;
  return (
    <span className={`brand inline-block shrink-0 ${className}`} data-on={on} style={{ padding: x }}>
      <img src="/brand/logo.png" alt={NAME} width={w} height={h} className="brand-light block max-w-none" style={{ width: w, height: h }} />
      <img src="/brand/logo-white.png" alt={NAME} width={w} height={h} className="brand-dark max-w-none" style={{ width: w, height: h }} />
    </span>
  );
}

export function GearMark({ size = 40, name = true, className = "" }: { size?: number; name?: boolean; className?: string }) {
  const s = Math.max(32, size);
  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <img src="/brand/gear-on-ink.png" alt="" width={s} height={s} className="block" style={{ width: s, height: s }} />
      <span className={name ? "font-display text-sm font-bold leading-tight" : "sr-only"}>{NAME}</span>
    </span>
  );
}
