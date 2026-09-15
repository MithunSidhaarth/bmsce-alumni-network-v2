import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import ReportButton from "@/components/ReportButton";
import { createClient } from "@/lib/supabase/server";
import { getCareersEnabled } from "@/lib/settings";
import { safeUrl } from "@/lib/url";
import type { Profile, EducationEntry } from "@/lib/types";
import MemberPhoto from "@/components/MemberPhoto";

export const metadata: Metadata = {
  title: "Profile — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function DirectoryProfilePage({
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

  if (id === user.id) redirect("/profile");

  // Mentorship lives under /careers, so its surfaces stay hidden while Careers
  // is gated off — even on a profile that happens to be flagged as a mentor.
  const careersEnabled = await getCareersEnabled();

  // RLS decides visibility: verified alumni, or someone connected via a
  // mentorship request / job application.
  const { data: p } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();

  if (!p) {
    return (
      <>
        <Nav />
        <main>
          <div className="mx-auto max-w-2xl px-6 py-32 text-center">
            <Eyebrow align="center">Directory</Eyebrow>
            <h1 className="mt-6 font-display text-3xl text-ink">
              This profile isn&rsquo;t visible to you.
            </h1>
            <p className="mt-4 font-sans text-base text-ink/70">
              Only verified alumni profiles are listed publicly in the network.
            </p>
            <Link
              href="/directory"
              className="mt-8 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
            >
              Back to directory
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isStudent = p.user_type === "student";
  const role = [p.job_title, p.company].filter(Boolean).join(", ");
  const meta = [
    p.graduation_year
      ? `${isStudent ? "Class of" : "Batch of"} ${p.graduation_year}`
      : null,
    p.branch,
    p.current_city,
  ]
    .filter(Boolean)
    .join(" · ");

  const { data: educationData } = await supabase
    .from("education_entries")
    .select("*")
    .eq("profile_id", id)
    .order("year", { ascending: false })
    .returns<EducationEntry[]>();
  const eduList = educationData ?? [];

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <Link
              href="/directory"
              className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
            >
              ← Directory
            </Link>

            <div className="mt-8 flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-ivory-dim font-display text-2xl italic text-oxblood">
                {p.photo_url ? (
                  <MemberPhoto src={p.photo_url} />
                ) : (
                  (p.full_name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="font-display text-3xl leading-tight text-ink">
                  {p.full_name || "BMS member"}
                </h1>
                {role && (
                  <p className="mt-1 font-sans text-sm text-ink/70">{role}</p>
                )}
                {isStudent && (
                  <span className="mt-2 inline-block rounded-full border border-gold/40 px-3 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
                    Current student
                  </span>
                )}
              </div>
            </div>

            <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-gold/25 pt-8 sm:grid-cols-2">
              <Row label={isStudent ? "Student" : "Alumnus"} value={meta} />
              <Row label="Industry" value={p.industry} />
              <Row label="LinkedIn" value={p.linkedin_url} isLink />
              <Row label="About" value={p.bio} full />
              {p.is_mentor && careersEnabled && (
                <Row
                  label="Mentoring"
                  value={p.mentor_bio ?? "Available as a mentor"}
                  full
                />
              )}
            </dl>

            {eduList.length > 0 && (
              <div className="mt-8 border-t border-gold/25 pt-8">
                <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/50">
                  Higher education
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {eduList.map((e) => (
                    <li key={e.id} className="font-sans text-sm text-ink/80">
                      <span className="font-medium text-ink">{e.degree}</span>
                      {e.institution ? `, ${e.institution}` : ""}
                      {e.year ? (
                        <span className="text-ink/50"> · {e.year}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.is_mentor && careersEnabled && (
              <div className="mt-10">
                <Link
                  href="/careers/mentorship"
                  className="inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                >
                  Request mentorship
                </Link>
              </div>
            )}

            <div className="mt-12 border-t border-gold/20 pt-6">
              <ReportButton
                targetType={p.is_mentor ? "mentor" : "profile"}
                targetId={p.id}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Row({
  label,
  value,
  isLink,
  full,
}: {
  label: string;
  value: string | null;
  isLink?: boolean;
  full?: boolean;
}) {
  if (!value) return null;
  const href = isLink ? safeUrl(value) : null;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/50">
        {label}
      </dt>
      <dd className="mt-1.5 font-sans text-sm leading-relaxed text-ink/80">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-oxblood underline decoration-accent underline-offset-2"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
