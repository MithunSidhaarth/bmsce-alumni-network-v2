import Link from "next/link";

const TZ = "Asia/Kolkata";

/** An event as a ticket stub: the date torn off on the left. */
export default function EventStub({
  id,
  title,
  date,
  location,
}: {
  id: string;
  title: string;
  date: string;
  location: string | null;
}) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { timeZone: TZ, month: "short" }).toUpperCase();
  const time = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
  return (
    <Link
      href={`/events/${id}`}
      className="group flex overflow-hidden rounded-box border border-ink/15 bg-paper shadow-[var(--shadow-sheet)] transition-transform hover:-translate-y-0.5"
    >
      <span className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-ink/25 bg-tangerine py-3 text-white">
        <span className="font-display text-2xl font-extrabold leading-none">{day}</span>
        <span className="label-mono mt-1">{month}</span>
      </span>
      <span className="min-w-0 flex-1 px-3.5 py-3">
        <span className="block truncate font-display text-[1.02rem] font-bold leading-tight group-hover:underline">
          {title}
        </span>
        <span className="mt-1 block truncate text-xs text-ink/60">
          {time}
          {location ? ` · ${location}` : ""}
        </span>
      </span>
    </Link>
  );
}
