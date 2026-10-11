"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actionMember } from "@/lib/me";
import { rateLimit } from "@/lib/rateLimit";
import { logAdminAction } from "@/lib/audit";
import { FORUM_TAGS } from "@/lib/posts";
import { fetchLinkPreview, firstUrl } from "@/lib/linkPreview";
import { dispatchPush } from "@/lib/push";
import type { PostKind, ReactionKind } from "@/lib/types";
import { fail } from "@/lib/fail";

// Every write here is also enforced in Postgres (RLS + the posts_guard
// trigger). These checks exist to give people a clear message first.

const KINDS: PostKind[] = ["post", "discussion", "announcement", "achievement", "memory", "ask", "offer"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Only ids are trusted from the browser; the database looks the names up
// itself and drops anyone whose "@Name" is not actually in the text.
function mentionIds(mentions: { id: string }[] | undefined) {
  return [...new Set((mentions ?? []).map((m) => m.id).filter((id) => UUID.test(id)))].slice(0, 10).map((id) => ({ id }));
}
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
  /** Two to four poll options, or nothing. */
  poll?: string[];
  mentions?: { id: string }[];
}) {
  const { supabase, user } = await actionMember();
  const kind = KINDS.includes(input.kind) ? input.kind : "post";
  const title = (input.title ?? "").trim();
  const body = input.body.trim();
  if (!body) throw fail("Write something first.");
  if (body.length > 10000) throw fail("That post is too long.");
  if (kind === "discussion" && !title) throw fail("A discussion needs a title.");
  if (title.length > 200) throw fail("Keep the title under 200 characters.");

  const tags = (input.tags ?? []).filter((t) => (FORUM_TAGS as readonly string[]).includes(t)).slice(0, 3);
  // Only accept photos that live in this member's own storage folder.
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${user.id}/`;
  const media = (input.media ?? []).filter((u) => u.startsWith(base)).slice(0, 6);

  const poll = (input.poll ?? []).map((o) => o.trim()).filter(Boolean);
  if (input.poll && (poll.length < 2 || poll.length > 4)) throw fail("A poll needs two to four options.");
  if (poll.some((o) => o.length > 80)) throw fail("Keep each poll option under 80 characters.");
  if (new Set(poll.map((o) => o.toLowerCase())).size !== poll.length) throw fail("Two poll options are the same.");

  await rateLimit(supabase, `post:${user.id}`, 15, 3600);

  // A text card for the first link, fetched once. Never blocks the post: a
  // link that is slow, private or not a web page simply has no card.
  const link = firstUrl(body);
  const linkPreview = link ? await fetchLinkPreview(link) : null;

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
      poll_options: poll.length ? poll : null,
      link_preview: linkPreview,
      mentions: mentionIds(input.mentions),
    })
    .select("id")
    .single();
  if (error) throw fail(error.message);
  // Photo drop: a photograph shared on an event's page is offered to The Wall
  // (an admin approves it). If today's suggestions are used up, the post
  // still stands; it just is not offered.
  if (input.eventId && kind === "memory" && media.length > 0) {
    await supabase.rpc("suggest_for_noticeboard", { p_post: data.id });
  }
  after(() => dispatchPush());
  refresh();
  return data.id as string;
}

export async function deletePost(postId: string) {
  const { supabase } = await actionMember();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw fail(error.message);
  refresh(postId);
}

/** Admins and chapter leads only: the database rejects anyone else. */
export async function setPinned(postId: string, pinned: boolean) {
  const { supabase, isAdmin } = await actionMember();
  const { error } = await supabase.from("posts").update({ is_pinned: pinned }).eq("id", postId);
  if (error) throw fail(error.message);
  if (isAdmin) await logAdminAction(supabase, pinned ? "post.pin" : "post.unpin", postId);
  refresh(postId);
}

export async function setHidden(postId: string, hidden: boolean) {
  const { supabase, isAdmin } = await actionMember();
  const { error } = await supabase.from("posts").update({ is_hidden: hidden }).eq("id", postId);
  if (error) throw fail(error.message);
  if (isAdmin) await logAdminAction(supabase, hidden ? "post.hide" : "post.unhide", postId);
  refresh(postId);
}

/** Set, change or (with null) remove the member's reaction on a post. */
export async function react(postId: string, kind: ReactionKind | null) {
  const { supabase, user } = await actionMember();
  if (kind === null) {
    const { error } = await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) throw fail(error.message);
    return;
  }
  if (!REACTION_KINDS.includes(kind)) throw fail("Unknown reaction.");
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
  if (error) throw fail(error.message);
}

export async function addComment(postId: string, body: string, parentId?: string | null, mentions?: { id: string }[]) {
  const { supabase, user } = await actionMember();
  const b = body.trim();
  if (!b) throw fail("Write a reply first.");
  if (b.length > 5000) throw fail("That reply is too long.");
  await rateLimit(supabase, `comment:${user.id}`, 40, 3600);
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: user.id, body: b, parent_id: parentId ?? null, mentions: mentionIds(mentions) });
  if (error) throw fail(error.message);
  after(() => dispatchPush());
  refresh(postId);
}

export async function deleteComment(commentId: string, postId: string) {
  const { supabase } = await actionMember();
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw fail(error.message);
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
  if (error) throw fail(error.message);
  revalidatePath(`/community/${postId}`);
}

/** Follow or unfollow a conversation (followers are notified of replies). */
export async function setFollow(postId: string, follow: boolean) {
  const { supabase, user } = await actionMember();
  const { error } = follow
    ? await supabase.from("post_follows").upsert({ post_id: postId, user_id: user.id })
    : await supabase.from("post_follows").delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) throw fail(error.message);
  revalidatePath(`/community/${postId}`);
}

/** Vote in a poll, change the vote, or (with null) take it back. Returns the new totals. */
export async function votePoll(postId: string, option: number | null): Promise<number[]> {
  const { supabase, user } = await actionMember();
  if (!UUID.test(postId)) throw fail("Unknown poll.");
  await rateLimit(supabase, `vote:${user.id}`, 120, 3600);
  if (option === null) {
    const { error } = await supabase.from("poll_votes").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) throw fail(error.message);
  } else {
    if (!Number.isInteger(option) || option < 0 || option > 3) throw fail("Unknown option.");
    // The database checks that the post has a poll and that the option exists.
    const { error } = await supabase
      .from("poll_votes")
      .upsert({ post_id: postId, user_id: user.id, option_index: option }, { onConflict: "post_id,user_id" });
    if (error) throw fail("That vote could not be counted.");
  }
  const { data } = await supabase.from("posts").select("poll_counts").eq("id", postId).maybeSingle();
  return (data?.poll_counts as number[] | null) ?? [];
}

/** Members whose name matches, for the "@" picker. */
export async function searchMembers(q: string): Promise<{ id: string; name: string; photo: string | null; line: string }[]> {
  const { supabase, user } = await actionMember();
  const term = q.trim().replace(/[%_,()\\]/g, " ").slice(0, 40);
  if (term.length < 2) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, user_type, graduation_year, branch")
    .eq("verification_status", "verified")
    .is("suspended_at", null)
    .neq("id", user.id)
    .ilike("full_name", `%${term}%`)
    .order("full_name")
    .limit(6);
  return (data ?? [])
    .filter((p) => p.full_name)
    .map((p) => ({
      id: p.id as string,
      name: p.full_name as string,
      photo: (p.photo_url as string | null) ?? null,
      line: [p.user_type === "student" ? "Student" : p.graduation_year ? `Batch of ${p.graduation_year}` : "Alumni", p.branch].filter(Boolean).join(" · "),
    }));
}

/**
 * A short note thrown onto The Wall. It is a real post under the member's
 * name. A member's note waits for an admin; an admin's own note is pinned at
 * once (the database only lets admins publish wall items).
 */
export async function pinNote(text: string): Promise<"published" | "pending"> {
  const { supabase, user, isAdmin } = await actionMember();
  const body = text.trim();
  if (body.length < 3) throw fail("Write a few words first.");
  if (body.length > 240) throw fail("Keep a note under 240 characters.");
  await rateLimit(supabase, `post:${user.id}`, 15, 3600);

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, kind: "post", body })
    .select("id")
    .single();
  if (error) throw fail(error.message);

  if (isAdmin) {
    const { error: pinError } = await supabase
      .from("notice_items")
      .upsert({ source: "post", post_id: data.id, origin: "admin", status: "published", created_by: user.id }, { onConflict: "post_id" });
    if (pinError) {
      await supabase.from("posts").delete().eq("id", data.id);
      throw fail(pinError.message);
    }
    refresh(data.id);
    return "published";
  }
  const { data: status, error: suggestError } = await supabase.rpc("suggest_for_noticeboard", { p_post: data.id });
  if (suggestError) {
    // e.g. the daily suggestion limit: take the note back rather than leave a stray post.
    await supabase.from("posts").delete().eq("id", data.id);
    throw fail(suggestError.message);
  }
  refresh(data.id);
  return status === "published" ? "published" : "pending";
}

/** Offer one of your own posts for The Wall. An admin approves it. */
export async function suggestForWall(postId: string) {
  const { supabase } = await actionMember();
  const { data, error } = await supabase.rpc("suggest_for_noticeboard", { p_post: postId });
  if (error) throw fail(error.message);
  return data as string;
}
