"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { fail } from "@/lib/fail";

type TargetType =
  | "posting"
  | "profile"
  | "mentor"
  | "post"
  | "comment"
  | "message";

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
  if (!user) throw fail("Please sign in to report.");

  await rateLimit(supabase, `report:${user.id}`, 20, 3600);

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim() || null,
    status: "open",
  });
  if (error) throw fail(error.message);
  revalidatePath("/admin/reports");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw fail("Not authenticated.");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw fail("Not authorised.");
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
  if (error) throw fail(error.message);
  revalidatePath("/admin/reports");
}
