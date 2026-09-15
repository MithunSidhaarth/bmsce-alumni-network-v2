import type { Metadata } from "next";
import Link from "next/link";
import DeleteEventButton from "./DeleteEventButton";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin · Events: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, description, event_date, location, country, state, cover_image_url, rsvp_url, created_by, created_at"
    )
    .order("event_date", { ascending: false })
    .returns<EventRow[]>();

  const { data: rsvpRows } = await supabase
    .from("event_rsvps")
    .select(
      "event_id, profile:profiles!event_rsvps_profile_id_fkey(full_name)"
    )
    .eq("status", "going")
    .returns<
      { event_id: string; profile: { full_name: string | null } | null }[]
    >();
  const rsvpsByEvent = new Map<string, string[]>();
  for (const r of rsvpRows ?? []) {
    const arr = rsvpsByEvent.get(r.event_id) ?? [];
    arr.push(r.profile?.full_name || "A member");
    rsvpsByEvent.set(r.event_id, arr);
  }

  const now = Date.now();
  const list = events ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
          Events.
        </h1>
        <Link
          href="/admin/events/new"
          className="rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
        >
          Create event
        </Link>
      </div>

      {list.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-16 text-center">
                <p className="font-display text-xl italic text-ink">
                  No events yet.
                </p>
                <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-ink/65">
                  Create your first event, and it&rsquo;ll show on the public
                  Events page.
                </p>
              </div>
            ) : (
              <ul className="mt-10 flex flex-col gap-4">
                {list.map((ev) => {
                  const past = new Date(ev.event_date).getTime() < now;
                  const label = new Date(ev.event_date).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  );
                  const rsvpNames = rsvpsByEvent.get(ev.id) ?? [];
                  return (
                    <li
                      key={ev.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                            {label}
                          </span>
                          {past && (
                            <span className="rounded-full border border-ink/25 bg-ink/5 px-2.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-ink/55">
                              Past
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-display text-xl text-ink">
                          {ev.title}
                        </h3>
                        {ev.location && (
                          <p className="mt-1 font-sans text-sm text-ink/60">
                            {ev.location}
                          </p>
                        )}
                        <details className="mt-3">
                          <summary className="cursor-pointer font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/80">
                            {rsvpNames.length} RSVP
                            {rsvpNames.length === 1 ? "" : "s"}
                          </summary>
                          {rsvpNames.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1">
                              {rsvpNames.map((nm, i) => (
                                <li
                                  key={i}
                                  className="font-sans text-sm text-ink/70"
                                >
                                  {nm}
                                </li>
                              ))}
                            </ul>
                          )}
                        </details>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/admin/events/${ev.id}/edit`}
                          className="rounded-sm border border-gold/50 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood"
                        >
                          Edit
                        </Link>
                        <DeleteEventButton id={ev.id} title={ev.title} />
                      </div>
                    </li>
                  );
                })}
              </ul>
      )}
    </>
  );
}
