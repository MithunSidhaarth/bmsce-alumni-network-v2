"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { becomeMentor, stopBeingMentor } from "../actions";
import { MENTOR_EXPERTISE } from "@/lib/constants";
import type { Profile } from "@/lib/types";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60";

export default function BecomeMentorForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [expertise, setExpertise] = useState(
    (profile.mentor_expertise ?? []).join(", ")
  );
  const [industries, setIndustries] = useState(
    (profile.mentor_industries ?? []).join(", ")
  );
  const [bio, setBio] = useState(profile.mentor_bio ?? "");
  const [availability, setAvailability] = useState(
    profile.mentor_availability ?? ""
  );
  const [maxMentees, setMaxMentees] = useState(
    profile.max_mentees != null ? String(profile.max_mentees) : ""
  );
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const addTag = (tag: string) => {
    const cur = expertise
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cur.includes(tag)) return;
    setExpertise([...cur, tag].join(", "));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await becomeMentor({ expertise, industries, bio, availability, maxMentees });
        router.push("/careers/mentorship");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  };

  const withdraw = () => {
    setError(null);
    startTransition(async () => {
      try {
        await stopBeingMentor();
        router.push("/careers/mentorship");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not withdraw.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <label className="block">
        <span className={LABEL}>Areas of expertise *</span>
        <input
          className={`${FIELD} mt-2`}
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder="Product Management, Machine Learning, Fundraising"
          required
        />
        <span className="mt-1.5 block font-sans text-xs text-ink/50">
          Comma-separated. Tap a suggestion to add it:
        </span>
        <span className="mt-3 flex flex-wrap gap-2">
          {MENTOR_EXPERTISE.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border border-gold/40 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-oxblood/70 transition-colors hover:border-oxblood hover:text-oxblood"
            >
              + {tag}
            </button>
          ))}
        </span>
      </label>

      <label className="block">
        <span className={LABEL}>Industries</span>
        <input
          className={`${FIELD} mt-2`}
          value={industries}
          onChange={(e) => setIndustries(e.target.value)}
          placeholder="Fintech, Healthcare, Automotive"
        />
      </label>

      <label className="block">
        <span className={LABEL}>Why you&rsquo;d be a good mentor *</span>
        <textarea
          className={`${FIELD} mt-2 min-h-[120px] resize-y`}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short pitch — what you can help with, and how you like to work with mentees."
          required
        />
      </label>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Availability</span>
          <input
            className={`${FIELD} mt-2`}
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="A call a month"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Max mentees at once</span>
          <input
            className={`${FIELD} mt-2`}
            type="number"
            min={1}
            value={maxMentees}
            onChange={(e) => setMaxMentees(e.target.value)}
            placeholder="e.g. 3 (optional)"
          />
          <span className="mt-1.5 block font-sans text-xs text-ink/50">
            Leave blank for no limit. We won&rsquo;t let you accept beyond this.
          </span>
        </label>
      </div>

      {error && (
        <p className="rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {busy ? "Saving…" : profile.is_mentor ? "Save changes" : "List me as a mentor"}
        </button>
        {profile.is_mentor && (
          <button
            type="button"
            onClick={withdraw}
            disabled={busy}
            className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/55 underline decoration-accent underline-offset-4 transition-colors hover:text-oxblood disabled:opacity-60"
          >
            Withdraw as mentor
          </button>
        )}
      </div>
    </form>
  );
}
