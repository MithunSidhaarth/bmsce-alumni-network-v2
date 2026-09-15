import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import AccountManagement from "./AccountManagement";
import { createClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/url";
import type { Profile, EducationEntry } from "@/lib/types";
import MemberPhoto from "@/components/MemberPhoto";

export const metadata: Metadata = {
  title: "My profile — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !profile.onboarded) redirect("/onboarding");

  const { data: education } = await supabase
    .from("education_entries")
    .select("*")
    .eq("profile_id", user.id)
    .order("year", { ascending: false })
    .returns<EducationEntry[]>();
  const eduList = education ?? [];

  const isStudent = profile.user_type === "student";
  const detail = [profile.job_title, profile.company].filter(Boolean).join(", ");
  const meta = [
    profile.graduation_year
      ? `${isStudent ? "Class of" : "Batch of"} ${profile.graduation_year}`
      : null,
    profile.branch,
    profile.current_city,
  ]
    .filter(Boolean)
    .join(" · ");

  const banner = statusBanner(profile);

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <div className="flex items-center justify-between">
              <Eyebrow>My profile</Eyebrow>
              <Link
                href="/profile/edit"
                className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
              >
                Edit
              </Link>
            </div>

            {banner && (
              <div
                className={`mt-6 rounded-sm border px-5 py-4 ${banner.className}`}
              >
                <p className="font-sans text-sm leading-relaxed">
                  {banner.text}
                </p>
              </div>
            )}

            <div className="mt-8 flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-ivory-dim font-display text-2xl italic text-oxblood">
                {profile.photo_url ? (
                  <MemberPhoto src={profile.photo_url} />
                ) : (
                  (profile.full_name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="font-display text-3xl leading-tight text-ink">
                  {profile.full_name || "Your name"}
                </h1>
                {detail && (
                  <p className="mt-1 font-sans text-sm text-ink/70">{detail}</p>
                )}
              </div>
            </div>

            <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-gold/25 pt-8 sm:grid-cols-2">
              <Row label={isStudent ? "Student" : "Alumnus"} value={meta} />
              <Row label="Industry" value={profile.industry} />
              <Row label="LinkedIn" value={profile.linkedin_url} isLink />
              <Row
                label={isStudent ? "Looking for" : "About"}
                value={profile.bio}
                full
              />
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

            <AccountManagement userId={profile.id} />
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

function statusBanner(profile: Profile) {
  if (profile.user_type === "student") {
    return {
      className: "border-gold/40 bg-gold/10 text-ink/75",
      text: "You're set up as a current BMS student — you can browse the network and request mentorship from alumni.",
    };
  }
  switch (profile.verification_status) {
    case "verified":
      return {
        className: "border-gold/40 bg-gold/10 text-ink/75",
        text: "You're verified — your profile appears in the alumni directory.",
      };
    case "rejected":
      return {
        className: "border-oxblood/30 bg-oxblood/5 text-oxblood",
        text: profile.rejection_reason
          ? `Your profile wasn't approved: ${profile.rejection_reason}. Update your details and it'll be reviewed again.`
          : "Your profile wasn't approved. Update your details and it'll be reviewed again.",
      };
    default:
      return {
        className: "border-gold/40 bg-ivory-dim/60 text-ink/75",
        text: "Your profile is pending review. Once an admin verifies it, you'll appear in the directory.",
      };
  }
}
