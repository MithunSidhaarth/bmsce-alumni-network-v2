import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventForm from "../../EventForm";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Edit event: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, description, event_date, location, country, state, cover_image_url, rsvp_url, created_by, created_at"
    )
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
          Edit event.
        </h1>
        <Link
          href="/admin/events"
          className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
        >
          ← All events
        </Link>
      </div>
      <div className="mt-10">
        <EventForm event={event} />
      </div>
    </>
  );
}
