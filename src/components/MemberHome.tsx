import Link from "next/link";
import ProfileCompletionNudge from "./ProfileCompletionNudge";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import SpotlightCard from "./SpotlightCard";
import EventCountdown from "./EventCountdown";
import CountUp from "./CountUp";
import { PostCard } from "./SocialFeed";
import {
  DirectoryIcon,
  EventsIcon,
  MentorshipIcon,
  CareersIcon,
} from "./icons";
import { createClient } from "@/lib/supabase/server";
import type { JobPosting, Profile, SocialPost } from "@/lib/types";

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

type DiscussionTeaser = {
  id: string;
  title: string;
  created_at: string;
  author: { full_name: string | null } | { full_name: string | null }[] | null;
  comments: { count: number }[] | null;
};

// Exact set of Profile columns this page reads — kept in sync with the
// query in app/page.tsx so that page can select() just these instead of "*".
export type MemberHomeProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "user_type"
  | "role"
  | "verification_status"
  | "rejection_reason"
  | "industry"
  | "job_title"
  | "graduation_year"
  | "current_city"
  | "onboarded"
  | "created_at"
>;

/**
 * Homepage shown to SIGNED-IN members. Deliberately contains no "Join the
 * network" pitch — that copy belongs only to the logged-out marketing home.
 */
export default async function MemberHome({
  profile,
  careersEnabled = false,
}: {
  profile: MemberHomeProfile;
  careersEnabled?: boolean;
}) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const status = profile.verification_status;
  const limited = status !== "verified";

  const [
    { data: postRows },
    { data: eventRows },
    { count: alumniCount },
    { count: batchmateCount },
    { count: openRoleCount },
    { count: upcomingEventCount },
    { data: discussionRows },
    { data: opportunityRows },
  ] = await Promise.all([
    // 4 most recent Instagram highlights for the homepage teaser — mirrors
    // the query on the events page's "From our Instagram" section.
    supabase
      .from("social_posts")
      .select(
        "id, post_id, short_code, caption, image_url, video_url, post_type, posted_at, likes_count, comments_count, permalink, hashtags, created_at"
      )
      .order("posted_at", { ascending: false })
      .limit(4)
      .returns<SocialPost[]>(),
    // The single nearest upcoming event, if any — powers the featured
    // countdown tile below.
    supabase
      .from("events")
      .select("id, title, event_date, location")
      .gte("event_date", nowIso)
      .order("event_date", { ascending: true })
      .limit(1)
      .returns<UpcomingEvent[]>(),
    // Network-pulse strip: four small counts that make the page feel alive
    // and current rather than a static set of links.
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "verified"),
    profile.graduation_year
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("verification_status", "verified")
          .eq("graduation_year", profile.graduation_year)
          .neq("id", profile.id)
      : Promise.resolve({ count: null }),
    supabase
      .from("job_postings")
      .select("*", { count: "exact", head: true })
      .is("closed_at", null),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", nowIso),
    // Latest community activity — real, current content beats another
    // static link tile for "why open this page today."
    supabase
      .from("discussion_posts")
      .select(
        "id, title, created_at, author:profiles!discussion_posts_author_id_fkey(full_name), comments:discussion_comments(count)"
      )
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<DiscussionTeaser[]>(),
    // A handful of open roles for verified members — the careers QuickLink
    // tile only ever pointed at the board; this shows what's actually on it.
    !limited
      ? supabase
          .from("job_postings")
          .select("*")
          .is("closed_at", null)
          .order("created_at", { ascending: false })
          .limit(3)
          .returns<JobPosting[]>()
      : Promise.resolve({ data: null }),
  ]);
  const posts = postRows ?? [];
  const nextEvent = eventRows?.[0] ?? null;
  const discussions = discussionRows ?? [];
  const opportunities = opportunityRows ?? [];

  const firstName = (profile.full_name ?? "").trim().split(" ")[0] || "there";
  const isStudent = profile.user_type === "student";
  // Existing alumni who signed up before industry/role existed get a nudge.
  const needsProfileCompletion =
    profile.user_type === "alumni" &&
    (!profile.industry || !profile.job_title);

  return (
    <>
      {/* Welcome */}
      <section className="relative overflow-hidden">
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

      {/* Network pulse — a handful of live counts so the page reads as a
          window onto an active network, not a static set of shortcuts. */}
      <section className="border-t border-gold/30 bg-oxblood">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Reveal>
              <StatBlock
                value={`${(alumniCount ?? 0).toLocaleString("en-US")}+`}
                label="Verified alumni"
              />
            </Reveal>
            <Reveal delay={60}>
              <StatBlock
                value={String(upcomingEventCount ?? 0)}
                label={
                  (upcomingEventCount ?? 0) === 1
                    ? "Upcoming event"
                    : "Upcoming events"
                }
              />
            </Reveal>
            <Reveal delay={120}>
              <StatBlock
                value={String(openRoleCount ?? 0)}
                label={
                  (openRoleCount ?? 0) === 1
                    ? "Open role on the board"
                    : "Open roles on the board"
                }
              />
            </Reveal>
            <Reveal delay={180}>
              {profile.graduation_year ? (
                <StatBlock
                  value={String(batchmateCount ?? 0)}
                  label={`From the batch of ${profile.graduation_year}`}
                />
              ) : (
                <StatBlock
                  value={String(discussions.length > 0 ? discussions.length : 0)}
                  label="Recent discussions"
                />
              )}
            </Reveal>
          </div>
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
                      : "Offer an hour a month, and you choose who you take on."
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
                  body="Openings shared by members, apply in a click."
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

      {/* Latest opportunities — real postings, not just a link to the board.
          Verified members only, matching the careers-tile gating above. */}
      {!limited && opportunities.length > 0 && (
        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Reveal>
                  <Eyebrow>Careers</Eyebrow>
                </Reveal>
                <Reveal delay={80}>
                  <h2 className="mt-6 font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                    Latest opportunities.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={100}>
                <Link
                  href="/careers/jobs"
                  className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                >
                  View the full board →
                </Link>
              </Reveal>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {opportunities.map((job, i) => (
                <Reveal key={job.id} delay={i * 90}>
                  <Link
                    href={`/careers/openings/${job.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-gold/30 bg-ivory-dim/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_18px_36px_-18px_rgba(47,37,68,0.25)]"
                  >
                    <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                      {job.type === "internship" ? "Internship" : "Full-time"}
                      {job.remote ? " · Remote" : ""}
                    </span>
                    <h3 className="mt-2 font-display text-xl italic text-ink transition-transform duration-300 group-hover:translate-x-1">
                      {job.title}
                    </h3>
                    <p className="mt-1 font-sans text-sm text-ink/65">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                    <span className="mt-auto pt-4 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70 transition-colors group-hover:text-oxblood">
                      View role →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent from the community — real discussion activity, so the page
          shows the network is actually in use, not just linking to features. */}
      {discussions.length > 0 && (
        <section className="border-t border-gold/30 bg-ivory-dim/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Reveal>
                  <Eyebrow>Community</Eyebrow>
                </Reveal>
                <Reveal delay={80}>
                  <h2 className="mt-6 font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                    Recent from the community.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={100}>
                <Link
                  href="/community"
                  className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                >
                  Join the discussion →
                </Link>
              </Reveal>
            </div>

            <div className="mt-10 flex flex-col divide-y divide-gold/25 rounded-2xl border border-gold/30 bg-ivory">
              {discussions.map((post, i) => {
                const authorRow = Array.isArray(post.author)
                  ? post.author[0]
                  : post.author;
                const commentCount = post.comments?.[0]?.count ?? 0;
                return (
                  <Reveal key={post.id} delay={i * 80}>
                    <Link
                      href={`/community/${post.id}`}
                      className="group flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-ivory-dim/50 md:px-8"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg italic text-ink transition-transform duration-300 group-hover:translate-x-1">
                          {post.title}
                        </h3>
                        <p className="mt-1 font-sans text-[12px] uppercase tracking-[0.1em] text-ink/45">
                          {authorRow?.full_name ?? "A member"}
                        </p>
                      </div>
                      <span className="shrink-0 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70">
                        {commentCount} {commentCount === 1 ? "reply" : "replies"}
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
  profile: MemberHomeProfile;
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
            ? `${profile.rejection_reason}. Update your details and it'll be reviewed again.`
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
        . Everything else is open, and this usually doesn&rsquo;t take long.
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

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl italic text-ivory md:text-4xl">
        <CountUp value={value} />
      </p>
      <p className="mt-1 font-sans text-[11px] font-medium uppercase leading-snug tracking-[0.12em] text-ivory/55">
        {label}
      </p>
    </div>
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
