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
  images: {
    // Gallery thumbnails/medium images live in Supabase Storage — next/image
    // needs the host allowlisted to optimize/serve them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "taqlqkjwzpdpomjcexmb.supabase.co",
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
    staleTimes: {
      dynamic: 0,
    },
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
