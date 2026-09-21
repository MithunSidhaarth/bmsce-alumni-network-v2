import Link from "next/link";
import ProfileCompletionNudge from "./ProfileCompletionNudge";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import SpotlightCard from "./SpotlightCard";
import EventCountdown from "./EventCountdown";
import Seal from "./Seal";
import MemberPhoto from "./MemberPhoto";
import AlumniSpotlight from "./AlumniSpotlight";
import { PostCard } from "./SocialFeed";
import {
  DirectoryIcon,
  EventsIcon,
  MentorshipIcon,
  CareersIcon,
} from "./icons";
import { createClient } from "@/lib/supabase/server";
import type { GalleryPhoto, JobPosting, Profile, SocialPost } from "@/lib/types";

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

type DirectoryPreviewProfile = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
};

type MentorPreview = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  job_title: string | null;
  company: string | null;
  mentor_expertise: string[] | null;
};

// Exact set of Profile columns this page reads — kept in sync with the
// query in app/page.tsx so that page can select() just these instead of "*".
export type MemberHomeProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "photo_url"
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
  const isAdmin = profile.role === "admin";

  const [
    { data: postRows },
    { data: eventRows },
    { count: alumniCount },
    { data: discussionRows },
    { data: opportunityRows },
    { data: directoryPreviewRows },
    { data: galleryRows },
    { data: mentorRows },
    { count: pendingReviewCount },
    { count: openReportCount },
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
    // Total verified-alumni count, used by the Directory preview tile below.
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "verified"),
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
    careersEnabled && !limited
      ? supabase
          .from("job_postings")
          .select("*")
          .is("closed_at", null)
          .order("created_at", { ascending: false })
          .limit(3)
          .returns<JobPosting[]>()
      : Promise.resolve({ data: null }),
    // A handful of real verified members for the Directory tile's avatar
    // stack — turns "search the directory" from a described feature into
    // visible proof the directory actually has people in it.
    !limited
      ? supabase
          .from("profiles")
          .select("id, full_name, photo_url")
          .eq("verification_status", "verified")
          .neq("id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<DirectoryPreviewProfile[]>()
      : Promise.resolve({ data: null }),
    // Recent campus/chapter photos — the gallery itself, distinct from the
    // Instagram teaser, for another real, current, photographic section.
    supabase
      .from("gallery_photos")
      .select("id, thumbnail_url, caption, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(6)
      .returns<Pick<GalleryPhoto, "id" | "thumbnail_url" | "caption" | "uploaded_at">[]>(),
    // A few real, active mentors for students specifically — mentorship is
    // the flagship student-facing feature, so show who's actually
    // available instead of only linking to the request form.
    careersEnabled && profile.user_type === "student" && !limited
      ? supabase
          .from("profiles")
          .select("id, full_name, photo_url, job_title, company, mentor_expertise")
          .eq("is_mentor", true)
          .eq("verification_status", "verified")
          .order("created_at", { ascending: false })
          .limit(3)
          .returns<MentorPreview[]>()
      : Promise.resolve({ data: null }),
    // Admin-only "needs your attention" counts — the single most useful
    // thing an admin specifically can see on their own homepage.
    isAdmin
      ? supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("verification_status", "unverified")
          .eq("user_type", "alumni")
      : Promise.resolve({ count: null }),
    isAdmin
      ? supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
      : Promise.resolve({ count: null }),
  ]);
  const posts = postRows ?? [];
  const nextEvent = eventRows?.[0] ?? null;
  const discussions = discussionRows ?? [];
  const opportunities = opportunityRows ?? [];
  const directoryPreview = directoryPreviewRows ?? [];
  const galleryPhotos = galleryRows ?? [];
  const mentors = mentorRows ?? [];

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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-4 hidden h-[380px] w-[380px] opacity-[0.07] lg:block"
        >
          <Seal
            laurel
            ringColor="var(--color-brass)"
            textColor="var(--color-brass)"
            monogramColor="var(--color-oxblood)"
            laurelColor="var(--color-brass)"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-16 md:px-10 md:pt-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Reveal className="shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-brass/60 bg-gradient-to-br from-maroon to-oxblood shadow-[0_10px_24px_-10px_rgba(47,37,68,0.5)] md:h-24 md:w-24">
                {profile.photo_url ? (
                  <MemberPhoto src={profile.photo_url} alt={profile.full_name ?? ""} />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-3xl italic text-ivory">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </Reveal>
            <div>
              <Reveal>
                <Eyebrow>
                  {isStudent ? "Student" : status === "verified" ? "Member" : "Welcome"}
                </Eyebrow>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                  {greeting(new Date().getHours())},{" "}
                  <span className="bg-gradient-to-r from-oxblood from-10% via-maroon via-55% to-accent to-85% bg-clip-text pr-2 italic text-transparent">
                    {firstName}
                  </span>
                  .
                </h1>
              </Reveal>
            </div>
          </div>
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

          {/* Admin attention strip — the single most useful thing an admin
              specifically can see here: what's actually waiting on them,
              not just a link to the dashboard. */}
          {isAdmin && ((pendingReviewCount ?? 0) > 0 || (openReportCount ?? 0) > 0) && (
            <Reveal delay={240}>
              <Link
                href="/admin"
                className="group mt-8 flex max-w-2xl flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 px-6 py-4 transition-colors hover:border-accent/50 hover:bg-accent/10"
              >
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                    Needs your attention
                  </span>
                  {(pendingReviewCount ?? 0) > 0 && (
                    <span className="font-sans text-sm text-ink/75">
                      {pendingReviewCount} profile
                      {pendingReviewCount === 1 ? "" : "s"} awaiting review
                    </span>
                  )}
                  {(openReportCount ?? 0) > 0 && (
                    <span className="font-sans text-sm text-ink/75">
                      {openReportCount} open report
                      {openReportCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-accent transition-transform duration-300 group-hover:translate-x-1">
                  Review →
                </span>
              </Link>
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

          {/* Flex, not a fixed-column grid: however many tiles exist below
              (1 to 4, depending on whether an event and Careers are both
              on), they always grow to fill the full row width — a
              grid-cols-4 layout left dead empty columns whenever fewer
              tiles were present (e.g. Careers off left a wide gap). */}
          <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-stretch">
            {nextEvent && (
              <Reveal delay={0} className="lg:w-[42%] lg:shrink-0">
                <SpotlightCard
                  glow="rgba(255,255,255,0.18)"
                  className="h-full min-h-[280px] rounded-2xl bg-gradient-to-br from-oxblood to-maroon p-6 shadow-[0_18px_36px_-16px_rgba(47,37,68,0.5)] md:p-8"
                >
                  <Link href="/events" className="flex h-full flex-col justify-between">
                    <div>
                      <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-brass-light">
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

            <div className="flex flex-1 flex-wrap gap-5">
              {directoryPreview.length > 0 ? (
                <DirectoryPreviewTile
                  people={directoryPreview}
                  totalCount={alumniCount ?? directoryPreview.length}
                />
              ) : (
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
                />
              )}
              {!nextEvent && (
                <QuickLink
                  index={2}
                  tag="Events"
                  title="What's coming up"
                  body="Reunions and meetups, plus highlights from our Instagram."
                  href="/events"
                  tone="maroon"
                  Icon={EventsIcon}
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
                  />
                  <QuickLink
                    index={4}
                    tag="Careers"
                    title="Jobs & internships"
                    body="Openings shared by members, apply in a click."
                    href="/careers/jobs"
                    tone="light"
                    Icon={CareersIcon}
                  />
                </>
              )}
            </div>
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

      {/* Mentors ready to help — students specifically. Mentorship is the
          flagship student-facing feature; showing real people beats a link
          to a request form. */}
      {mentors.length > 0 && (
        <section className="border-t border-gold/30 bg-ivory-dim/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Reveal>
                  <Eyebrow>Mentorship</Eyebrow>
                </Reveal>
                <Reveal delay={80}>
                  <h2 className="mt-6 font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                    Mentors ready to help.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={100}>
                <Link
                  href="/careers/mentorship"
                  className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                >
                  Browse all mentors →
                </Link>
              </Reveal>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {mentors.map((mentor, i) => (
                <Reveal key={mentor.id} delay={i * 90}>
                  <Link
                    href="/careers/mentorship"
                    className="group flex h-full flex-col rounded-2xl border border-gold/30 bg-ivory p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brass/50 hover:shadow-[0_18px_36px_-18px_rgba(47,37,68,0.25)]"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-maroon to-oxblood">
                      {mentor.photo_url ? (
                        <MemberPhoto src={mentor.photo_url} alt={mentor.full_name ?? ""} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-sans text-sm font-semibold text-ivory">
                          {initials(mentor.full_name)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-lg italic text-ink transition-transform duration-300 group-hover:translate-x-1">
                      {mentor.full_name ?? "A mentor"}
                    </h3>
                    {(mentor.job_title || mentor.company) && (
                      <p className="mt-1 font-sans text-sm text-ink/65">
                        {[mentor.job_title, mentor.company].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {mentor.mentor_expertise && mentor.mentor_expertise.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {mentor.mentor_expertise.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-brass/30 px-2.5 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.06em] text-oxblood/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mt-auto pt-4 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70 transition-colors group-hover:text-brass">
                      Request mentorship →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest opportunities — real postings, not just a link to the board.
          Verified members only, and only while Careers is switched on in admin. */}
      {careersEnabled && !limited && opportunities.length > 0 && (
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

      {/* Campus & chapter gallery — real event photography (admin-curated),
          distinct from the Instagram teaser below. */}
      {galleryPhotos.length > 0 && (
        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Reveal>
                  <Eyebrow>Gallery</Eyebrow>
                </Reveal>
                <Reveal delay={80}>
                  <h2 className="mt-6 font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                    From campus and chapters.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={100}>
                <Link
                  href="/gallery"
                  className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                >
                  See the full gallery →
                </Link>
              </Reveal>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {galleryPhotos.map((photo, i) => (
                <Reveal key={photo.id} delay={i * 60}>
                  <Link
                    href="/gallery"
                    className="group block aspect-square overflow-hidden rounded-xl border border-gold/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.caption ?? ""}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Where they are now — real, named alumni with real photos, the same
          section the public homepage uses. Members get it too: proof the
          network includes people worth knowing, not just a directory tool. */}
      <AlumniSpotlight />

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

function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Bespoke Directory tile: real faces from the network instead of a sentence
// describing the feature — the single biggest lever for "this page feels
// alive" available on the homepage, since it costs one extra query.
function DirectoryPreviewTile({
  people,
  totalCount,
}: {
  people: { id: string; full_name: string | null; photo_url: string | null }[];
  totalCount: number;
}) {
  const shown = people.slice(0, 5);
  const remaining = Math.max(0, totalCount - shown.length);
  return (
    <Reveal delay={90} className="min-w-[220px] flex-1 basis-[220px]">
      <SpotlightCard
        glow="rgba(184,147,63,0.14)"
        className="relative h-full min-h-[210px] overflow-hidden rounded-2xl border border-gold/30 bg-ivory-dim/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brass/50 hover:shadow-[0_18px_36px_-18px_rgba(47,37,68,0.25)]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-4 -right-4 text-brass/10 [&>svg]:h-24 [&>svg]:w-24"
        >
          <DirectoryIcon />
        </span>
        <Link href="/directory" className="group relative flex h-full flex-col p-6 md:p-7">
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            Directory
          </span>
          <h3 className="mt-2 font-display text-xl italic text-ink transition-transform duration-300 group-hover:translate-x-1">
            Find your people
          </h3>

          <div className="mt-4 flex items-center">
            <div className="flex -space-x-3">
              {shown.map((person) => (
                <div
                  key={person.id}
                  className="h-9 w-9 overflow-hidden rounded-full border-2 border-ivory bg-gradient-to-br from-maroon to-oxblood shadow-sm"
                  title={person.full_name ?? "Member"}
                >
                  {person.photo_url ? (
                    <MemberPhoto src={person.photo_url} alt={person.full_name ?? ""} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-sans text-[10px] font-semibold text-ivory">
                      {initials(person.full_name)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {remaining > 0 && (
              <span className="ml-3 font-sans text-sm text-ink/55">
                +{remaining.toLocaleString("en-US")} more
              </span>
            )}
          </div>

          <span className="mt-auto pt-4 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70 transition-colors group-hover:text-brass">
            Open →
          </span>
        </Link>
      </SpotlightCard>
    </Reveal>
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
    <Reveal delay={index * 90} className="min-w-[220px] flex-1 basis-[220px]">
      <SpotlightCard
        glow={maroon ? "rgba(255,255,255,0.14)" : "rgba(184,147,63,0.14)"}
        className={`relative h-full min-h-[210px] overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 ${
          maroon
            ? "bg-maroon hover:shadow-[0_18px_36px_-16px_rgba(113,41,60,0.5)]"
            : "border border-gold/30 bg-ivory-dim/40 hover:border-brass/50 hover:shadow-[0_18px_36px_-18px_rgba(47,37,68,0.25)]"
        }`}
      >
        {/* Faint oversized icon watermark, bottom-right — the same
            "official document" texture as the seal watermarks elsewhere,
            here scoped per-card so each tile has its own quiet identity. */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-4 -right-4 [&>svg]:h-24 [&>svg]:w-24 ${
            maroon ? "text-ivory/10" : "text-brass/10"
          }`}
        >
          <Icon />
        </span>

        <Link href={href} className="group relative flex h-full flex-col p-6 md:p-7">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5 ${
              maroon
                ? "bg-ivory/10 text-ivory"
                : "border border-brass/40 text-oxblood group-hover:border-brass group-hover:text-brass"
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
                : "text-oxblood/70 group-hover:text-brass"
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
