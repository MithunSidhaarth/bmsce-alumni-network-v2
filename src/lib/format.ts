// Formatting helpers shared by server and client components. Dates are
// rendered in India Standard Time everywhere so server and browser output
// match (no hydration drift, and one consistent clock for the Network).
//
// House style (Brand Guidelines, Edition 2, p. 22):
//   dates  "11 October 2026", or "Saturday, 11 October 2026". Never 11/10/26.
//   times  "6:30 pm IST". The zone is always named, because the clock shown
//          is the Network's, not the reader's.
const TZ = "Asia/Kolkata";

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d`;
  return shortDate(iso);
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  const sameYear =
    d.toLocaleDateString("en-GB", { timeZone: TZ, year: "numeric" }) ===
    new Date().toLocaleDateString("en-GB", { timeZone: TZ, year: "numeric" });
  return d.toLocaleDateString("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "Saturday, 11 October 2026" */
export function dayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "6:30 pm IST" */
export function clockTime(iso: string): string {
  const t = new Date(iso)
    .toLocaleTimeString("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s*([ap])\.?m\.?$/i, (_, p) => ` ${p.toLowerCase()}m`);
  return `${t} IST`;
}

/** "Saturday, 11 October 2026, 6:30 pm IST" */
export function dateTime(iso: string): string {
  return `${dayDate(iso)}, ${clockTime(iso)}`;
}

/** "October 2026" */
export function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, month: "long", year: "numeric" });
}

/** "12 OCTOBER 2026": the rubber-stamp date used on notices and tickets. */
export function stampDate(iso: string): string {
  return longDate(iso).toUpperCase();
}

/** yyyy-mm-dd in network time, for grouping messages by day. */
export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

export function initials(name: string | null | undefined): string {
  // Words that start with a letter only, so "Asha (test)" gives "A", not "A(".
  const parts = (name ?? "").trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * A stable pseudo-random number in [0, 1) from a string. The board uses it to
 * give every card the same tilt on the server and in the browser.
 */
export function seeded(key: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
