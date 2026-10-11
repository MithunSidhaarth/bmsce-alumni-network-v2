import { OG_SIZE, ogCard } from "@/lib/og";
import { serverClient } from "@/lib/server/cron";

// Share card for an article. Read without a session, so only published
// articles can ever appear on one.
export const alt = "An article on the BMSCE Alumni Network";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ArticleOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: a } = await serverClient()
    .from("articles")
    .select("title, category, author_name, cover_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return ogCard({
    eyebrow: a ? `Blog & Insights · ${a.category}` : "Blog & Insights",
    title: a?.title ?? "Stories from the BMSCE alumni network",
    note: a?.author_name ? `by ${a.author_name}` : undefined,
    image: a?.cover_url ?? null,
  });
}
