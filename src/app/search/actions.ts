"use server";

import { actionMember } from "@/lib/me";
import { rateLimit } from "@/lib/rateLimit";

export type QuickHit = { href: string; title: string; sub: string; group: "People" | "Posts" | "Chapters" | "Articles" };

/**
 * The few best matches of each kind for the Ctrl+K search. Everything is read
 * as the signed-in member, so the usual access rules apply. People are matched
 * on their name only: company and city can be hidden by their owner.
 */
export async function quickSearch(q: string): Promise<QuickHit[]> {
  const { supabase, user } = await actionMember();
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  await rateLimit(supabase, `quicksearch:${user.id}`, 240, 3600);
  const like = term.replace(/[%_,()\\]/g, " ").trim();
  if (!like) return [];

  const [people, posts, chapters, articles] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, user_type, graduation_year, branch")
      .eq("verification_status", "verified")
      .is("suspended_at", null)
      .ilike("full_name", `%${like}%`)
      .order("full_name")
      .limit(5),
    supabase
      .from("posts")
      .select("id, title, body, kind")
      .textSearch("fts", term, { type: "websearch", config: "english" })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("chapters").select("slug, name, region").eq("status", "active").ilike("name", `%${like}%`).order("name").limit(4),
    supabase
      .from("articles")
      .select("slug, title, category")
      .eq("status", "published")
      .textSearch("fts", term, { type: "websearch", config: "english" })
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  return [
    ...(people.data ?? []).map((p): QuickHit => ({
      group: "People",
      href: `/directory/${p.id}`,
      title: p.full_name ?? "Member",
      sub: [p.user_type === "student" ? "Student" : p.graduation_year ? `Class of ${p.graduation_year}` : "Alumni", p.branch].filter(Boolean).join(" · "),
    })),
    ...(posts.data ?? []).map((p): QuickHit => ({
      group: "Posts",
      href: `/community/${p.id}`,
      title: (p.title ?? p.body ?? "").replace(/\s+/g, " ").slice(0, 80),
      sub: p.kind === "post" ? "Post" : `${String(p.kind).charAt(0).toUpperCase()}${String(p.kind).slice(1)}`,
    })),
    ...(chapters.data ?? []).map((c): QuickHit => ({ group: "Chapters", href: `/chapters/${c.slug}`, title: c.name, sub: c.region ?? "Chapter" })),
    ...(articles.data ?? []).map((a): QuickHit => ({ group: "Articles", href: `/blog/${a.slug}`, title: a.title, sub: a.category })),
  ];
}
