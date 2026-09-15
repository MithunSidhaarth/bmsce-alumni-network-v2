"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Toggle the current verified member's RSVP ("going") for an event. */
export async function toggleRsvp(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to RSVP.");

  const { data: me } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .single();
  if (me?.verification_status !== "verified") {
    throw new Error("Your account needs to be verified to RSVP.");
  }

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
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("event_rsvps")
      .insert({ event_id: eventId, profile_id: user.id, status: "going" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/events");
}
