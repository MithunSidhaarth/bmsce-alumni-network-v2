"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { applyToPosting } from "../../actions";
import { STATUS_LABEL } from "@/components/PostingsBrowser";
import { createClient } from "@/lib/supabase/client";
import { safeUrl } from "@/lib/url";
import type { ApplicationStatus } from "@/lib/types";

type State =
  | { kind: "anon" }
  | { kind: "unverified" }
  | { kind: "owner" }
  | { kind: "applied"; status: ApplicationStatus }
  | { kind: "can-apply" };

type Prefill = {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
};

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory/60 px-4 py-2.5 font-sans text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/60";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RESUME = 5 * 1024 * 1024;

export default function ApplyBox({
  jobId,
  userId,
  state,
  prefill,
  externalLink,
}: {
  jobId: string;
  userId: string;
  state: State;
  prefill: Prefill;
  externalLink: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const linkedinHref = safeUrl(prefill.linkedin);
  const externalHref = safeUrl(externalLink);
  const [fullName, setFullName] = useState(prefill.fullName);
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  const [note, setNote] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const clearError = (k: string) =>
    setErrors((p) => {
      if (!p[k]) return p;
      const n = { ...p };
      delete n[k];
      return n;
    });
  const fieldClass = (k: string) =>
    errors[k] ? `${FIELD} border-oxblood/70` : FIELD;

  const onResume = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    clearError("resume");
    if (f && f.type !== "application/pdf") {
      setResume(null);
      setErrors((p) => ({ ...p, resume: "Resume must be a PDF." }));
      return;
    }
    if (f && f.size > MAX_RESUME) {
      setResume(null);
      setErrors((p) => ({ ...p, resume: "Resume must be under 5 MB." }));
      return;
    }
    setResume(f);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "This field is required.";
    if (!email.trim()) e.email = "This field is required.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (!phone.trim()) e.phone = "This field is required.";
    if (!note.trim()) e.note = "A short note is required.";
    if (!resume) e.resume = "A PDF resume is required.";
    return e;
  };

  const submit = () => {
    setError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    startTransition(async () => {
      try {
        // Upload the resume to the applicant's own private folder first.
        const path = `${userId}/${jobId}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("resumes")
          .upload(path, resume!, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upErr) throw upErr;

        await applyToPosting(jobId, {
          fullName,
          email,
          phone,
          coverNote: note,
          resumePath: path,
        });
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not apply.");
      }
    });
  };

  const shell = "border border-gold/30 bg-ivory-dim/50 p-6 md:p-8";

  if (done || state.kind === "applied") {
    const status = done ? "submitted" : (state as { status: ApplicationStatus }).status;
    return (
      <div className={shell}>
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          Your application
        </p>
        <p className="mt-3 font-display text-2xl italic text-oxblood">
          {STATUS_LABEL[status]}
        </p>
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink/70">
          {status === "submitted"
            ? "You've applied — the poster can see your profile and note."
            : status === "reviewed"
            ? "The poster has looked at your application."
            : status === "accepted"
            ? "You've been accepted for this role. Expect to hear from them."
            : "You weren't selected for this one. Plenty more on the board."}
        </p>
      </div>
    );
  }

  if (state.kind === "owner") {
    return (
      <div className={shell}>
        <p className="font-sans text-sm text-ink/70">
          This is your posting.
        </p>
        <Link
          href="/careers/my-postings"
          className="mt-4 inline-flex items-center justify-center rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
        >
          View applicants
        </Link>
      </div>
    );
  }

  if (state.kind === "anon") {
    return (
      <div className={shell}>
        <p className="font-sans text-sm text-ink/70">
          Sign in to apply to this opening.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (state.kind === "unverified") {
    return (
      <div className={shell}>
        <p className="font-sans text-sm text-ink/70">
          Your account needs to be verified before you can apply.
        </p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60">
        Apply
      </p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-ink/65">
        Confirm your details and attach your resume.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <ApplyField label="Full name" error={errors.fullName}>
          <input
            className={fieldClass("fullName")}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearError("fullName");
            }}
            placeholder="Your name"
          />
        </ApplyField>

        <ApplyField label="Email" error={errors.email}>
          <input
            className={fieldClass("email")}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            placeholder="you@email.com"
          />
        </ApplyField>

        <ApplyField label="Phone" error={errors.phone}>
          <input
            className={fieldClass("phone")}
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            placeholder="+91 …"
          />
        </ApplyField>

        <ApplyField label="Resume (PDF)" error={errors.resume}>
          <input
            type="file"
            accept="application/pdf"
            onChange={onResume}
            className="block w-full text-xs text-ink/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gold/40 file:bg-ivory-dim/60 file:px-3 file:py-1.5 file:font-sans file:text-[11px] file:uppercase file:tracking-[0.12em] file:text-ink"
          />
          {resume && (
            <p className="mt-1 font-sans text-xs text-ink/55">{resume.name}</p>
          )}
        </ApplyField>

        <ApplyField label="Why you're a fit" error={errors.note}>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              clearError("note");
            }}
            placeholder="A few lines on why you're a good match…"
            className={`${fieldClass("note")} min-h-[110px] resize-y`}
          />
        </ApplyField>

        {linkedinHref && (
          <div>
            <span className={LABEL}>LinkedIn (from your profile)</span>
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate font-sans text-sm text-oxblood underline decoration-accent underline-offset-2 hover:text-maroon"
            >
              {prefill.linkedin}
            </a>
          </div>
        )}
      </div>

      {error && <p className="mt-4 font-sans text-sm text-oxblood">{error}</p>}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="mt-3 font-sans text-sm text-oxblood">
          Please complete the required fields above.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {busy ? "Sending…" : "Submit application"}
        </button>
        {externalHref && (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
          >
            Apply on company site →
          </a>
        )}
      </div>
    </div>
  );
}

function ApplyField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label}
        <span className="text-oxblood"> *</span>
      </span>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p className="mt-1 font-sans text-xs text-oxblood">{error}</p>
      )}
    </label>
  );
}
