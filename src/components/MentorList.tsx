"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import { sendMentorshipRequest } from "@/app/careers/mentorship/actions";
import MemberPhoto from "@/components/MemberPhoto";

export type MentorCard = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  expertise: string[];
  industries: string[];
  availability: string | null;
  photoUrl: string | null;
};

type Viewer =
  | { state: "anon" }
  | { state: "unverified" }
  | { state: "eligible"; id: string };

export default function MentorList({
  mentors,
  viewer,
  requestedIds,
}: {
  mentors: MentorCard[];
  viewer: Viewer;
  requestedIds: Record<string, "pending" | "accepted" | "declined">;
}) {
  if (mentors.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-20 text-center">
        <p className="font-display text-2xl italic text-ink">
          No mentors have signed up yet.
        </p>
        <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
          As alumni volunteer their time, they&rsquo;ll appear here. Check back
          soon.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {mentors.map((m, i) => (
        <MentorCardView
          key={m.id}
          mentor={m}
          index={i}
          viewer={viewer}
          existing={requestedIds[m.id]}
        />
      ))}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MentorCardView({
  mentor,
  index,
  viewer,
  existing,
}: {
  mentor: MentorCard;
  index: number;
  viewer: Viewer;
  existing?: "pending" | "accepted" | "declined";
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const isSelf = viewer.state === "eligible" && viewer.id === mentor.id;
  const meta = [
    mentor.batch ? `Batch of ${mentor.batch}` : null,
    mentor.branch,
  ]
    .filter(Boolean)
    .join(" · ");
  const role = [mentor.title, mentor.company].filter(Boolean).join(", ");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await sendMentorshipRequest(mentor.id, message);
        setSent(true);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send request.");
      }
    });
  };

  const status = sent ? "pending" : existing;

  return (
    <Reveal delay={Math.min(index, 6) * 60} className="h-full">
      <article className="flex h-full flex-col rounded-2xl border border-gold/25 bg-ivory-dim/60 p-6 transition-all duration-300 hover:border-gold/60">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gold/40 font-display text-lg italic text-oxblood">
          {mentor.photoUrl ? (
            <MemberPhoto src={mentor.photoUrl} />
          ) : (
            initials(mentor.name)
          )}
        </div>

        <h2 className="mt-6 font-display text-xl text-ink">{mentor.name}</h2>
        {role && <p className="mt-1 font-sans text-sm text-ink/65">{role}</p>}
        {meta && <p className="mt-2 font-sans text-sm text-ink/55">{meta}</p>}

        {mentor.bio && (
          <p className="mt-4 font-sans text-sm leading-relaxed text-ink/70">
            {mentor.bio}
          </p>
        )}

        {(mentor.expertise.length > 0 || mentor.industries.length > 0) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {[...mentor.expertise, ...mentor.industries].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gold/40 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-oxblood/80"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {mentor.availability && (
          <p className="mt-4 font-sans text-xs text-ink/50">
            Availability: {mentor.availability}
          </p>
        )}

        {/* Action */}
        <div className="mt-auto pt-6">
          {isSelf ? (
            <p className="font-sans text-xs uppercase tracking-[0.12em] text-ink/45">
              This is you
            </p>
          ) : status ? (
            <p className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-accent">
              {status === "pending"
                ? "Request sent · pending"
                : status === "accepted"
                ? "✓ Accepted — see My mentorship"
                : "Declined"}
            </p>
          ) : viewer.state === "anon" ? (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
            >
              Sign in to request
            </Link>
          ) : viewer.state === "unverified" ? (
            <p className="font-sans text-xs text-ink/50">
              Your account must be verified before you can request mentorship.
            </p>
          ) : open ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What are you hoping to learn, and why this mentor?"
                className="min-h-[90px] w-full resize-y rounded-lg border border-gold/40 bg-ivory/60 px-3 py-2.5 font-sans text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send request"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-sm border border-gold/50 px-4 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/70 hover:text-oxblood"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
            >
              Request mentorship
            </button>
          )}
          {error && (
            <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>
          )}
        </div>
      </article>
    </Reveal>
  );
}
