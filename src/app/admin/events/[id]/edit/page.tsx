import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventForm from "../../EventForm";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { featureOnWall, setEventChapter } from "../../../manage";

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
  const [{ data: chapters }, { data: link }] = await Promise.all([
    supabase.from("chapters").select("id, name").eq("status", "active").order("name"),
    supabase.from("events").select("chapter_id").eq("id", id).maybeSingle(),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="slash font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
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
      <div className="mt-10 grid gap-6 border-t border-ink/15 pt-8 sm:grid-cols-2">
        <AdminForm action={setEventChapter} hidden={{ id }} className="flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1">
            <span className="field-label">Hosting chapter</span>
            <select name="chapter_id" defaultValue={link?.chapter_id ?? ""} className="field">
              <option value="">Network-wide (no chapter)</option>
              {(chapters ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Submit>Save chapter</Submit>
        </AdminForm>
        <AdminForm action={featureOnWall} hidden={{ source: "event", ref: id }} className="flex flex-wrap items-end gap-2">
          <p className="basis-full text-sm text-ink/70">Pin this event to The Wall as a ticket.</p>
          <Submit className="btn btn-ghost btn-sm">Add to The Wall</Submit>
        </AdminForm>
      </div>
    </>
  );
}
