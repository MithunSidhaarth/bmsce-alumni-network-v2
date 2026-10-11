"use server";

import { revalidatePath } from "next/cache";
import { actionMember } from "@/lib/me";
import { fail } from "@/lib/fail";

export async function blockMember(targetId: string, block: boolean) {
  const { supabase, user } = await actionMember();
  if (targetId === user.id) throw fail("You cannot block yourself.");
  const { error } = block
    ? await supabase.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: targetId })
    : await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
  if (error) throw fail(error.message);
  revalidatePath("/messages", "layout");
}
