"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import { EXPERIENCE_LEVELS } from "@/lib/constants";
import type { ApplicationStatus, JobPosting, PostingType } from "@/lib/types";

const ALL = "all";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Applied",
  reviewed: "Under review",
  accepted: "Accepted",
  rejected: "Not selected",
};

export type PostingCard = JobPosting & {
  posterName: string | null;
  applicantCount?: number;
};

export default function PostingsBrowser({
  postings,
  initialType,
  myApplications,
  canPost,
}: {
  postings: PostingCard[];
  initialType: PostingType | typeof ALL;
  myApplications: Record<string, ApplicationStatus>;
  canPost: boolean;
}) {
  const [type, setType] = useState<string>(initialType);
  const [level, setLevel] = useState(ALL);
  const [place, setPlace] = useState(ALL);
  const [skill, setSkill] = useState(ALL);
  const [query, setQuery] = useState("");

  const locations = useMemo(
    () =>
      [...new Set(postings.map((p) => p.location).filter(Boolean))].sort() as string[],
    [postings]
  );
  const skills = useMemo(
    () =>
      [
        ...new Set(postings.flatMap((p) => p.skills_required ?? [])),
      ].sort() as string[],
    [postings]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return postings.filter((p) => {
      if (type !== ALL && p.type !== type) return false;
      if (level !== ALL && p.experience_level !== level) return false;
      if (place === "remote" && !p.remote) return false;
      if (place !== ALL && place !== "remote" && p.location !== place) return false;
      if (skill !== ALL && !(p.skills_required ?? []).includes(skill)) return false;
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.company.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [postings, type, level, place, skill, query]);

  const clear = () => {
    setType(ALL);
    setLevel(ALL);
    setPlace(ALL);
    setSkill(ALL);
    setQuery("");
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-[88px] z-30 border-y border-gold/30 bg-ivory/90 py-5 backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="lg:w-64">
            <label htmlFor="posting-search" className="sr-only">
              Search openings
            </label>
            <input
              id="posting-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search role or company…"
              className="w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-2.5 font-sans text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex-1">
            <Select
              label="Type"
              value={type}
              onChange={setType}
              allLabel="All types"
              options={[
                { value: "job", label: "Jobs" },
                { value: "internship", label: "Internships" },
              ]}
            />
            <Select
              label="Experience"
              value={level}
              onChange={setLevel}
              allLabel="Any experience"
              options={EXPERIENCE_LEVELS.map((l) => ({ value: l, label: l }))}
            />
            <Select
              label="Location"
              value={place}
              onChange={setPlace}
              allLabel="Anywhere"
              options={[
                { value: "remote", label: "Remote only" },
                ...locations.map((l) => ({ value: l, label: l })),
              ]}
            />
            <Select
              label="Skill"
              value={skill}
              onChange={setSkill}
              allLabel="Any skill"
              options={skills.map((s) => ({ value: s, label: s }))}
            />
          </div>

          <button
            type="button"
            onClick={clear}
            className="group shrink-0 self-start font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood lg:self-center"
          >
            <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
              Clear
            </span>
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/55">
          Showing {filtered.length} of {postings.length}
        </p>
        {canPost && (
          <Link
            href="/careers/post"
            className="rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
          >
            Post an opening
          </Link>
        )}
      </div>

      {postings.length === 0 ? (
        <Empty
          title="No openings posted yet."
          body="When members share jobs and internships, they'll show up here."
        />
      ) : filtered.length === 0 ? (
        <Empty
          title="Nothing matches those filters."
          body="Try clearing a filter or two."
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <PostingCardView
              key={p.id}
              posting={p}
              index={i}
              appliedStatus={myApplications[p.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostingCardView({
  posting,
  index,
  appliedStatus,
}: {
  posting: PostingCard;
  index: number;
  appliedStatus?: ApplicationStatus;
}) {
  const place = posting.remote
    ? posting.location
      ? `${posting.location} · Remote`
      : "Remote"
    : posting.location ?? "—";

  return (
    <Reveal delay={Math.min(index, 6) * 60} className="h-full">
      <Link
        href={`/careers/openings/${posting.id}`}
        className="flex h-full flex-col rounded-2xl border border-gold/25 bg-ivory-dim/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-gold/40 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-oxblood/80">
            {posting.type === "job" ? "Job" : "Internship"}
          </span>
          {appliedStatus && (
            <span className="font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
              {STATUS_LABEL[appliedStatus]}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-xl leading-snug text-ink">
          {posting.title}
        </h3>
        <p className="mt-1 font-sans text-sm text-ink/70">{posting.company}</p>
        <p className="mt-2 font-sans text-sm text-ink/55">{place}</p>

        {posting.experience_level && (
          <p className="mt-2 font-sans text-xs text-ink/50">
            {posting.experience_level}
          </p>
        )}

        <p className="mt-4 line-clamp-3 font-sans text-sm leading-relaxed text-ink/70">
          {posting.description}
        </p>

        {(posting.skills_required ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(posting.skills_required ?? []).slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded-full border border-gold/30 px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.1em] text-ink/60"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <span className="mt-auto pt-5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70">
          View &amp; apply →
        </span>
      </Link>
    </Reveal>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-3 py-2.5 font-sans text-sm text-ink focus:border-gold focus:outline-none"
    >
      <option value={ALL}>{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-20 text-center">
      <p className="font-display text-2xl italic text-ink">{title}</p>
      <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
        {body}
      </p>
    </div>
  );
}
