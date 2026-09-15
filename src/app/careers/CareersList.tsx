import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import CareersTabs from "@/components/CareersTabs";
import PostingsBrowser, {
  type PostingCard,
} from "@/components/PostingsBrowser";
import { createClient } from "@/lib/supabase/server";
import type {
  ApplicationStatus,
  JobApplication,
  JobPosting,
  PostingType,
  Profile,
} from "@/lib/types";

/**
 * Shared Careers listing page. `initialType` just pre-selects the type filter —
 * the underlying list is every posting the viewer is allowed to see.
 */
export default async function CareersList({
  initialType,
  heading,
  intro,
}: {
  initialType: PostingType;
  heading: string;
  intro: string;
}) {
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

  const verified = me?.verification_status === "verified";

  let postings: PostingCard[] = [];
  const myApplications: Record<string, ApplicationStatus> = {};

  if (verified) {
    const { data: rows } = await supabase
      .from("job_postings")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<JobPosting[]>();

    // Deleted (closed) postings never appear on the public board. Filtered here
    // rather than in SQL so the board still works if migration 0006 (which adds
    // closed_at) hasn't been run yet — an absent column is simply undefined.
    const list = (rows ?? []).filter((p) => !p.closed_at);

    // Poster names (verified alumni are readable; fall back gracefully).
    const posterIds = [
      ...new Set(list.map((p) => p.posted_by).filter(Boolean)),
    ] as string[];
    const nameById = new Map<string, string>();
    if (posterIds.length) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", posterIds);
      for (const p of people ?? [])
        nameById.set(p.id as string, (p.full_name as string) ?? "");
    }

    postings = list.map((p) => ({
      ...p,
      posterName: p.posted_by ? nameById.get(p.posted_by) ?? null : null,
    }));

    const { data: apps } = await supabase
      .from("job_applications")
      .select("job_id, status")
      .eq("applicant_id", me!.id)
      .returns<Pick<JobApplication, "job_id" | "status">[]>();
    for (const a of apps ?? []) myApplications[a.job_id] = a.status;
  }

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-16 md:px-10 md:pb-8 md:pt-24">
            <Reveal>
              <Eyebrow>Careers</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                {heading}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                {intro}
              </p>
            </Reveal>
            {verified && (
              <Reveal delay={200}>
                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <Link
                    href="/careers/post"
                    className="inline-flex items-center justify-center rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                  >
                    Post an opening
                  </Link>
                  <Link
                    href="/careers/my-postings"
                    className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                  >
                    My postings &amp; applications →
                  </Link>
                </div>
              </Reveal>
            )}
            <Reveal delay={240}>
              <CareersTabs />
            </Reveal>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            {!user ? (
              <Gate
                title="Sign in to see openings."
                body="The careers board is for members of the network."
                cta="Sign in"
                href="/login"
              />
            ) : !verified ? (
              <Gate
                title="Your account is pending verification."
                body="Once an admin verifies your profile, you'll be able to browse and post openings."
                cta="View my profile"
                href="/profile"
              />
            ) : (
              <PostingsBrowser
                postings={postings}
                initialType={initialType}
                myApplications={myApplications}
                canPost={verified}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Gate({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-20 text-center">
      <p className="font-display text-2xl italic text-ink">{title}</p>
      <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
        {body}
      </p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
      >
        {cta}
      </Link>
    </div>
  );
}
