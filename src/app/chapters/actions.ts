"use server";

import { revalidatePath } from "next/cache";
import { actionMember } from "@/lib/me";
import { fail } from "@/lib/fail";

// Membership rules (open vs request, who may approve) live in Postgres
// functions; these actions are thin wrappers that surface their messages.

export async function joinChapter(chapterId: string, slug: string) {
  const { supabase } = await actionMember();
  const { data, error } = await supabase.rpc("join_chapter", { p_chapter: chapterId });
  if (error) throw fail(error.message);
  revalidatePath(`/chapters/${slug}`);
  revalidatePath("/chapters");
  return data as "active" | "pending";
}

export async function leaveChapter(chapterId: string, slug: string) {
  const { supabase, user } = await actionMember();
  const { error } = await supabase
    .from("chapter_members")
    .delete()
    .eq("chapter_id", chapterId)
    .eq("profile_id", user.id);
  if (error) throw fail(error.message);
  revalidatePath(`/chapters/${slug}`);
  revalidatePath("/chapters");
}

/** Chapter leads and admins approve or decline a pending request. */
export async function reviewMember(chapterId: string, slug: string, profileId: string, approve: boolean) {
  const { supabase } = await actionMember();
  const { error } = await supabase.rpc("review_chapter_member", {
    p_chapter: chapterId,
    p_profile: profileId,
    p_approve: approve,
  });
  if (error) throw fail(error.message);
  revalidatePath(`/chapters/${slug}`);
}

/** Leads and admins can remove a member from the chapter. */
export async function removeMember(chapterId: string, slug: string, profileId: string) {
  const { supabase } = await actionMember();
  const { error } = await supabase
    .from("chapter_members")
    .delete()
    .eq("chapter_id", chapterId)
    .eq("profile_id", profileId);
  if (error) throw fail(error.message);
  revalidatePath(`/chapters/${slug}`);
}
