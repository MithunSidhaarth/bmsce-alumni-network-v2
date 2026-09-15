"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createEvent, updateEvent } from "./actions";
import { COUNTRIES, INDIA_STATES } from "@/lib/constants";
import type { EventRow } from "@/lib/types";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60";

// ISO -> value for <input type="datetime-local"> in the viewer's local time.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EventForm({ event }: { event?: EventRow }) {
  const router = useRouter();
  const editing = !!event;

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(toLocalInput(event?.event_date ?? null));
  const [location, setLocation] = useState(event?.location ?? "");
  const [country, setCountry] = useState(event?.country ?? "");
  const [stateField, setStateField] = useState(event?.state ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    event?.cover_image_url ?? ""
  );
  const [rsvpUrl, setRsvpUrl] = useState(event?.rsvp_url ?? "");

  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim() && date && location.trim() && country;

  // Switching Country to/away from India changes what State means (a select
  // of Indian states vs. free text) — clear it so a stale value from the
  // other mode doesn't linger.
  const handleCountryChange = (value: string) => {
    const wasIndia = country === "India";
    const isIndia = value === "India";
    setCountry(value);
    if (wasIndia !== isIndia) setStateField("");
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!canSave) {
      setError("Title, date, location, and country are required.");
      return;
    }
    const input = {
      title,
      description,
      // datetime-local has no timezone; interpret as local and store as ISO.
      eventDate: date ? new Date(date).toISOString() : "",
      location,
      country,
      state: stateField,
      coverImageUrl,
      rsvpUrl,
    };
    startTransition(async () => {
      try {
        if (editing) {
          await updateEvent(event!.id, input);
        } else {
          await createEvent(input);
        }
        router.push("/admin/events");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  };

  const previewDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date & time";

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="flex flex-col gap-8">
        {/* Basics */}
        <div className="flex flex-col gap-6">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            Basics
          </p>
          <Field label="Event title" required>
            <input
              className={FIELD}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bengaluru Chapter Reunion 2026"
            />
          </Field>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Date & time" required>
              <input
                className={FIELD}
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Location" required>
              <input
                className={FIELD}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="BMSCE Campus, Basavanagudi"
              />
            </Field>
            <Field label="Country" required>
              <select
                className={FIELD}
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                <option value="">Select a country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State / Province">
              {country === "India" ? (
                <select
                  className={FIELD}
                  value={stateField}
                  onChange={(e) => setStateField(e.target.value)}
                >
                  <option value="">Select a state…</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={FIELD}
                  value={stateField}
                  onChange={(e) => setStateField(e.target.value)}
                  placeholder="State / Province"
                />
              )}
            </Field>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6 border-t border-gold/25 pt-8">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            Details <span className="text-ink/40">— all optional</span>
          </p>
          <Field label="Description">
            <textarea
              className={`${FIELD} min-h-[120px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening, who it's for, what to expect."
            />
          </Field>
          <Field label="Cover image URL">
            <input
              className={FIELD}
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="RSVP / registration link">
            <input
              className={FIELD}
              type="url"
              value={rsvpUrl}
              onChange={(e) => setRsvpUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-gold/25 pt-6">
          <button
            type="submit"
            disabled={busy || !canSave}
            className="rounded-sm bg-oxblood px-8 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-50"
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Publish event"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/events")}
            className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/55 underline decoration-accent underline-offset-4 hover:text-oxblood"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className={LABEL}>Live preview</p>
        <div className="mt-3 flex flex-col overflow-hidden rounded-2xl border border-gold/25 bg-ivory-dim/60">
          {coverImageUrl && (
            <div className="aspect-[16/9] overflow-hidden bg-ivory-dim">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="p-6">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              {previewDate}
            </span>
            <h3 className="mt-3 font-display text-xl text-ink">
              {title || "Event title"}
            </h3>
            {location && (
              <p className="mt-1 font-sans text-sm text-ink/60">{location}</p>
            )}
            {description && (
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink/70">
                {description}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label}
        {required && <span className="text-oxblood"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
