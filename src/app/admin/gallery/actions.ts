"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server-side admin gate. RLS + storage policies also enforce this, but we
// re-check here so a non-admin call fails fast and clearly.
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

// The thumbnail + medium images are generated and uploaded to the public
// `gallery-photos` bucket client-side (see GalleryAdmin), which hands us
// back their public URLs. Here we just record the row.
export async function addGalleryPhoto(input: {
  imageUrl: string;
  thumbnailUrl: string;
  caption: string;
}) {
  const { supabase, user } = await requireAdmin();

  if (!input.imageUrl.trim() || !input.thumbnailUrl.trim()) {
    throw new Error("Both image sizes are required.");
  }

  const { error } = await supabase.from("gallery_photos").insert({
    image_url: input.imageUrl.trim(),
    thumbnail_url: input.thumbnailUrl.trim(),
    caption: input.caption.trim() || null,
    uploaded_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
}

export async function deleteGalleryPhoto(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
}
