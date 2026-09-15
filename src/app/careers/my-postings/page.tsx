import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { STATUS_LABEL } from "@/components/PostingsBrowser";
import DeletePostingButton from "@/components/DeletePostingButton";
import { createClient } from "@/lib/supabase/server";
import type {
  JobApplication,
  JobPosting,
  Profile,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "My Postings — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function MyPostingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!me || !me.onboarded) redirect("/onboarding");

  // Postings I created
  const { data: mine } = await supabase
    .from("job_postings")
    .select("*")
    .eq("posted_by", me.id)
    .order("created_at", { ascending: false })
    .returns<JobPosting[]>();

  const postings = mine ?? [];

  // Applicant counts for my postings (RLS lets the owner read these).
  const countByJob = new Map<string, number>();
  const newByJob = new Map<string, number>();
  if (postings.length) {
    const { data: apps } = await supabase
      .from("job_applications")
      .select("job_id, status")
      .in(
        "job_id",
        postings.map((p) => p.id)
      )
      .returns<Pick<JobApplication, "job_id" | "status">[]>();
    for (const a of apps ?? []) {
      countByJob.set(a.job_id, (countByJob.get(a.job_id) ?? 0) + 1);
      if (a.status === "submitted")
        newByJob.set(a.job_id, (newByJob.get(a.job_id) ?? 0) + 1);
    }
  }

  // Applications I've sent
  const { data: sent } = await supabase
    .from("job_applications")
    .select("*")
    .eq("applicant_id", me.id)
    .order("created_at", { ascending: false })
    .returns<JobApplication[]>();

  const sentApps = sent ?? [];
  const jobById = new Map<string, JobPosting>();
  if (sentApps.length) {
    const { data: jobs } = await supabase
      .from("job_postings")
      .select("*")
      .in(
        "id",
        sentApps.map((a) => a.job_id)
      )
      .returns<JobPosting[]>();
    for (const j of jobs ?? []) jobById.set(j.id, j);
  }

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <div className="flex items-center justify-between">
              <Eyebrow>Careers</Eyebrow>
              <Link
                href="/careers/post"
                className="rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
              >
                Post an opening
              </Link>
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
              My postings.
            </h1>

            {/* Postings I made */}
            <section className="mt-12">
              <h2 className="font-display text-2xl text-ink md:text-3xl">
                Openings I posted
              </h2>
              {postings.length === 0 ? (
                <Empty text="You haven't posted anything yet." />
              ) : (
                <ul className="mt-6 flex flex-col gap-4">
                  {postings.map((p) => {
                    const total = countByJob.get(p.id) ?? 0;
                    const fresh = newByJob.get(p.id) ?? 0;
                    return (
                      <li
                        key={p.id}
                        className="rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-gold/40 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-oxblood/80">
                                {p.type === "job" ? "Job" : "Internship"}
                              </span>
                              {p.closed_at && (
                                <span className="rounded-full border border-ink/25 bg-ink/5 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-ink/55">
                                  Removed from board
                                </span>
                              )}
                            </div>
                            <h3 className="mt-3 font-display text-xl text-ink">
                              {p.title}
                            </h3>
                            <p className="mt-1 font-sans text-sm text-ink/65">
                              {p.company}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-5">
                            <div className="text-right">
                              <p className="font-display text-2xl text-oxblood">
                                {total}
                              </p>
                              <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-ink/50">
                                {total === 1 ? "applicant" : "applicants"}
                                {fresh > 0 ? ` · ${fresh} new` : ""}
                              </p>
                            </div>
                            <Link
                              href={`/careers/my-postings/${p.id}`}
                              className="rounded-sm border border-gold/50 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood"
                            >
                              Review
                            </Link>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-gold/20 pt-4">
                          <DeletePostingButton
                            jobId={p.id}
                            closed={!!p.closed_at}
                            size="small"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Applications I sent */}
            <section className="mt-16">
              <h2 className="font-display text-2xl text-ink md:text-3xl">
                My applications
              </h2>
              {sentApps.length === 0 ? (
                <Empty text="You haven't applied to anything yet." />
              ) : (
                <ul className="mt-6 flex flex-col gap-3">
                  {sentApps.map((a) => {
                    const job = jobById.get(a.job_id);
                    return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-ivory-dim/50 p-5"
                      >
                        <div>
                          <Link
                            href={`/careers/openings/${a.job_id}`}
                            className="font-display text-lg text-ink underline decoration-accent/0 underline-offset-4 hover:decoration-accent"
                          >
                            {job?.title ?? "Opening"}
                          </Link>
                          <p className="mt-0.5 font-sans text-sm text-ink/60">
                            {job?.company}
                          </p>
                        </div>
                        <span className="rounded-lg border border-gold/40 bg-ivory/60 px-3 py-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-ink/65">
                          {STATUS_LABEL[a.status]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-14 text-center">
      <p className="font-display text-xl italic text-ink">{text}</p>
    </div>
  );
}
