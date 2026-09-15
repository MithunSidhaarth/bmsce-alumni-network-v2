"use client";

import { useState, useTransition } from "react";
import { respondToRequest } from "../actions";
import MemberPhoto from "@/components/MemberPhoto";
import { safeUrl } from "@/lib/url";

export type Person = {
  id: string;
  name: string;
  branch: string | null;
  gradYear: number | null;
  userType: string | null;
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  // only populated once the request is accepted
  email: string | null;
  linkedin: string | null;
};

export type ReqView = {
  id: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  createdAt: string;
  person: Person;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function IncomingList({ requests }: { requests: ReqView[] }) {
  if (requests.length === 0) {
    return <Empty text="No requests yet." />;
  }
  return (
    <ul className="flex flex-col gap-4">
      {requests.map((r) => (
        <IncomingCard key={r.id} req={r} />
      ))}
    </ul>
  );
}

function IncomingCard({ req }: { req: ReqView }) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const respond = (decision: "accepted" | "declined") => {
    setError(null);
    startTransition(async () => {
      try {
        await respondToRequest(req.id, decision);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <li className="rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <Avatar person={req.person} />
          <div>
            <h3 className="font-display text-xl text-ink">{req.person.name}</h3>
            <p className="mt-1 font-sans text-sm text-ink/60">
              {[
                req.person.userType === "student" ? "Current student" : "Alum",
                req.person.branch,
                req.person.gradYear ? `Class of ${req.person.gradYear}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {req.message && (
              <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink/75">
                &ldquo;{req.message}&rdquo;
              </p>
            )}
            {req.status === "accepted" && (
              <Contact person={req.person} />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {req.status === "pending" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond("accepted")}
                className="rounded-sm bg-oxblood px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond("declined")}
                className="rounded-sm border border-gold/50 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60"
              >
                Decline
              </button>
            </>
          ) : (
            <StatusPill status={req.status} />
          )}
        </div>
      </div>
      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
    </li>
  );
}

export function OutgoingList({ requests }: { requests: ReqView[] }) {
  if (requests.length === 0) {
    return <Empty text="You haven't requested mentorship yet." />;
  }
  return (
    <ul className="flex flex-col gap-4">
      {requests.map((r) => (
        <li key={r.id} className="rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <Avatar person={r.person} />
              <div>
                <h3 className="font-display text-xl text-ink">
                  {r.person.name}
                </h3>
                <p className="mt-1 font-sans text-sm text-ink/60">
                  {[r.person.title, r.person.company].filter(Boolean).join(", ")}
                </p>
                {r.message && (
                  <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink/70">
                    You wrote: &ldquo;{r.message}&rdquo;
                  </p>
                )}
                {r.status === "accepted" && <Contact person={r.person} />}
              </div>
            </div>
            <StatusPill status={r.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Avatar({ person }: { person: Person }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/40 font-display text-base italic text-oxblood">
      {person.photoUrl ? (
        <MemberPhoto src={person.photoUrl} />
      ) : (
        initials(person.name)
      )}
    </div>
  );
}

function Contact({ person }: { person: Person }) {
  if (!person.email && !person.linkedin) return null;
  const linkedinHref = safeUrl(person.linkedin);
  return (
    <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        Contact
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 font-sans text-sm text-ink/75">
        {person.email && <span>{person.email}</span>}
        {linkedinHref && (
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-oxblood underline decoration-accent underline-offset-2"
          >
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "accepted" | "declined" | "pending" }) {
  const label =
    status === "accepted"
      ? "✓ Accepted"
      : status === "declined"
      ? "Declined"
      : "Pending";
  const tone =
    status === "accepted"
      ? "border-gold/50 bg-gold/10 text-accent"
      : status === "declined"
      ? "border-ink/20 bg-ink/5 text-ink/50"
      : "border-gold/40 bg-ivory/60 text-ink/60";
  return (
    <span
      className={`shrink-0 self-start rounded-lg border px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] ${tone}`}
    >
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-14 text-center">
      <p className="font-display text-xl italic text-ink">{text}</p>
    </div>
  );
}
