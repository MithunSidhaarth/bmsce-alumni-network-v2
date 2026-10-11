"use server";

import { revalidatePath } from "next/cache";
import { getMe } from "@/lib/me";

export async function markAllRead() {
  const { supabase, user } = await getMe();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
}
