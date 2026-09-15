import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import SocialFeed from "@/components/SocialFeed";
import RsvpButton from "./RsvpButton";
import { createClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/url";
import type { EventRow, SocialPost } from "@/lib/types";

export const metadata: Metadata = {
  title: "Events — BMSCE Alumni Network",
  description:
    "Upcoming BMS alumni events and highlights from our community on Instagram.",
};

export const dynamic = "force-dynamic";

// ---- Event stats (placeholder figures — edit these freely) ----------------
// The client will likely supply real numbers later; just change the strings.
const EVENT_STATS = [
  { value: "10+", label: "events annually" },
  { value: "1,000+", label: "alumni engaged" },
  { value: "5+", label: "cities" },
];

export default async function EventsPage() {
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const [{ data: events }, { data: posts }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .gte("event_date", nowIso)
      .order("event_date", { ascending: true })
      .returns<EventRow[]>(),
    supabase
      .from("social_posts")
      .select("*")
      .order("posted_at", { ascending: false })
      .returns<SocialPost[]>(),
  ]);

  // RSVP context: who's signed in, whether they can RSVP, their own RSVPs, and
  // aggregate going-counts (via a security-definer RPC — see SQL).
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const { data: countsJson } = await supabase.rpc("event_going_counts");
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
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                Where the network gathers.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                Reunions, meetups, and moments from the BMS alumni community.
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
                  className="bg-maroon px-6 py-8 text-center md:py-10"
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
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">
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
                  <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-ink/65">
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

        {/* Instagram highlights — clearly separate, NOT RSVP-able */}
        <section className="border-t border-gold/30 bg-ivory-dim/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
            <Reveal>
              <Eyebrow>From our Instagram</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-2xl font-display text-3xl leading-[1.05] text-ink md:text-4xl">
                Highlights &amp; moments.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
                Past moments from{" "}
                <a
                  href="https://www.instagram.com/bmsce_alumni/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-oxblood underline decoration-accent underline-offset-2 hover:text-maroon"
                >
                  @bmsce_alumni
                </a>
                . These are past posts for memory&rsquo;s sake — not upcoming
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
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  const rsvpHref = safeUrl(event.rsvp_url);

  return (
    <Reveal delay={Math.min(index, 6) * 70} className="h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-maroon/30">
        {event.cover_image_url && (
          <div className="aspect-[16/9] overflow-hidden bg-ivory-dim">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col p-6">
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            {dateLabel}
          </span>
          <h3 className="mt-3 font-display text-xl text-ink">{event.title}</h3>
          {event.location && (
            <p className="mt-1 flex flex-wrap items-center gap-2 font-sans text-sm text-ink/60">
              <span>{event.location}</span>
              {locationBadge && (
                <span
                  className={`w-fit rounded-full border px-2.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] ${
                    locationBadge === "Near you"
                      ? "border-accent/30 text-accent"
                      : "border-oxblood/25 text-oxblood/70"
                  }`}
                >
                  {locationBadge}
                </span>
              )}
            </p>
          )}
          {event.description && (
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink/70">
              {event.description}
            </p>
          )}
          <div className="mt-auto pt-5">
            {rsvpHref && (
              <a
                href={rsvpHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70 hover:text-oxblood"
              >
                Event details →
              </a>
            )}
            <RsvpButton
              eventId={event.id}
              initialGoing={going}
              count={count}
              canRsvp={canRsvp}
              signedIn={signedIn}
            />
          </div>
        </div>
      </article>
    </Reveal>
  );
}
