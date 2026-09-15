"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import type { Profile } from "@/lib/types";

async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) throw new Error("Complete your profile first.");
  return { supabase, user, profile };
}

function parseList(raw: string) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Opt in (or update details) as a mentor. Verified alumni only. */
export async function becomeMentor(input: {
  expertise: string;
  industries: string;
  bio: string;
  availability: string;
  maxMentees: string;
}) {
  const { supabase, profile } = await currentProfile();

  if (profile.user_type !== "alumni" || profile.verification_status !== "verified") {
    throw new Error(
      "Only verified alumni can register as mentors."
    );
  }

  const max = input.maxMentees.trim() ? Number(input.maxMentees) : null;
  if (max !== null && (!Number.isFinite(max) || max < 1)) {
    throw new Error("Number of mentees must be a positive number.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_mentor: true,
      mentor_expertise: parseList(input.expertise),
      mentor_industries: parseList(input.industries),
      mentor_bio: input.bio.trim() || null,
      mentor_availability: input.availability.trim() || null,
      max_mentees: max,
    })
    .eq("id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/careers/mentorship");
  revalidatePath("/careers/mentorship/requests");
  revalidatePath("/profile");
}

/** Withdraw from the mentor list. */
export async function stopBeingMentor() {
  const { supabase, profile } = await currentProfile();
  const { error } = await supabase
    .from("profiles")
    .update({ is_mentor: false })
    .eq("id", profile.id);
  if (error) throw new Error(error.message);
  revalidatePath("/careers/mentorship");
  revalidatePath("/careers/mentorship/requests");
}

/** Mentee sends a request to a specific mentor. */
export async function sendMentorshipRequest(mentorId: string, message: string) {
  const { supabase, profile } = await currentProfile();

  if (profile.verification_status !== "verified") {
    throw new Error(
      "Your account needs to be verified before you can request mentorship."
    );
  }
  if (mentorId === profile.id) {
    throw new Error("You can't request mentorship from yourself.");
  }

  // Cap mentorship requests per member (spam / abuse guard).
  await rateLimit(supabase, `mentorship:${profile.id}`, 15, 3600);

  // Target must actually be an opted-in, verified alumni mentor.
  const { data: mentor } = await supabase
    .from("profiles")
    .select("id, is_mentor, user_type, verification_status")
    .eq("id", mentorId)
    .single();

  if (
    !mentor ||
    !mentor.is_mentor ||
    mentor.user_type !== "alumni" ||
    mentor.verification_status !== "verified"
  ) {
    throw new Error("That mentor isn't available.");
  }

  // Don't allow duplicate open requests to the same mentor.
  const { data: existing } = await supabase
    .from("mentorship_requests")
    .select("id, status")
    .eq("mentee_id", profile.id)
    .eq("mentor_id", mentorId)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existing) {
    throw new Error(
      existing.status === "accepted"
        ? "This mentor has already accepted you."
        : "You already have a pending request with this mentor."
    );
  }

  const { error } = await supabase.from("mentorship_requests").insert({
    mentee_id: profile.id,
    mentor_id: mentorId,
    message: message.trim() || null,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/careers/mentorship");
  revalidatePath("/careers/mentorship/requests");
}

/** Mentor accepts or declines a request sent to them. */
export async function respondToRequest(
  requestId: string,
  decision: "accepted" | "declined"
) {
  const { supabase, profile } = await currentProfile();

  const { data: req } = await supabase
    .from("mentorship_requests")
    .select("id, mentor_id, status")
    .eq("id", requestId)
    .single();

  if (!req) throw new Error("Request not found.");
  if (req.mentor_id !== profile.id) {
    throw new Error("Only the mentor can respond to this request.");
  }

  // Enforce the mentor's stated cap on concurrent mentees.
  if (decision === "accepted" && profile.max_mentees != null) {
    const { count } = await supabase
      .from("mentorship_requests")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", profile.id)
      .eq("status", "accepted");

    if ((count ?? 0) >= profile.max_mentees) {
      throw new Error(
        `You've reached your limit of ${profile.max_mentees} mentee(s). Decline or free up a spot first.`
      );
    }
  }

  const { error } = await supabase
    .from("mentorship_requests")
    .update({ status: decision })
    .eq("id", requestId);

  if (error) throw new Error(error.message);
  revalidatePath("/careers/mentorship/requests");
  revalidatePath("/careers/mentorship");
}
