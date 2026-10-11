"use server";

import { revalidatePath } from "next/cache";
import { actionMember } from "@/lib/me";
import { rateLimit } from "@/lib/rateLimit";
import { logAdminAction } from "@/lib/audit";
import { FORUM_TAGS } from "@/lib/posts";
import type { PostKind, ReactionKind } from "@/lib/types";

// Every write here is also enforced in Postgres (RLS + the posts_guard
// trigger). These checks exist to give people a clear message first.

const KINDS: PostKind[] = ["post", "discussion", "announcement", "achievement", "memory"];
const REACTION_KINDS: ReactionKind[] = ["like", "cheer", "nostalgia", "insight"];

function refresh(postId?: string, chapterSlug?: string | null) {
  revalidatePath("/");
  revalidatePath("/community");
  if (postId) revalidatePath(`/community/${postId}`);
  if (chapterSlug) revalidatePath(`/chapters/${chapterSlug}`);
  revalidatePath("/noticeboard");
}

export async function createPost(input: {
  kind: PostKind;
  title?: string;
  body: string;
  tags?: string[];
  media?: string[];
  chapterId?: string | null;
  eventId?: string | null;
}) {
  const { supabase, user } = await actionMember();
  const kind = KINDS.includes(input.kind) ? input.kind : "post";
  const title = (input.title ?? "").trim();
  const body = input.body.trim();
  if (!body) throw new Error("Write something first.");
  if (body.length > 10000) throw new Error("That post is too long.");
  if (kind === "discussion" && !title) throw new Error("A discussion needs a title.");
  if (title.length > 200) throw new Error("Keep the title under 200 characters.");

  const tags = (input.tags ?? []).filter((t) => (FORUM_TAGS as readonly string[]).includes(t)).slice(0, 3);
  // Only accept photos that live in this member's own storage folder.
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${user.id}/`;
  const media = (input.media ?? []).filter((u) => u.startsWith(base)).slice(0, 6);

  await rateLimit(supabase, `post:${user.id}`, 15, 3600);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      kind,
      title: title || null,
      body,
      tags,
      media,
      chapter_id: input.chapterId ?? null,
      event_id: input.eventId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  refresh();
  return data.id as string;
}

export async function deletePost(postId: string) {
  const { supabase } = await actionMember();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  refresh(postId);
}

/** Admins and chapter leads only: the database rejects anyone else. */
export async function setPinned(postId: string, pinned: boolean) {
  const { supabase, isAdmin } = await actionMember();
  const { error } = await supabase.from("posts").update({ is_pinned: pinned }).eq("id", postId);
  if (error) throw new Error(error.message);
  if (isAdmin) await logAdminAction(supabase, pinned ? "post.pin" : "post.unpin", postId);
  refresh(postId);
}

export async function setHidden(postId: string, hidden: boolean) {
  const { supabase, isAdmin } = await actionMember();
  const { error } = await supabase.from("posts").update({ is_hidden: hidden }).eq("id", postId);
  if (error) throw new Error(error.message);
  if (isAdmin) await logAdminAction(supabase, hidden ? "post.hide" : "post.unhide", postId);
  refresh(postId);
}

/** Set, change or (with null) remove the member's reaction on a post. */
export async function react(postId: string, kind: ReactionKind | null) {
  const { supabase, user } = await actionMember();
  if (kind === null) {
    const { error } = await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return;
  }
  if (!REACTION_KINDS.includes(kind)) throw new Error("Unknown reaction.");
  await rateLimit(supabase, `react:${user.id}`, 200, 3600);
  const { data: existing } = await supabase
    .from("post_reactions")
    .select("kind")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("post_reactions").update({ kind }).eq("post_id", postId).eq("user_id", user.id)
    : await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, kind });
  if (error) throw new Error(error.message);
}

export async function addComment(postId: string, body: string, parentId?: string | null) {
  const { supabase, user } = await actionMember();
  const b = body.trim();
  if (!b) throw new Error("Write a reply first.");
  if (b.length > 5000) throw new Error("That reply is too long.");
  await rateLimit(supabase, `comment:${user.id}`, 40, 3600);
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: user.id, body: b, parent_id: parentId ?? null });
  if (error) throw new Error(error.message);
  refresh(postId);
}

export async function deleteComment(commentId: string, postId: string) {
  const { supabase } = await actionMember();
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw new Error(error.message);
  refresh(postId);
}

export async function toggleCommentLike(commentId: string, postId: string) {
  const { supabase, user } = await actionMember();
  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id)
    : await supabase.from("comment_reactions").insert({ comment_id: commentId, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${postId}`);
}

/** Follow or unfollow a conversation (followers are notified of replies). */
export async function setFollow(postId: string, follow: boolean) {
  const { supabase, user } = await actionMember();
  const { error } = follow
    ? await supabase.from("post_follows").upsert({ post_id: postId, user_id: user.id })
    : await supabase.from("post_follows").delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${postId}`);
}

/**
 * A short note thrown onto The Wall. It is a real post under the member's
 * name. A member's note waits for an admin; an admin's own note is pinned at
 * once (the database only lets admins publish wall items).
 */
export async function pinNote(text: string): Promise<"published" | "pending"> {
  const { supabase, user, isAdmin } = await actionMember();
  const body = text.trim();
  if (body.length < 3) throw new Error("Write a few words first.");
  if (body.length > 240) throw new Error("Keep a note under 240 characters.");
  await rateLimit(supabase, `post:${user.id}`, 15, 3600);

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, kind: "post", body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (isAdmin) {
    const { error: pinError } = await supabase
      .from("notice_items")
      .upsert({ source: "post", post_id: data.id, origin: "admin", status: "published", created_by: user.id }, { onConflict: "post_id" });
    if (pinError) {
      await supabase.from("posts").delete().eq("id", data.id);
      throw new Error(pinError.message);
    }
    refresh(data.id);
    return "published";
  }
  const { data: status, error: suggestError } = await supabase.rpc("suggest_for_noticeboard", { p_post: data.id });
  if (suggestError) {
    // e.g. the daily suggestion limit: take the note back rather than leave a stray post.
    await supabase.from("posts").delete().eq("id", data.id);
    throw new Error(suggestError.message);
  }
  refresh(data.id);
  return status === "published" ? "published" : "pending";
}

/** Offer one of your own posts for The Wall. An admin approves it. */
export async function suggestForWall(postId: string) {
  const { supabase } = await actionMember();
  const { data, error } = await supabase.rpc("suggest_for_noticeboard", { p_post: postId });
  if (error) throw new Error(error.message);
  return data as string;
}
