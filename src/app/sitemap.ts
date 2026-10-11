import type { MetadataRoute } from "next";
import { getCareersEnabled } from "@/lib/settings";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Public, indexable pages only. Member-only areas (the feed, forum, chapters'
// posts, messages, profiles, admin) are intentionally left out.
const ROUTES = [
  "",
  "/about",
  "/events",
  "/chapters",
  "/noticeboard",
  "/blog",
  "/gallery",
  "/faqs",
  "/login",
  "/join",
  "/privacy",
  "/terms",
];

// Only advertised while Careers is enabled: otherwise these redirect to the
// "not available" gate, so they stay out of the sitemap entirely.
const CAREERS_ROUTES = ["/careers/jobs", "/careers/internships", "/careers/mentorship"];

type Row = { slug: string; updated_at?: string };

// Published articles and active chapters, read with the public key. Row Level
// Security only returns what a signed-out visitor may see.
async function publicRows(table: string, query: string): Promise<Row[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    return res.ok ? ((await res.json()) as Row[]) : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [careersEnabled, articles, chapters] = await Promise.all([
    getCareersEnabled(),
    publicRows("articles", "select=slug,updated_at&status=eq.published&order=published_at.desc&limit=500"),
    publicRows("chapters", "select=slug&status=eq.active&limit=500"),
  ]);
  const routes = careersEnabled ? [...ROUTES, ...CAREERS_ROUTES] : ROUTES;
  return [
    ...routes.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...articles.map((a) => ({
      url: `${siteUrl}/blog/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...chapters.map((c) => ({
      url: `${siteUrl}/chapters/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
