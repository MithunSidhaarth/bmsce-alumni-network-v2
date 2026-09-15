import Link from "next/link";
import ProfileCompletionNudge from "./ProfileCompletionNudge";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import { PostCard } from "./SocialFeed";
import {
  DirectoryIcon,
  EventsIcon,
  MentorshipIcon,
  CareersIcon,
} from "./icons";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SocialPost } from "@/lib/types";

// A plain "Welcome back" reads the same at 8am and 11pm — a time-aware
// greeting is a small, free signal that the page is actually alive.
function greeting(hour: number) {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Homepage shown to SIGNED-IN members. Deliberately contains no "Join the
 * network" pitch — that copy belongs only to the logged-out marketing home.
 */
export default async function MemberHome({
  profile,
  careersEnabled = false,
}: {
  profile: Profile;
  careersEnabled?: boolean;
}) {
  const supabase = await createClient();

  // 4 most recent Instagram highlights for the homepage teaser — mirrors the
  // query on the events page's "From our Instagram" section.
  const { data: postRows } = await supabase
    .from("social_posts")
    .select("*")
    .order("posted_at", { ascending: false })
    .limit(4)
    .returns<SocialPost[]>();
  const posts = postRows ?? [];

  const firstName = (profile.full_name ?? "").trim().split(" ")[0] || "there";
  const isStudent = profile.user_type === "student";
  const status = profile.verification_status;
  const limited = status !== "verified";
  // Existing alumni who signed up before industry/role existed get a nudge.
  const needsProfileCompletion =
    profile.user_type === "alumni" &&
    (!profile.industry || !profile.job_title);

  return (
    <>
      {/* Welcome */}
      <section>
        <div className="mx-auto max-w-7xl px-6 pb-10 pt-16 md:px-10 md:pt-24">
          <Reveal>
            <Eyebrow>
              {isStudent ? "Student" : status === "verified" ? "Member" : "Welcome"}
            </Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
              {greeting(new Date().getHours())},{" "}
              <span className="italic">{firstName}</span>.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
              {status === "verified"
                ? "Your network, your people. Here's what's happening."
                : "Here's where things stand while your profile is reviewed."}
            </p>
          </Reveal>

          {/* Verification status */}
          {limited && (
            <Reveal delay={200}>
              <StatusNotice profile={profile} careersEnabled={careersEnabled} />
            </Reveal>
          )}

          <ProfileCompletionNudge show={needsProfileCompletion} />
        </div>
      </section>

      {/* Quick links into real features */}
      <section className="border-t border-gold/30">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <Reveal>
            <h2 className="font-display text-3xl leading-[1.05] text-ink md:text-4xl">
              Jump back in.
            </h2>
          </Reveal>

          <div
            className={`mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 ${
              careersEnabled ? "lg:grid-cols-4" : ""
            }`}
          >
            <QuickLink
              index={0}
              tag="Directory"
              title="Find your people"
              body={
                limited
                  ? "Browse verified alumni once your profile is approved."
                  : "Search alumni by batch, branch, city, or company."
              }
              href="/directory"
              tone="maroon"
              Icon={DirectoryIcon}
            />
            <QuickLink
              index={1}
              tag="Events"
              title="What's coming up"
              body="Reunions and meetups, plus highlights from our Instagram."
              href="/events"
              tone="maroon"
              Icon={EventsIcon}
            />
            {careersEnabled && (
              <>
                <QuickLink
                  index={2}
                  tag="Mentorship"
                  title={isStudent ? "Find a mentor" : "Mentor someone"}
                  body={
                    isStudent
                      ? "Ask an alum a few steps ahead of you for guidance."
                      : "Offer an hour a month — you choose who you take on."
                  }
                  href={
                    isStudent
                      ? "/careers/mentorship"
                      : "/careers/mentorship/become"
                  }
                  Icon={MentorshipIcon}
                />
                <QuickLink
                  index={3}
                  tag="Careers"
                  title="Jobs & internships"
                  body="Openings shared by members — apply in a click."
                  href="/careers/jobs"
                  Icon={CareersIcon}
                />
              </>
            )}
          </div>

          <Reveal delay={200}>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              <FooterLink href="/profile">My profile</FooterLink>
              {careersEnabled && (
                <>
                  <FooterLink href="/careers/my-postings">
                    My postings &amp; applications
                  </FooterLink>
                  <FooterLink href="/careers/mentorship/requests">
                    My mentorship
                  </FooterLink>
                </>
              )}
              {profile.role === "admin" && (
                <FooterLink href="/admin">Admin dashboard</FooterLink>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* From our Instagram — teaser, full feed lives on the events page */}
      {posts.length > 0 && (
        <section className="border-t border-gold/30 bg-ivory-dim/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
            <Reveal>
              <Eyebrow>From our Instagram</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                Recent moments.
              </h2>
            </Reveal>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {posts.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-10">
                <Link
                  href="/events"
                  className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                >
                  See more on Instagram →
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}

function StatusNotice({
  profile,
  careersEnabled = false,
}: {
  profile: Profile;
  careersEnabled?: boolean;
}) {
  if (profile.verification_status === "rejected") {
    return (
      <div className="mt-10 max-w-2xl rounded-xl border border-oxblood/30 bg-oxblood/5 px-6 py-5">
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-oxblood">
          Profile not approved
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-oxblood/90">
          {profile.rejection_reason
            ? `${profile.rejection_reason} — update your details and it'll be reviewed again.`
            : "Update your details and it'll be reviewed again."}
        </p>
        <Link
          href="/profile/edit"
          className="mt-4 inline-flex items-center justify-center rounded-sm bg-oxblood px-6 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
        >
          Update my profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-2xl rounded-xl border border-gold/40 bg-gold/10 px-6 py-5">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
        Pending verification
      </p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-ink/75">
        An admin is reviewing your profile. Until it&rsquo;s approved you
        won&rsquo;t appear in the <strong>Directory</strong>
        {careersEnabled ? (
          <>
            , and <strong>Mentorship</strong> and <strong>Careers</strong> are
            limited
          </>
        ) : null}
        . Everything else is open — this usually doesn&rsquo;t take long.
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-flex items-center justify-center rounded-sm border border-gold/50 px-6 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood"
      >
        Check my profile
      </Link>
    </div>
  );
}

function QuickLink({
  index,
  tag,
  title,
  body,
  href,
  tone = "light",
  Icon,
}: {
  index: number;
  tag: string;
  title: string;
  body: string;
  href: string;
  tone?: "light" | "maroon";
  Icon: () => React.ReactElement;
}) {
  const maroon = tone === "maroon";
  return (
    <Reveal delay={index * 90} className="h-full">
      <Link
        href={href}
        className={`group block h-full rounded-2xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 md:p-8 ${
          maroon
            ? "bg-maroon hover:shadow-[0_18px_36px_-16px_rgba(113,41,60,0.5)]"
            : "border border-gold/30 bg-ivory-dim/40 hover:border-gold/60 hover:shadow-[0_18px_36px_-18px_rgba(47,37,68,0.25)]"
        }`}
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5 ${
            maroon
              ? "bg-ivory/10 text-ivory"
              : "border border-gold/40 text-oxblood group-hover:border-accent/60 group-hover:text-accent"
          }`}
        >
          <Icon />
        </span>
        <span
          className={`mt-5 block font-sans text-[11px] font-medium uppercase tracking-[0.2em] ${
            maroon ? "text-ivory/70" : "text-accent"
          }`}
        >
          {tag}
        </span>
        <h3
          className={`mt-3 font-display text-2xl italic transition-transform duration-300 group-hover:translate-x-1 ${
            maroon ? "text-ivory" : "text-ink"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-4 font-sans text-sm leading-relaxed ${
            maroon ? "text-ivory/75" : "text-ink/65"
          }`}
        >
          {body}
        </p>
        <span
          className={`mt-6 inline-block font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
            maroon
              ? "text-ivory/60 group-hover:text-ivory"
              : "text-oxblood/70 group-hover:text-oxblood"
          }`}
        >
          Open →
        </span>
      </Link>
    </Reveal>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood"
    >
      <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
        {children}
      </span>
    </Link>
  );
}
