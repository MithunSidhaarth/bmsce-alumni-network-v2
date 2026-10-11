import { NextResponse } from "next/server";
import { getMe } from "@/lib/me";
import { renderDigest, siteUrl, type DigestArticle } from "@/lib/newsletter";

// Renders the exact HTML a subscriber would receive. Admins only.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { supabase, me } = await getMe();
  if (!me || me.role !== "admin" || me.suspended_at) {
    return new NextResponse("Not found", { status: 404 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const { data: digest } = await supabase
    .from("newsletter_digests")
    .select("subject, preheader, intro, article_ids")
    .eq("id", id)
    .maybeSingle();
  if (!digest) return new NextResponse("Digest not found", { status: 404 });

  const ids = digest.article_ids as string[];
  const { data: rows } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, cover_url, category, author_name, reading_minutes")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .eq("status", "published");
  const articles: DigestArticle[] = ids
    .map((aid) => (rows ?? []).find((r) => r.id === aid))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      cover: r.cover_url,
      category: r.category,
      author: r.author_name,
      minutes: r.reading_minutes,
    }));

  const { html } = renderDigest({ ...digest, articles }, `${siteUrl()}/unsubscribe?token=preview`);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
