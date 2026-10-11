import { dayDate } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import CampusUpdates from "@/components/CampusUpdates";
import SocialFeed from "@/components/SocialFeed";
import TearOffRsvp from "./TearOffRsvp";
import { createClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/url";
import type { EventRow, SocialPost } from "@/lib/types";

export const metadata: Metadata = {
  title: "Events: BMSCE Alumni Network",
  description:
    "Upcoming BMSCE alumni events and highlights from our community on Instagram.",
};

export const dynamic = "force-dynamic";

// ---- Event stats (placeholder figures — edit these freely) ----------------
// The client will likely supply real numbers later; just change the strings.
const EVENT_STATS = [
  { value: "10+", label: "events annually" },
  { value: "1,000+", label: "alumni engaged" },
];

export default async function EventsPage() {
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const [{ data: events }, { data: posts }, userRes, countsRes] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, description, event_date, location, country, state, cover_image_url, rsvp_url, created_by, created_at"
      )
      .gte("event_date", nowIso)
      .order("event_date", { ascending: true })
      .returns<EventRow[]>(),
    supabase
      .from("social_posts")
      .select(
        "id, post_id, short_code, caption, image_url, video_url, post_type, posted_at, likes_count, comments_count, permalink, hashtags, created_at"
      )
      .order("posted_at", { ascending: false })
      // The feed shows 12 at a time with "load more"; 48 is plenty and keeps
      // the page payload small.
      .limit(48)
      .returns<SocialPost[]>(),
    supabase.auth.getUser(),
    supabase.rpc("event_going_counts"),
  ]);

  // RSVP context: who's signed in, whether they can RSVP, their own RSVPs, and
  // aggregate going-counts (via a security-definer RPC — see SQL).
  const user = userRes.data.user;
  const signedIn = Boolean(user);
  let canRsvp = false;
  let myRsvps = new Set<string>();
  let userCountry = "";
  let userState = "";
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("verification_status, country, state")
      .eq("id", user.id)
      .single();
    canRsvp = me?.verification_status === "verified";
    userCountry = (me?.country ?? "").trim().toLowerCase();
    userState = (me?.state ?? "").trim().toLowerCase();
    const { data: mine } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("profile_id", user.id);
    myRsvps = new Set((mine ?? []).map((r) => r.event_id as string));
  }
  const countsJson = countsRes.data;
  const counts: Record<string, number> =
    (countsJson as Record<string, number> | null) ?? {};

  // Float events near the member's location to the top — never hide any.
  // Tier 0: same country + state. Tier 1: same country only. Tier 2: rest
  // (including events with no country set). Skipped entirely for signed-out
  // users or members with no country on file, so their order stays the
  // existing soonest-date-first default. Array.sort is stable, and `events`
  // already arrives ordered by event_date ascending, so ties within a tier
  // keep resolving to soonest first.
  const locationTier = (event: EventRow): 0 | 1 | 2 => {
    const evCountry = (event.country ?? "").trim().toLowerCase();
    if (!evCountry || evCountry !== userCountry) return 2;
    const evState = (event.state ?? "").trim().toLowerCase();
    if (userState && evState && evState === userState) return 0;
    return 1;
  };

  const upcoming = userCountry
    ? [...(events ?? [])].sort((a, b) => locationTier(a) - locationTier(b))
    : events ?? [];

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-16 md:px-10 md:pb-8 md:pt-24">
            <Reveal>
              <Eyebrow>Events</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="slash mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                Where the Network gathers.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                Reunions, meetups, and moments from the BMSCE alumni community.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Event stats — simple placeholder figures, above the events list */}
        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-16">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ivory/50 bg-ivory sm:grid-cols-3">
              {EVENT_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-brand-ink px-6 py-8 text-center md:py-10"
                >
                  <p className="font-display text-4xl text-ivory md:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-3 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ivory/70">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming events (real, RSVP-able) */}
        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
            <Reveal>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                  Upcoming events
                </h2>
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/70">
                  {upcoming.length} scheduled
                </span>
              </div>
            </Reveal>

            {upcoming.length === 0 ? (
              <Reveal delay={80}>
                <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-16 text-center">
                  <p className="font-display text-xl italic text-ink">
                    No upcoming events just yet.
                  </p>
                  <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-ink/70">
                    Reunions and meetups will be posted here as they&rsquo;re
                    announced. Check back soon.
                  </p>
                </div>
              </Reveal>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((ev, i) => {
                  const tier = userCountry ? locationTier(ev) : 2;
                  const locationBadge =
                    tier === 0 ? "Near you" : tier === 1 ? "In your country" : null;
                  return (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      index={i}
                      going={myRsvps.has(ev.id)}
                      count={counts[ev.id] ?? 0}
                      canRsvp={canRsvp}
                      signedIn={signedIn}
                      locationBadge={locationBadge}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <CampusUpdates />

        {/* Instagram highlights — clearly separate, NOT RSVP-able */}
        <section className="border-t border-gold/30 bg-ivory-dim/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
            <Reveal>
              <Eyebrow>From our Instagram</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-2xl font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                Highlights and moments.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
                Past moments from{" "}
                <a
                  href="https://www.instagram.com/bmscealumni/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-oxblood underline decoration-accent underline-offset-2 hover:text-maroon"
                >
                  @bmscealumni
                </a>
                . These are past posts for memory&rsquo;s sake, not upcoming
                events. Tap any card to view the original on Instagram.
              </p>
            </Reveal>

            <SocialFeed posts={posts ?? []} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function EventCard({
  event,
  index,
  going,
  count,
  canRsvp,
  signedIn,
  locationBadge,
}: {
  event: EventRow;
  index: number;
  going: boolean;
  count: number;
  canRsvp: boolean;
  signedIn: boolean;
  locationBadge: "Near you" | "In your country" | null;
}) {
  const date = new Date(event.event_date);
  const dateLabel = isNaN(date.getTime())
    ? ""
    : dayDate(event.event_date);
  const rsvpHref = safeUrl(event.rsvp_url);

  const tabLabel = isNaN(date.getTime())
    ? "Count me in"
    : date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" });

  // A poster pinned to the board: taped at the top, hung a touch crooked, with
  // a strip of tear-off tabs along the bottom for the RSVP.
  return (
    <Reveal delay={Math.min(index, 6) * 70} className="h-full">
      <article className="sheet relative flex h-full flex-col pt-3" style={{ transform: `rotate(${index % 2 ? 0.7 : -0.7}deg)` }}>
        <span className={`tape ${index % 3 === 1 ? "tape-lime" : ""}`} aria-hidden="true" />
        <div className="relative mx-3 aspect-[4/3] overflow-hidden rounded-md bg-brand-ink">
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt={`Poster for ${event.title}`} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <p className="flex h-full items-end break-words p-4 font-display text-[1.55rem] font-extrabold leading-[0.95] text-lime [overflow-wrap:anywhere]" aria-hidden="true">
              {event.title}
            </p>
          )}
          {!isNaN(date.getTime()) && (
            <div className="absolute left-3 top-3 rounded-md bg-paper px-3 py-2 text-center text-ink shadow-md">
              <p className="font-display text-2xl font-extrabold leading-none">{date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric" })}</p>
              <p className="label-mono mt-1 text-tangerine">{date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", month: "short" })}</p>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
          <span className="label-mono text-tangerine">{dateLabel}</span>
          <h3 className="mt-2 font-display text-xl leading-tight">
            <Link href={`/events/${event.id}`} className="underline">
              {event.title}
            </Link>
          </h3>
          {event.location && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/70">
              <span>{event.location}</span>
              {locationBadge && <span className="stamp text-forest">{locationBadge}</span>}
            </p>
          )}
          {event.description && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink/75">{event.description}</p>}
          <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs font-semibold text-forest">
            <a href={`/events/${event.id}/calendar`} className="underline underline-offset-2 hover:no-underline">
              Add to calendar
            </a>
            {rsvpHref && (
              <a href={rsvpHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
                Event details
              </a>
            )}
          </p>
        </div>
        <TearOffRsvp eventId={event.id} initialGoing={going} count={count} canRsvp={canRsvp} signedIn={signedIn} label={tabLabel} />
      </article>
    </Reveal>
  );
}
