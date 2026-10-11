import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in src/middleware.ts instead of
// here, because it needs a fresh nonce on every request to allow Next.js's
// inline/streaming scripts (RSC hydration payloads, etc.) without falling
// back to 'unsafe-inline'. A static header can't carry a per-request value.
// (An earlier version of this file tried covering that gap with
// `experimental.sri` — Subresource Integrity on external `<script src>`
// bundles — but SRI has no effect on CSP and grants inline scripts no
// allowance at all, so it didn't actually solve the problem.)
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Belt-and-suspenders for older browsers that don't support the CSP
  // frame-ancestors directive above; frame-ancestors 'none' supersedes it in
  // modern browsers.
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in the `X-Powered-By` response header —
  // minor info-disclosure that makes framework-specific CVEs easier to
  // shortlist against this site.
  poweredByHeader: false,
  // Development only: lets the dev server be opened as 127.0.0.1 as well as
  // localhost. Handy for a second, signed-out session next to a signed-in one.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Gallery thumbnails/medium images live in Supabase Storage — next/image
    // needs the host allowlisted to optimize/serve them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co"
        ).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Without this, a page fetched via client-side <Link> navigation can be
    // served from the router cache for up to 30s even though it reads
    // request-scoped state (the signed-in user) — so a page visited right
    // after signing in/out can flash the pre-auth version until a hard
    // reload. Every page here that depends on auth already opts into
    // per-request rendering (`export const dynamic = "force-dynamic"`); this
    // makes the client cache honor that instead of second-guessing it.
    // Sign-in is always a full page load and sign-out calls router.refresh(),
    // both of which reset this cache, so a short window is safe and makes
    // back/forward and repeat visits instant instead of re-showing a loader.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // The standalone /happening page was folded into /events.
  async redirects() {
    return [
      { source: "/happening", destination: "/events", permanent: true },
      // The newsletter archive now lives inside Blog & Insights.
      { source: "/newsletter", destination: "/blog#archive", permanent: false },
      { source: "/network", destination: "/directory", permanent: false },
      // Holds fictional placeholder people; not ready for the public. Remove
      // this redirect once real notable alumni are added to the page.
      { source: "/notable-alumni", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
