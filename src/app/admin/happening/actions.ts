"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/url";

const CATEGORIES = ["Campus news", "Alumni initiative"];

// RLS also enforces admin-only writes; this fails fast with a clear error.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Not authorized");
  return { supabase, user };
}

export async function addUpdate(input: {
  title: string;
  body: string;
  category: string;
  imageUrl: string;
  linkUrl: string;
  publishedAt: string;
}) {
  const { supabase, user } = await requireAdmin();
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  if (!CATEGORIES.includes(input.category)) throw new Error("Bad category.");
  const image = input.imageUrl.trim();
  const link = input.linkUrl.trim();
  if (image && !safeUrl(image)) throw new Error("Photo must be an http(s) URL.");
  if (link && !safeUrl(link)) throw new Error("Link must be an http(s) URL.");
  const { error } = await supabase.from("campus_updates").insert({
    title,
    body: input.body.trim() || null,
    category: input.category,
    image_url: image || null,
    link_url: link || null,
    published_at: input.publishedAt
      ? new Date(input.publishedAt).toISOString()
      : new Date().toISOString(),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteUpdate(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("campus_updates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
