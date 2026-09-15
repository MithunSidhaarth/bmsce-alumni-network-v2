"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { logAdminAction } from "@/lib/audit";
import type { ApplicationStatus, PostingType, Profile } from "@/lib/types";

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
  return { supabase, profile };
}

async function requireVerified() {
  const { supabase, profile } = await currentProfile();
  if (profile.verification_status !== "verified") {
    throw new Error(
      "Your account needs to be verified before you can use the careers board."
    );
  }
  return { supabase, profile };
}

export type PostingInput = {
  title: string;
  company: string;
  type: PostingType;
  location: string;
  remote: boolean;
  description: string;
  responsibilities: string;
  skills: string[];
  experienceLevel: string;
  duration: string;
  stipendOrSalary: string;
  applicationDeadline: string;
  externalLink: string;
};

/** Create a job/internship posting. Verified members only. */
export async function createPosting(input: PostingInput) {
  const { supabase, profile } = await requireVerified();

  const title = input.title.trim();
  const company = input.company.trim();
  const description = input.description.trim();

  if (!title || !company || !description) {
    throw new Error("Title, company and description are required.");
  }
  if (input.type !== "job" && input.type !== "internship") {
    throw new Error("Pick whether this is a job or an internship.");
  }

  const { data, error } = await supabase
    .from("job_postings")
    .insert({
      posted_by: profile.id,
      title,
      company,
      type: input.type,
      location: input.location.trim() || null,
      remote: input.remote,
      description,
      responsibilities: input.responsibilities.trim() || null,
      skills_required: input.skills.length ? input.skills : null,
      experience_level: input.experienceLevel.trim() || null,
      duration: input.duration.trim() || null,
      stipend_or_salary: input.stipendOrSalary.trim() || null,
      application_deadline: input.applicationDeadline || null,
      external_link: input.externalLink.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/careers/jobs");
  revalidatePath("/careers/internships");
  revalidatePath("/careers/my-postings");
  return data.id as string;
}

/** Apply to a posting. One application per person per posting. */
export type ApplicationInput = {
  fullName: string;
  email: string;
  phone: string;
  coverNote: string;
  resumePath: string;
};

export async function applyToPosting(jobId: string, input: ApplicationInput) {
  const { supabase, profile } = await requireVerified();

  // Cap application submissions per member (spam / abuse guard).
  await rateLimit(supabase, `apply:${profile.id}`, 15, 3600);

  const fullName = input.fullName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const coverNote = input.coverNote.trim();
  const resumePath = input.resumePath.trim();

  // Server-side gate on the required fields (the client validates too).
  if (!fullName) throw new Error("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
  if (!phone) throw new Error("Phone number is required.");
  if (!coverNote) throw new Error("A cover note is required.");
  if (!resumePath) throw new Error("A resume is required.");

  const { data: posting } = await supabase
    .from("job_postings")
    .select("id, posted_by, closed_at")
    .eq("id", jobId)
    .single();

  if (!posting) throw new Error("That posting no longer exists.");
  if (posting.closed_at) {
    throw new Error("This posting is no longer accepting applications.");
  }
  if (posting.posted_by === profile.id) {
    throw new Error("You can't apply to your own posting.");
  }

  const { error } = await supabase.from("job_applications").insert({
    job_id: jobId,
    applicant_id: profile.id,
    cover_note: coverNote,
    applicant_name: fullName,
    applicant_email: email,
    applicant_phone: phone,
    resume_url: resumePath,
    status: "submitted",
  });

  if (error) {
    // 23505 = unique_violation on (job_id, applicant_id)
    if (error.code === "23505") {
      throw new Error("You've already applied to this posting.");
    }
    throw new Error(error.message);
  }

  // Save the phone back to the profile so it prefills next time.
  if (phone && phone !== profile.phone) {
    await supabase.from("profiles").update({ phone }).eq("id", profile.id);
  }

  revalidatePath(`/careers/openings/${jobId}`);
  revalidatePath("/careers/jobs");
  revalidatePath("/careers/internships");
}

/** Poster marks an application reviewed/accepted/rejected. */
export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const { supabase } = await requireVerified();

  const { data: app } = await supabase
    .from("job_applications")
    .select("id, job_id")
    .eq("id", applicationId)
    .single();

  if (!app) throw new Error("Application not found.");

  // RLS also enforces that only the posting's owner can do this.
  const { error } = await supabase
    .from("job_applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/careers/my-postings/${app.job_id}`);
  revalidatePath("/careers/my-postings");
}

/**
 * Poster removes their own posting from the careers board.
 *
 * This is a SOFT delete (sets closed_at). A hard delete would cascade into
 * job_applications and destroy applicants' records — see migration 0006.
 * RLS (job_postings_update) enforces poster-or-admin server-side; the
 * ownership check below is belt-and-braces so a non-owner fails loudly.
 */
export async function closePosting(jobId: string) {
  const { supabase, profile } = await requireVerified();

  const { data: posting } = await supabase
    .from("job_postings")
    .select("id, posted_by")
    .eq("id", jobId)
    .maybeSingle();

  if (!posting) throw new Error("That posting no longer exists.");
  if (posting.posted_by !== profile.id && profile.role !== "admin") {
    throw new Error("Only the person who posted this can remove it.");
  }

  const { error } = await supabase
    .from("job_postings")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
  await logAdminAction(supabase, "posting.delete", jobId);

  revalidatePath("/careers/my-postings");
  revalidatePath("/careers/jobs");
  revalidatePath("/careers/internships");
  revalidatePath(`/careers/openings/${jobId}`);
}

/** Put a previously removed posting back on the board. */
export async function reopenPosting(jobId: string) {
  const { supabase, profile } = await requireVerified();

  const { data: posting } = await supabase
    .from("job_postings")
    .select("id, posted_by")
    .eq("id", jobId)
    .maybeSingle();

  if (!posting) throw new Error("That posting no longer exists.");
  if (posting.posted_by !== profile.id && profile.role !== "admin") {
    throw new Error("Only the person who posted this can restore it.");
  }

  const { error } = await supabase
    .from("job_postings")
    .update({ closed_at: null })
    .eq("id", jobId);

  if (error) throw new Error(error.message);

  revalidatePath("/careers/my-postings");
  revalidatePath("/careers/jobs");
  revalidatePath("/careers/internships");
  revalidatePath(`/careers/openings/${jobId}`);
}
