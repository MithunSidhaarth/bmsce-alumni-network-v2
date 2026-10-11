import type { Metadata } from "next";
import Link from "next/link";
import EventForm from "../EventForm";

export const metadata: Metadata = {
  title: "New event: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="slash font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
          Create an event.
        </h1>
        <Link
          href="/admin/events"
          className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
        >
          ← All events
        </Link>
      </div>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Only a title and a date are required. Fill in the rest if you have
        it.
      </p>
      <div className="mt-10">
        <EventForm />
      </div>
    </>
  );
}
