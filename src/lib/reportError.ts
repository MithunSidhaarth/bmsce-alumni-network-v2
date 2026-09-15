// Central place every route error boundary reports through. In development
// it logs the full error (stack trace, message) so local debugging stays
// fast. In production it does NOT log to the browser console — a stack
// trace there hands anyone with devtools open the app's internal file
// paths and structure for free, with zero benefit (no one's watching the
// console in production to catch it).
//
// Wire a real error-tracking service here once one is set up, e.g.:
//   import * as Sentry from "@sentry/nextjs";
//   Sentry.captureException(error, { extra: { digest: error.digest } });
// Until then, production errors are swallowed client-side rather than
// exposed — `error.digest` still gets logged server-side by Next.js itself,
// so occurrences aren't invisible, just not broadcast to every visitor.
export function reportError(error: Error & { digest?: string }) {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }
}
