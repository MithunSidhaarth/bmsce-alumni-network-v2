"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

// Signed-in + verified. Used for creating posts/comments/likes (RLS also
// enforces is_verified() + author = self).
async function requireVerified() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, verification_status, role")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Complete your profile first.");
  if (profile.verification_status !== "verified" && profile.role !== "admin") {
    throw new Error("Your account needs to be verified first.");
  }
  return { supabase, user };
}

// Just signed-in. Used for deletes — RLS enforces own-or-admin, so an admin can
// moderate anything and an author can remove their own content.
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in.");
  return { supabase, user };
}

export async function createPost(title: string, body: string) {
  const { supabase, user } = await requireVerified();
  const t = title.trim();
  const b = body.trim();
  if (!t) throw new Error("A title is required.");
  if (!b) throw new Error("Write something in the body.");
  if (t.length > 200) throw new Error("Keep the title under 200 characters.");
  if (b.length > 10000) throw new Error("That post is too long.");

  await rateLimit(supabase, `discussion_post:${user.id}`, 10, 3600);

  const { data, error } = await supabase
    .from("discussion_posts")
    .insert({ author_id: user.id, title: t, body: b })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/community");
  return data.id as string;
}

export async function addComment(postId: string, body: string) {
  const { supabase, user } = await requireVerified();
  const b = body.trim();
  if (!b) throw new Error("Write a comment first.");
  if (b.length > 5000) throw new Error("That comment is too long.");

  await rateLimit(supabase, `discussion_comment:${user.id}`, 30, 3600);

  const { error } = await supabase
    .from("discussion_comments")
    .insert({ post_id: postId, author_id: user.id, body: b });
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${postId}`);
}

/** Toggle the current user's like on a post. */
export async function toggleLike(postId: string) {
  const { supabase, user } = await requireVerified();

  const { data: existing } = await supabase
    .from("discussion_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("discussion_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("discussion_likes")
      .insert({ post_id: postId, user_id: user.id });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
}

/** Toggle the current user's like on a comment. */
export async function toggleCommentLike(commentId: string) {
  const { supabase, user } = await requireVerified();

  const { data: existing } = await supabase
    .from("discussion_comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("discussion_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("discussion_comment_likes")
      .insert({ comment_id: commentId, user_id: user.id });
    if (error) throw new Error(error.message);
  }

  const { data: comment } = await supabase
    .from("discussion_comments")
    .select("post_id")
    .eq("id", commentId)
    .maybeSingle();
  if (comment?.post_id) revalidatePath(`/community/${comment.post_id}`);
  revalidatePath("/community");
}

/** Delete a post — RLS allows the author or an admin (moderation). */
export async function deletePost(postId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("discussion_posts")
    .delete()
    .eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/community");
}

/** Delete a comment — RLS allows the author or an admin (moderation). */
export async function deleteComment(commentId: string, postId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("discussion_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${postId}`);
}
