import { dateTime } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import TearOffRsvp from "../TearOffRsvp";
import SecondZone from "@/components/v2/SecondZone";
import EventCommunity from "@/components/v2/EventCommunity";
import { createClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/url";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS =
  "id, title, description, event_date, location, country, state, cover_image_url, rsvp_url, created_by, created_at";

type Props = { params: Promise<{ id: string }> };

async function getEvent(id: string) {
  // Malformed ids would make Postgres throw on the uuid cast — treat as 404.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle<EventRow>();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ev = await getEvent((await params).id);
  return {
    title: ev ? `${ev.title}: BMSCE Alumni Network` : "Event: BMSCE Alumni Network",
    description: ev?.description?.slice(0, 160) ?? undefined,
  };
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canRsvp = false;
  let going = false;
  if (user) {
    const [{ data: me }, { data: mine }] = await Promise.all([
      supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single(),
      supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("event_id", id)
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);
    canRsvp = me?.verification_status === "verified";
    going = !!mine;
  }
  const { data: countsJson } = await supabase.rpc("event_going_counts");
  const count = (countsJson as Record<string, number> | null)?.[id] ?? 0;

  const date = new Date(event.event_date);
  const validDate = !isNaN(date.getTime());
  const isPast = validDate && date.getTime() < Date.now();
  const when = validDate
    ? dateTime(event.event_date)
    : "";
  const place = [event.location, event.state, event.country]
    .filter(Boolean)
    .join(", ");
  const external = safeUrl(event.rsvp_url);
  const cover = safeUrl(event.cover_image_url);

  // Google Calendar "add event" link (2h default duration).
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const calendar = validDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        event.title
      )}&dates=${fmt(date)}/${fmt(new Date(date.getTime() + 2 * 3600 * 1000))}&location=${encodeURIComponent(
        place
      )}&details=${encodeURIComponent(event.description ?? "")}`
    : null;

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <Link
              href="/events"
              className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
            >
              ← All events
            </Link>

            <div className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-[image:linear-gradient(90deg,var(--color-red),var(--color-dusk))]">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={`Poster for ${event.title}`} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-[1fr_300px]">
              <div>
                <Eyebrow>{isPast ? "Past event" : "Upcoming event"}</Eyebrow>
                <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight text-ink">
                  {event.title}
                </h1>
                {event.description && (
                  <p className="mt-6 whitespace-pre-line font-sans text-base leading-relaxed text-ink/75 md:text-lg">
                    {event.description}
                  </p>
                )}
              </div>

              <aside className="h-fit rounded-2xl border border-gold/40 bg-ivory p-6 shadow-sm">
                <dl className="flex flex-col gap-5">
                  {when && (
                    <div>
                      <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/70">
                        When
                      </dt>
                      <dd className="mt-1 font-sans text-sm text-ink">{when}<SecondZone iso={event.event_date} /></dd>
                    </div>
                  )}
                  {place && (
                    <div>
                      <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/70">
                        Where
                      </dt>
                      <dd className="mt-1 font-sans text-sm text-ink">{place}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-6 border-t border-gold/30 pt-6">
                  {isPast ? (
                    <p className="font-sans text-sm text-ink/70">
                      This event has ended.
                    </p>
                  ) : (
                    <div className="-mx-6 overflow-hidden">
                      <TearOffRsvp
                        eventId={event.id}
                        initialGoing={going}
                        count={count}
                        canRsvp={canRsvp}
                        signedIn={!!user}
                        label={new Date(event.event_date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" })}
                      />
                    </div>
                  )}
                  {!isPast && (
                    <a
                      href={`/events/${event.id}/calendar`}
                      className="mt-4 block font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood hover:text-oxblood"
                    >
                      Add to calendar (.ics) →
                    </a>
                  )}
                  {!isPast && calendar && (
                    <a
                      href={calendar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood hover:text-oxblood"
                    >
                      Add to Google Calendar →
                    </a>
                  )}
                  {external && (
                    <a
                      href={external}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood hover:text-oxblood"
                    >
                      Event details →
                    </a>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>
        <EventCommunity eventId={event.id} />
      </main>
      <Footer />
    </>
  );
}
