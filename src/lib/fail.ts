// Messages meant for the person using the site, raised by server actions.
//
// A production build hides the text of every error thrown on the server: the
// browser is handed a generic one. What it does pass through is the error's
// "digest" (the same field redirects travel in). fail() puts the message
// there, and said() reads it back in the browser.
//
//   server:  throw fail("A discussion needs a title.");
//   browser: catch (e) { setError(said(e) ?? "Could not publish that."); }
//
// ponytail: this rides on the digest field. If a future Next.js stops passing
// custom digests through, said() returns null and the caller's fallback text
// is shown; the upgrade path is returning { error } from each action instead.
const MARK = "SAID:";

export function fail(message: string): Error {
  const error = new Error(message);
  (error as Error & { digest?: string }).digest = MARK + message;
  return error;
}

/** The message a server action meant for the user, or the error's own message, or null. */
export function said(e: unknown): string | null {
  const digest = (e as { digest?: unknown } | null)?.digest;
  if (typeof digest === "string" && digest.startsWith(MARK)) return digest.slice(MARK.length);
  if (!(e instanceof Error)) return null;
  // The generic stand-in a production build substitutes says nothing useful.
  if (/Server Components render|Minified React error/.test(e.message)) return null;
  return e.message;
}
