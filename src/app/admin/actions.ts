"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/audit";
import type { VerificationStatus } from "@/lib/types";

// Maps a verification outcome to its audit-log action label.
const STATUS_ACTION: Record<VerificationStatus, string> = {
  verified: "member.verify",
  rejected: "member.reject",
  unverified: "member.unverify",
};

// Server-side admin gate. RLS + the DB guard trigger also enforce this, but we
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
  return supabase;
}

async function setStatus(
  id: string,
  status: VerificationStatus,
  reason: string | null
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ verification_status: status, rejection_reason: reason })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminAction(supabase, STATUS_ACTION[status], id);
  revalidatePath("/admin");
  revalidatePath("/directory");
}

export async function approveMember(id: string) {
  await setStatus(id, "verified", null);
}

export async function rejectMember(id: string, reason: string) {
  await setStatus(id, "rejected", reason.trim() || null);
}

export async function resetMemberToPending(id: string) {
  await setStatus(id, "unverified", null);
}

// --- Site settings --------------------------------------------------------

/** Turn the whole Careers section on/off site-wide. Admin only. */
export async function setCareersEnabled(enabled: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("site_settings")
    .update({ careers_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  await logAdminAction(
    supabase,
    "careers.toggle",
    enabled ? "enabled" : "disabled"
  );

  // Careers visibility touches the nav, homepage and the careers routes.
  revalidatePath("/", "layout");
}

// --- Social posts ---------------------------------------------------------

export async function addSocialPost(input: {
  caption: string;
  imageUrl: string;
  permalink: string;
  hashtags?: string;
}) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tags = (input.hashtags ?? "")
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);

  const { error } = await supabase.from("social_posts").insert({
    caption: input.caption.trim() || null,
    image_url: input.imageUrl.trim() || null,
    permalink: input.permalink.trim() || null,
    hashtags: tags.length ? tags : null,
    post_type: "Manual",
    posted_at: new Date().toISOString(),
    added_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/social");
  revalidatePath("/events");
}

export async function deleteSocialPost(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("social_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/social");
  revalidatePath("/events");
}

// --- Newsletters ----------------------------------------------------------
// The PDF is uploaded to the public `newsletters` storage bucket client-side
// (see NewsletterAdmin), which hands us back its public URL. Here we just
// record the row. Admin-only, re-checked by requireAdmin + RLS.

export async function addNewsletter(input: {
  year: number;
  title: string;
  pdfUrl: string;
}) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!Number.isInteger(input.year)) throw new Error("A valid year is required.");
  if (!input.pdfUrl.trim()) throw new Error("A PDF is required.");

  const { error } = await supabase.from("newsletters").insert({
    year: input.year,
    title: input.title.trim() || null,
    pdf_url: input.pdfUrl.trim(),
    uploaded_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletters");
  revalidatePath("/newsletter");
}

export async function deleteNewsletter(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("newsletters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletters");
  revalidatePath("/newsletter");
}
