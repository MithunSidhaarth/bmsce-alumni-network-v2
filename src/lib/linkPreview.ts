// A text-only preview (title, description, site name) for the first link in a
// post. Server only.
//
// Fetching a URL that a member typed is a way to make this server talk to
// machines it should not (its own host, a cloud metadata service, a private
// network). So: https only, default port only, no credentials, the host must
// resolve to public addresses, the connection is pinned to the address that
// was checked, every redirect is checked again, and the response is capped in
// time and size. No images are fetched or stored.
import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";

export type LinkPreview = { url: string; title: string; description?: string; site?: string };

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

/** The first web address in a piece of text, without trailing punctuation. */
export function firstUrl(text: string): string | null {
  const hit = text.match(URL_RE)?.[0];
  return hit ? hit.replace(/[.,;:!?]+$/, "") : null;
}

/** True for loopback, private, link-local, carrier-grade NAT, multicast and reserved addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (kind !== 6) return true; // not an address at all: refuse
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPrivateAddress(mapped);
  // Anything that is not ordinary global unicast (2000::/3) is refused.
  return !/^[23]/.test(v6);
}

type Target = { url: URL; address: string; family: number };

async function safeTarget(raw: string): Promise<Target | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname;
  // Names only: no bare IP addresses, no single-label or internal names.
  if (isIP(host.replace(/^\[|\]$/g, "")) || !host.includes(".") || /\.(local|internal|localhost|lan|home|corp)$/i.test(host)) return null;
  try {
    const found = await lookup(host, { all: true });
    if (found.length === 0 || found.some((f) => isPrivateAddress(f.address))) return null;
    return { url, address: found[0].address, family: found[0].family };
  } catch {
    return null;
  }
}

function get(target: Target, timeoutMs: number): Promise<{ status: number; location?: string; type: string; body: string }> {
  // The socket connects to the address that was just checked, whatever the
  // name resolves to a moment later.
  const pinned: LookupFunction = (_host, options, cb) => {
    const all = typeof options === "object" && options !== null && (options as { all?: boolean }).all;
    if (all) (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: target.address, family: target.family }]);
    else cb(null, target.address, target.family);
  };
  return new Promise((resolve, reject) => {
    const req = https.get(
      target.url,
      {
        lookup: pinned,
        timeout: timeoutMs,
        headers: { "user-agent": "BMSCEAlumniNetwork-LinkPreview/1.0", accept: "text/html,application/xhtml+xml", "accept-language": "en" },
      },
      (res) => {
        const type = String(res.headers["content-type"] ?? "");
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location, type, body: "" });
        }
        if (status !== 200 || !/text\/html|application\/xhtml/i.test(type)) {
          res.destroy();
          return resolve({ status, type, body: "" });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          chunks.push(c);
          size += c.length;
          // The tags we want are in <head>; a quarter of a megabyte is plenty.
          if (size > 256 * 1024) res.destroy();
        });
        const done = () => resolve({ status, type, body: Buffer.concat(chunks).toString("utf8") });
        res.on("end", done);
        res.on("close", done);
        res.on("error", done);
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };
const decode = (s: string) =>
  s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      const key = e.toLowerCase();
      if (ENTITIES[key]) return ENTITIES[key];
      const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : key.startsWith("#") ? parseInt(key.slice(1), 10) : NaN;
      return Number.isFinite(code) && code > 31 && code < 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/\s+/g, " ")
    .trim();

function meta(html: string, name: string): string | null {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i"))?.[0];
  const value = tag?.match(/content=(?:"([^"]*)"|'([^']*)')/i);
  return value ? decode(value[1] ?? value[2] ?? "") || null : null;
}

/** Pull a title, description and site name out of a page's head. */
export function parsePreview(html: string, url: string): LinkPreview | null {
  const head = html.slice(0, 200_000);
  const title = meta(head, "og:title") ?? meta(head, "twitter:title") ?? decode(head.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] ?? "");
  if (!title) return null;
  const description = meta(head, "og:description") ?? meta(head, "description") ?? undefined;
  const site = meta(head, "og:site_name") ?? undefined;
  return {
    url,
    title: title.slice(0, 140),
    ...(description ? { description: description.slice(0, 220) } : {}),
    ...(site ? { site: site.slice(0, 60) } : {}),
  };
}

/** A preview for the link, or null (unsafe, slow, not a web page, no title). Never throws. */
export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  const deadline = Date.now() + 3500;
  try {
    let next = raw;
    for (let hop = 0; hop < 4; hop++) {
      const target = await safeTarget(next);
      const left = deadline - Date.now();
      if (!target || left < 200) return null;
      const res = await get(target, left);
      if (res.status >= 300 && res.status < 400 && res.location) {
        next = new URL(res.location, target.url).toString();
        continue;
      }
      return res.body ? parsePreview(res.body, raw) : null;
    }
    return null;
  } catch {
    return null;
  }
}
