"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type TargetType =
  | "posting"
  | "profile"
  | "mentor"
  | "discussion_post"
  | "discussion_comment";

/** Any signed-in member can flag content for admin review. */
export async function reportContent(
  targetType: TargetType,
  targetId: string,
  reason: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to report.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim() || null,
    status: "open",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reports");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Not authorized.");
  return supabase;
}

/** Admin marks a report resolved or dismissed. */
export async function setReportStatus(
  id: string,
  status: "resolved" | "dismissed"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reports");
}
