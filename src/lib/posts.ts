import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostKind, ReactionKind } from "@/lib/types";

// Tags are labels inside the one common forum, never separate rooms.
export const FORUM_TAGS = [
  "Careers",
  "Entrepreneurship",
  "Technology",
  "Finance",
  "Higher studies",
  "General",
] as const;

export const KIND_LABEL: Record<PostKind, string> = {
  post: "Post",
  discussion: "Discussion",
  announcement: "Announcement",
  achievement: "Achievement",
  memory: "Memory",
};

export const REACTIONS: { kind: ReactionKind; label: string; glyph: string }[] = [
  { kind: "like", label: "Like", glyph: "♥" },
  { kind: "cheer", label: "Cheers", glyph: "✦" },
  { kind: "nostalgia", label: "Takes me back", glyph: "◷" },
  { kind: "insight", label: "Insightful", glyph: "✎" },
];

export const POST_SELECT =
  "id, author_id, kind, title, body, media, tags, chapter_id, event_id, is_pinned, is_hidden, comment_count, reaction_count, last_activity_at, created_at, updated_at, author:profiles!posts_author_id_fkey(id, full_name, photo_url, user_type, graduation_year, branch), chapter:chapters(name, slug)";

type Raw = Omit<Post, "author" | "chapter"> & {
  author: Post["author"] | Post["author"][];
  chapter: Post["chapter"] | Post["chapter"][];
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export function normalizePosts(rows: unknown): Post[] {
  return ((rows as Raw[] | null) ?? []).map((r) => ({
    ...r,
    author: one(r.author),
    chapter: one(r.chapter),
  }));
}

export type PostQuery = {
  /** feed: everything. forum: common discussions only. chapter: one chapter. */
  scope: "feed" | "forum" | "chapter" | "author";
  chapterId?: string;
  chapterIds?: string[];
  authorId?: string;
  kind?: PostKind;
  tag?: string;
  q?: string;
  sort?: "recent" | "active" | "popular";
  limit?: number;
  offset?: number;
};

export async function listPosts(supabase: SupabaseClient, query: PostQuery): Promise<Post[]> {
  const limit = Math.min(query.limit ?? 20, 50);
  const offset = query.offset ?? 0;
  let q = supabase.from("posts").select(POST_SELECT);

  if (query.scope === "forum") q = q.eq("kind", "discussion").is("chapter_id", null);
  if (query.scope === "chapter" && query.chapterId) q = q.eq("chapter_id", query.chapterId);
  if (query.scope === "author" && query.authorId) q = q.eq("author_id", query.authorId);
  if (query.chapterIds) q = q.in("chapter_id", query.chapterIds);
  if (query.kind) q = q.eq("kind", query.kind);
  if (query.tag) q = q.contains("tags", [query.tag]);
  if (query.q?.trim()) q = q.textSearch("fts", query.q.trim(), { type: "websearch", config: "english" });

  // Pinned first inside a chapter or the forum; the home feed handles pins
  // in its own slot so they never bury fresh posts.
  if (query.scope === "forum" || query.scope === "chapter") {
    q = q.order("is_pinned", { ascending: false });
  }
  if (query.sort === "popular") {
    q = q.order("reaction_count", { ascending: false }).order("comment_count", { ascending: false });
  } else if (query.sort === "active") {
    q = q.order("last_activity_at", { ascending: false });
  }
  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return normalizePosts(data);
}

/** The signed-in member's own reaction on each of the given posts. */
export async function myReactions(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[]
): Promise<Record<string, ReactionKind>> {
  if (postIds.length === 0) return {};
  const { data } = await supabase
    .from("post_reactions")
    .select("post_id, kind")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return Object.fromEntries((data ?? []).map((r) => [r.post_id as string, r.kind as ReactionKind]));
}
