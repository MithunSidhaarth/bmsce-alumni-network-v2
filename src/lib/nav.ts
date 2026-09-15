/**
 * Sanitize a post-login `next` destination. Only same-origin relative paths
 * (e.g. "/chapters") are allowed — anything that could redirect off-site
 * ("//evil.com", "/\\evil.com", "https://…", or a non-path) falls back to "/".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return "/";
  }
  return next;
}
