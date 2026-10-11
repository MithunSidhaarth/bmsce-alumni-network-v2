import { createClient } from "@/lib/supabase/server";

// An .ics file for one event, so it can be added to any calendar app.
// Events only store a start time, so the entry is given two hours.

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Calendar files wrap long lines at 75 bytes; continuation lines start with a space.
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id, title, description, event_date, location").eq("id", id).maybeSingle();
  const start = event ? new Date(event.event_date) : null;
  if (!event || !start || isNaN(start.getTime())) return new Response("Not found", { status: 404 });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BMSCE Alumni Network//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@bmsce-alumni-network`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + 2 * 3600e3))}`,
    `SUMMARY:${esc(event.title)}`,
    ...(event.location ? [`LOCATION:${esc(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${esc(event.description.slice(0, 1500))}`] : []),
    `URL:${site}/events/${event.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="bmsce-alumni-event.ics"',
      "cache-control": "no-store",
    },
  });
}
