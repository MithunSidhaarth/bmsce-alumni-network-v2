import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import ApplyBox from "./ApplyBox";
import DeletePostingButton from "@/components/DeletePostingButton";
import ReportButton from "@/components/ReportButton";
import { createClient } from "@/lib/supabase/server";
import type { JobApplication, JobPosting, Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Opening — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function OpeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let me: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();
    me = data ?? null;
  }

  const { data: posting } = await supabase
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .maybeSingle<JobPosting>();

  // RLS hides postings from unverified/signed-out viewers.
  if (!posting) {
    if (!user || me?.verification_status !== "verified") {
      return (
        <>
          <Nav />
          <main>
            <div className="mx-auto max-w-2xl px-6 py-32 text-center">
              <Eyebrow align="center">Careers</Eyebrow>
              <h1 className="mt-6 font-display text-3xl text-ink">
                Sign in to view this opening.
              </h1>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
              >
                Sign in
              </Link>
            </div>
          </main>
          <Footer />
        </>
      );
    }
    notFound();
  }

  let poster: { full_name: string | null } | null = null;
  if (posting.posted_by) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", posting.posted_by)
      .maybeSingle();
    poster = data as { full_name: string | null } | null;
  }

  let existing: JobApplication | null = null;
  if (me) {
    const { data } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_id", id)
      .eq("applicant_id", me.id)
      .maybeSingle<JobApplication>();
    existing = data ?? null;
  }

  const isOwnerOrAdmin =
    !!me && (posting.posted_by === me.id || me.role === "admin");

  const state = !user
    ? ({ kind: "anon" } as const)
    : me?.verification_status !== "verified"
    ? ({ kind: "unverified" } as const)
    : posting.posted_by === me?.id
    ? ({ kind: "owner" } as const)
    : existing
    ? ({ kind: "applied", status: existing.status } as const)
    : ({ kind: "can-apply" } as const);

  const place = posting.remote
    ? posting.location
      ? `${posting.location} · Remote`
      : "Remote"
    : posting.location ?? null;

  const deadline = posting.application_deadline
    ? new Date(posting.application_deadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <Link
              href={posting.type === "job" ? "/careers/jobs" : "/careers/internships"}
              className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
            >
              ← Back to openings
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-gold/40 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-oxblood/80">
                {posting.type === "job" ? "Job" : "Internship"}
              </span>
              {posting.closed_at && (
                <span className="rounded-full border border-ink/25 bg-ink/5 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-ink/55">
                  Removed from board
                </span>
              )}
              {posting.experience_level && (
                <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-ink/50">
                  {posting.experience_level}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight text-ink">
              {posting.title}
            </h1>
            <p className="mt-3 font-sans text-lg text-ink/75">
              {posting.company}
              {place ? ` · ${place}` : ""}
            </p>
            {poster?.full_name && (
              <p className="mt-1 font-sans text-sm text-ink/50">
                Posted by {poster.full_name}
              </p>
            )}

            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
              {/* Details */}
              <div>
                <Block title="About this role" body={posting.description} />
                {posting.responsibilities && (
                  <Block
                    title="Responsibilities"
                    body={posting.responsibilities}
                  />
                )}

                {(posting.skills_required ?? []).length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60">
                      Skills
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(posting.skills_required ?? []).map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-gold/40 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-oxblood/80"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-5 border-t border-gold/25 pt-8 sm:grid-cols-2">
                  <Fact label="Duration" value={posting.duration} />
                  <Fact
                    label="Stipend / salary"
                    value={posting.stipend_or_salary}
                  />
                  <Fact label="Apply by" value={deadline} />
                  <Fact label="Location" value={place} />
                </dl>
              </div>

              {/* Apply */}
              <div className="lg:sticky lg:top-28 lg:self-start">
                <ApplyBox
                  jobId={posting.id}
                  userId={me?.id ?? ""}
                  state={state}
                  prefill={{
                    fullName: me?.full_name ?? "",
                    email: user?.email ?? "",
                    phone: me?.phone ?? "",
                    linkedin: me?.linkedin_url ?? "",
                  }}
                  externalLink={posting.external_link}
                />

                {/* Owner-only (or admin) delete. RLS enforces this too. */}
                {isOwnerOrAdmin && (
                  <div className="mt-4">
                    <DeletePostingButton
                      jobId={posting.id}
                      closed={!!posting.closed_at}
                      redirectTo="/careers/my-postings"
                    />
                  </div>
                )}

                {/* Anyone signed in but the owner can flag it. */}
                {user && !isOwnerOrAdmin && (
                  <div className="mt-4">
                    <ReportButton targetType="posting" targetId={posting.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8">
      <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60">
        {title}
      </h2>
      <p className="mt-3 whitespace-pre-line font-sans text-base leading-relaxed text-ink/80">
        {body}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/50">
        {label}
      </dt>
      <dd className="mt-1 font-sans text-sm text-ink/80">{value}</dd>
    </div>
  );
}
