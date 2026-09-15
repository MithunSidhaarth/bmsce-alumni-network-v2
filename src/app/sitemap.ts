import type { MetadataRoute } from "next";
import { getCareersEnabled } from "@/lib/settings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Public, indexable pages only. Auth-gated pages (directory profiles, job
// openings, admin, profile, onboarding) are intentionally excluded.
const ROUTES = [
  "",
  "/about",
  "/events",
  "/chapters",
  "/notable-alumni",
  "/newsletter",
  "/gallery",
  "/faqs",
  "/give-back",
  "/leadership",
  "/press",
  "/login",
  "/privacy",
  "/terms",
];

// Only advertised while Careers is enabled — otherwise these redirect to the
// "not available" gate, so we keep them out of the sitemap entirely.
const CAREERS_ROUTES = [
  "/careers/jobs",
  "/careers/internships",
  "/careers/mentorship",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const careersEnabled = await getCareersEnabled();
  const routes = careersEnabled ? [...ROUTES, ...CAREERS_ROUTES] : ROUTES;
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
