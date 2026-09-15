// Strips embedded control characters (tabs, newlines, carriage returns, and
// other C0/DEL control codes) that attackers use to split a scheme --
// e.g. "java" + TAB + "script:alert(1)" -- past naive prefix checks, then
// trims surrounding whitespace.
function sanitize(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    const isControl = code <= 0x1f || code === 0x7f;
    if (!isControl) out += raw[i];
  }
  return out.trim();
}

/**
 * Validates a user/DB-supplied URL for safe use in an href. Returns the
 * parsed, canonical URL string if -- and only if -- it's an absolute http(s)
 * URL. Returns null for everything else (javascript:, data:, vbscript:,
 * blob:, protocol-relative "//host", malformed strings, mailto:, etc.).
 * Never "repairs" a bad value (e.g. never prepends https://) -- reject only.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = sanitize(raw);
  if (!cleaned) return null;

  let parsed: URL;
  try {
    // No base argument: a scheme-relative or bare-host value (e.g.
    // "//evil.com" or "example.com") fails to parse as absolute and is
    // rejected, rather than being resolved against some assumed origin.
    parsed = new URL(cleaned);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return parsed.toString();
}
