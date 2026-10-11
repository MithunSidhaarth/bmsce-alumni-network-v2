// Formatting helpers shared by server and client components. Dates are
// rendered in India Standard Time everywhere so server and browser output
// match (no hydration drift, and one consistent clock for the network).
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
    month: "short",
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

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "12 OCT 2026": the rubber-stamp date used on notices and tickets. */
export function stampDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
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
