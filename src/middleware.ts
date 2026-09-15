import { NextResponse, NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getCareersEnabled } from "@/lib/settings";

// Note: as of Next.js 16 this file convention is deprecated in favor of
// proxy.ts (`npx @next/codemod@canary middleware-to-proxy .` migrates it),
// but middleware.ts still works — Next only emits a build-time warning. Left
// as-is here since renaming/migrating is a separate concern from adding
// security headers, and Proxy defaults to the Node.js runtime rather than
// Edge, which is a behavior change worth its own review.

// Nonce-based CSP. A static SRI-only policy (no nonce, no 'unsafe-inline')
// blocks *every* inline script Next.js emits — including the per-request RSC
// streaming payloads (`self.__next_f.push(...)`), which can't have a static
// hash because their content differs on every request. Subresource
// Integrity (`experimental.sri` in next.config.ts) is a separate mechanism
// that only covers external `<script src>` bundles; it doesn't grant inline
// scripts any CSP allowance, so it can't substitute for a nonce or hash here.
//
// The one known gap: Next.js doesn't thread this nonce onto the inline
// scripts generated for loading/error/not-found boundary segments in this
// version (vercel/next.js#96063, #95433, open PR #92803) — a narrow,
// upstream bug. That's a much smaller blast radius than having no inline
// script allowance at all, so it's the right tradeoff until that's fixed.
function buildCsp(nonce: string, isDev: boolean) {
  const SUPABASE_ORIGIN = "https://taqlqkjwzpdpomjcexmb.supabase.co";
  const SUPABASE_WS_ORIGIN = "wss://taqlqkjwzpdpomjcexmb.supabase.co";

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self'`,
    `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN}`,
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Careers is gated by the admin-controlled `careers_enabled` flag. While it's
  // off, any /careers subpage (jobs, internships, mentorship, post,
  // my-postings, openings/[id], …) is sent to the /careers "not available"
  // page. Flipping the flag on in /admin re-opens them, no deploy needed.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/careers/")) {
    const enabled = await getCareersEnabled();
    if (!enabled) {
      const redirectResponse = NextResponse.redirect(
        new URL("/careers", request.url)
      );
      redirectResponse.headers.set("Content-Security-Policy", csp);
      return redirectResponse;
    }
  }

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
