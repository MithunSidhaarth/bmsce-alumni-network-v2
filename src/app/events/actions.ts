"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { fail } from "@/lib/fail";

/** Toggle the current verified member's RSVP ("going") for an event. */
export async function toggleRsvp(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw fail("Please sign in to RSVP.");

  const { data: me } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .single();
  if (me?.verification_status !== "verified") {
    throw fail("Your account needs to be verified to RSVP.");
  }

  await rateLimit(supabase, `rsvp:${user.id}`, 30, 3600);

  const { data: existing } = await supabase
    .from("event_rsvps")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("profile_id", user.id);
    if (error) throw fail(error.message);
  } else {
    const { error } = await supabase
      .from("event_rsvps")
      .insert({ event_id: eventId, profile_id: user.id, status: "going" });
    if (error) throw fail(error.message);
  }
  revalidatePath("/events");
}
