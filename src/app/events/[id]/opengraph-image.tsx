import { OG_SIZE, ogCard } from "@/lib/og";
import { serverClient } from "@/lib/server/cron";

// Share card for an event: its name, when and where.
export const alt = "An event on the BMSCE Alumni Network";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function EventOg({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: e } = /^[0-9a-f-]{36}$/.test(id)
    ? await serverClient().from("events").select("title, event_date, location, cover_image_url").eq("id", id).maybeSingle()
    : { data: null };
  const when = e ? new Date(e.event_date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "long", year: "numeric" }) : null;
  return ogCard({
    eyebrow: when ? `Event · ${when}` : "Events",
    title: e?.title ?? "Where the network gathers",
    note: e?.location ? e.location : "tear off a tab to say you are coming",
    image: e?.cover_image_url ?? null,
  });
}
