import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import ApplicantsClient, { type ApplicantRow } from "./ApplicantsClient";
import { createClient } from "@/lib/supabase/server";
import type { JobApplication, JobPosting, Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Applicants — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function PostingApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: posting } = await supabase
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .maybeSingle<JobPosting>();

  if (!posting) notFound();
  // Only the poster (or an admin) reviews applicants.
  if (posting.posted_by !== user.id) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (me?.role !== "admin") redirect("/careers/my-postings");
  }

  const { data: apps } = await supabase
    .from("job_applications")
    .select("*")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .returns<JobApplication[]>();

  const applications = apps ?? [];

  // Applicant profiles (visible via shares_application_with).
  const peopleById = new Map<string, Profile>();
  if (applications.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("*")
      .in(
        "id",
        applications.map((a) => a.applicant_id)
      )
      .returns<Profile[]>();
    for (const p of people ?? []) peopleById.set(p.id, p);
  }

  // Signed, time-limited download links for each resume. RLS lets the poster
  // read resumes submitted to their own postings.
  const resumeUrlById = new Map<string, string>();
  await Promise.all(
    applications
      .filter((a) => a.resume_url)
      .map(async (a) => {
        const { data } = await supabase.storage
          .from("resumes")
          .createSignedUrl(a.resume_url as string, 3600);
        if (data?.signedUrl) resumeUrlById.set(a.id, data.signedUrl);
      })
  );

  const rows: ApplicantRow[] = applications.map((a) => {
    const p = peopleById.get(a.applicant_id);
    return {
      applicationId: a.id,
      status: a.status,
      coverNote: a.cover_note,
      appliedAt: a.created_at,
      email: a.applicant_email ?? null,
      phone: a.applicant_phone ?? null,
      resumeUrl: resumeUrlById.get(a.id) ?? null,
      person: {
        id: a.applicant_id,
        // Prefer the name submitted on the application; fall back to profile.
        name: a.applicant_name ?? p?.full_name ?? "BMS member",
        photoUrl: p?.photo_url ?? null,
        branch: p?.branch ?? null,
        gradYear: p?.graduation_year ?? null,
        title: p?.job_title ?? null,
        company: p?.company ?? null,
        userType: p?.user_type ?? null,
      },
    };
  });

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <div className="flex items-center justify-between">
              <Eyebrow>Applicants</Eyebrow>
              <Link
                href="/careers/my-postings"
                className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
              >
                ← My postings
              </Link>
            </div>

            <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05] tracking-tight text-ink">
              {posting.title}
            </h1>
            <p className="mt-2 font-sans text-base text-ink/70">
              {posting.company} ·{" "}
              {posting.type === "job" ? "Job" : "Internship"} ·{" "}
              {applications.length}{" "}
              {applications.length === 1 ? "applicant" : "applicants"}
            </p>
            <Link
              href={`/careers/openings/${posting.id}`}
              className="mt-2 inline-block font-sans text-[12px] uppercase tracking-[0.12em] text-oxblood/70 underline decoration-accent underline-offset-4 hover:text-oxblood"
            >
              View public posting →
            </Link>

            <div className="mt-10">
              <ApplicantsClient applicants={rows} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
