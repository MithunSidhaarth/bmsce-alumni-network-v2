import Link from "next/link";
import ProfileCompletionNudge from "./ProfileCompletionNudge";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import Aurora from "./Aurora";
import SpotlightCard from "./SpotlightCard";
import EventCountdown from "./EventCountdown";
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

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

type UpcomingEvent = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
};

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

  const [{ data: postRows }, { data: eventRows }] = await Promise.all([
    // 4 most recent Instagram highlights for the homepage teaser — mirrors
    // the query on the events page's "From our Instagram" section.
    supabase
      .from("social_posts")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(4)
      .returns<SocialPost[]>(),
    // The single nearest upcoming event, if any — powers the featured
    // countdown tile below.
    supabase
      .from("events")
      .select("id, title, event_date, location")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(1)
      .returns<UpcomingEvent[]>(),
  ]);
  const posts = postRows ?? [];
  const nextEvent = eventRows?.[0] ?? null;

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
      <section className="relative overflow-hidden">
        <Aurora />
        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-16 md:px-10 md:pt-24">
          <Reveal>
            <Eyebrow>
              {isStudent ? "Student" : status === "verified" ? "Member" : "Welcome"}
            </Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
              {greeting(new Date().getHours())},{" "}
              <span className="bg-gradient-to-r from-oxblood via-maroon to-accent bg-clip-text italic text-transparent">
                {firstName}
              </span>
              .
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
              {status === "verified"
                ? "Your network, your people. Here's what's happening."
                : "Here's where things stand while your profile is reviewed."}
            </p>
          </Reveal>

          {/* Identity strip — a quiet personal touch, not a form. */}
          <Reveal delay={200}>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
              <span>Member since {memberSince(profile.created_at)}</span>
              {profile.graduation_year && (
                <>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                  <span>Batch of {profile.graduation_year}</span>
                </>
              )}
              {profile.current_city && (
                <>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                  <span>{profile.current_city}</span>
                </>
              )}
            </div>
          </Reveal>

          {/* Verification status */}
          {limited && (
            <Reveal delay={240}>
              <StatusNotice profile={profile} careersEnabled={careersEnabled} />
            </Reveal>
          )}

          <ProfileCompletionNudge show={needsProfileCompletion} />
        </div>
      </section>

      {/* Quick links into real features — a bento mosaic instead of a flat
          grid, with a live-ticking countdown as the anchor tile whenever
          there's an event on the calendar. */}
      <section className="border-t border-gold/30">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <Reveal>
            <h2 className="font-display text-3xl leading-[1.05] text-ink md:text-4xl">
              Jump back in.
            </h2>
          </Reveal>

          <div className="mt-10 grid auto-rows-[150px] grid-cols-2 gap-5 sm:auto-rows-[170px] sm:grid-cols-4">
            {nextEvent && (
              <Reveal
                delay={0}
                className="col-span-2 row-span-2 sm:col-span-2 sm:row-span-2"
              >
                <SpotlightCard
                  glow="rgba(255,255,255,0.18)"
                  className="h-full rounded-2xl bg-gradient-to-br from-oxblood to-maroon p-6 shadow-[0_18px_36px_-16px_rgba(47,37,68,0.5)] md:p-8"
                >
                  <Link href="/events" className="flex h-full flex-col justify-between">
                    <div>
                      <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ivory/70">
                        Next up
                      </span>
                      <h3 className="mt-2 font-display text-2xl italic text-ivory md:text-3xl">
                        {nextEvent.title}
                      </h3>
                      {nextEvent.location && (
                        <p className="mt-1 font-sans text-sm text-ivory/70">
                          {nextEvent.location}
                        </p>
                      )}
                    </div>
                    <EventCountdown dateIso={nextEvent.event_date} />
                  </Link>
                </SpotlightCard>
              </Reveal>
            )}

            <QuickLink
              index={1}
              tag="Directory"
              title="Find your people"
              body={
                limited
                  ? "Browse verified alumni once your profile is approved."
                  : "Search alumni by batch, branch, city, or company."
              }
              href="/directory"
              tone="light"
              Icon={DirectoryIcon}
              span={nextEvent ? "1" : "wide"}
            />
            {!nextEvent && (
              <QuickLink
                index={2}
                tag="Events"
                title="What's coming up"
                body="Reunions and meetups, plus highlights from our Instagram."
                href="/events"
                tone="maroon"
                Icon={EventsIcon}
                span="1"
              />
            )}
            {careersEnabled && (
              <>
                <QuickLink
                  index={3}
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
                  tone="light"
                  Icon={MentorshipIcon}
                  span="1"
                />
                <QuickLink
                  index={4}
                  tag="Careers"
                  title="Jobs & internships"
                  body="Openings shared by members — apply in a click."
                  href="/careers/jobs"
                  tone="light"
                  Icon={CareersIcon}
                  span="1"
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
  span = "1",
}: {
  index: number;
  tag: string;
  title: string;
  body: string;
  href: string;
  tone?: "light" | "maroon";
  Icon: () => React.ReactElement;
  span?: "1" | "wide";
}) {
  const maroon = tone === "maroon";
  return (
    <Reveal
      delay={index * 90}
      className={span === "wide" ? "col-span-2 row-span-1" : "col-span-1 row-span-1"}
    >
      <SpotlightCard
        glow={maroon ? "rgba(255,255,255,0.14)" : "rgba(47,37,68,0.08)"}
        className={`h-full rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 ${
          maroon
            ? "bg-maroon hover:shadow-[0_18px_36px_-16px_rgba(113,41,60,0.5)]"
            : "border border-gold/30 bg-ivory-dim/40 hover:border-gold/60 hover:shadow-[0_18px_36px_-18px_rgba(47,37,68,0.25)]"
        }`}
      >
        <Link href={href} className="group flex h-full flex-col p-6 md:p-7">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5 ${
              maroon
                ? "bg-ivory/10 text-ivory"
                : "border border-gold/40 text-oxblood group-hover:border-accent/60 group-hover:text-accent"
            }`}
          >
            <Icon />
          </span>
          <span
            className={`mt-4 block font-sans text-[11px] font-medium uppercase tracking-[0.2em] ${
              maroon ? "text-ivory/70" : "text-accent"
            }`}
          >
            {tag}
          </span>
          <h3
            className={`mt-2 font-display text-xl italic transition-transform duration-300 group-hover:translate-x-1 ${
              maroon ? "text-ivory" : "text-ink"
            }`}
          >
            {title}
          </h3>
          <p
            className={`mt-2 line-clamp-2 font-sans text-sm leading-relaxed ${
              maroon ? "text-ivory/75" : "text-ink/65"
            }`}
          >
            {body}
          </p>
          <span
            className={`mt-auto pt-3 font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
              maroon
                ? "text-ivory/60 group-hover:text-ivory"
                : "text-oxblood/70 group-hover:text-oxblood"
            }`}
          >
            Open →
          </span>
        </Link>
      </SpotlightCard>
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
