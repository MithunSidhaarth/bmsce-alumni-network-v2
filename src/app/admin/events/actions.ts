"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in.");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Not authorized.");
  return { supabase, user };
}

export type EventInput = {
  title: string;
  description: string;
  eventDate: string; // ISO string
  location: string;
  country: string;
  state: string;
  coverImageUrl: string;
  rsvpUrl: string;
};

function validate(input: EventInput) {
  const title = input.title.trim();
  if (!title) throw new Error("A title is required.");
  if (!input.eventDate) throw new Error("A date and time is required.");
  const d = new Date(input.eventDate);
  if (isNaN(d.getTime())) throw new Error("That date doesn't look valid.");
  return {
    title,
    description: input.description.trim() || null,
    event_date: d.toISOString(),
    location: input.location.trim() || null,
    country: input.country.trim() || null,
    state: input.state.trim() || null,
    cover_image_url: input.coverImageUrl.trim() || null,
    rsvp_url: input.rsvpUrl.trim() || null,
  };
}

export async function createEvent(input: EventInput) {
  const { supabase, user } = await requireAdmin();
  const row = validate(input);
  const { data, error } = await supabase
    .from("events")
    .insert({ ...row, created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return data.id as string;
}

export async function updateEvent(id: string, input: EventInput) {
  const { supabase } = await requireAdmin();
  const row = validate(input);
  const { error } = await supabase.from("events").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
}
