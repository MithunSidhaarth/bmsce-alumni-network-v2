"use client";

import { useMemo, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createPosting } from "../actions";
import { EXPERIENCE_LEVELS } from "@/lib/constants";
import type { PostingType } from "@/lib/types";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60";

const STEPS = ["Basics", "Requirements", "Details"] as const;

export default function PostOpeningForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Basics (required bits live here so nothing blocks later)
  const [type, setType] = useState<PostingType>("job");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [description, setDescription] = useState("");

  // Requirements
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [responsibilities, setResponsibilities] = useState("");

  // Details
  const [stipendOrSalary, setStipendOrSalary] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [externalLink, setExternalLink] = useState("");

  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const basicsValid = useMemo(
    () => !!(title.trim() && company.trim() && description.trim()),
    [title, company, description]
  );

  const addSkill = (raw: string) => {
    const s = raw.trim().replace(/,$/, "");
    if (!s) return;
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    setSkills((cur) => [...cur, s]);
    setSkillDraft("");
  };

  const onSkillKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillDraft);
    } else if (e.key === "Backspace" && !skillDraft && skills.length) {
      setSkills((cur) => cur.slice(0, -1));
    }
  };

  const publish = () => {
    setError(null);
    if (!basicsValid) {
      setStep(0);
      setError("Title, company and description are required.");
      return;
    }
    startTransition(async () => {
      try {
        const id = await createPosting({
          title,
          company,
          type,
          location,
          remote,
          description,
          responsibilities,
          skills,
          experienceLevel,
          duration,
          stipendOrSalary,
          applicationDeadline,
          externalLink,
        });
        router.push(`/careers/openings/${id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not publish.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <div>
        {/* Step nav */}
        <div className="flex gap-1 border-b border-gold/30">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={`-mb-px border-b-2 px-4 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${
                step === i
                  ? "border-oxblood text-oxblood"
                  : "border-transparent text-ink/50 hover:text-oxblood"
              }`}
            >
              <span className="text-ink/35">{i + 1}.</span> {s}
              {i === 0 && !basicsValid && (
                <span className="ml-1 text-oxblood">*</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-7">
          {step === 0 && (
            <>
              <div>
                <span className={LABEL}>This is a…</span>
                <div className="mt-3 inline-flex rounded-xl border border-gold/40 p-1">
                  {(["job", "internship"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`rounded-[2px] px-5 py-2 font-sans text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${
                        type === t
                          ? "bg-oxblood text-ivory"
                          : "text-ink/70 hover:text-oxblood"
                      }`}
                    >
                      {t === "job" ? "Job" : "Internship"}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Role title" required>
                <input
                  className={FIELD}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior Backend Engineer"
                />
              </Field>

              <Field label="Company" required>
                <input
                  className={FIELD}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Razorpay"
                />
              </Field>

              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
                <Field label="Location">
                  <input
                    className={FIELD}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Bengaluru, India"
                  />
                </Field>
                <label className="flex items-end gap-3 pb-3">
                  <input
                    type="checkbox"
                    checked={remote}
                    onChange={(e) => setRemote(e.target.checked)}
                    className="h-4 w-4 accent-[#5b1220]"
                  />
                  <span className="font-sans text-sm text-ink/75">
                    Remote friendly
                  </span>
                </label>
              </div>

              <Field label="Description" required>
                <textarea
                  className={`${FIELD} min-h-[140px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What the role is, and what makes it worth someone's time."
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <span className={LABEL}>Skills</span>
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-ivory-dim/40 px-3 py-2.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-ivory/70 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-oxblood"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() =>
                          setSkills((cur) => cur.filter((x) => x !== s))
                        }
                        aria-label={`Remove ${s}`}
                        className="text-oxblood/60 hover:text-oxblood"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={onSkillKey}
                    onBlur={() => addSkill(skillDraft)}
                    placeholder={
                      skills.length ? "Add another…" : "Type a skill, press Enter"
                    }
                    className="min-w-[160px] flex-1 bg-transparent py-1 font-sans text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
                <span className="mt-1.5 block font-sans text-xs text-ink/50">
                  Press Enter after each skill.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
                <Field label="Experience level">
                  <select
                    className={FIELD}
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                  >
                    <option value="">Any / not specified</option>
                    {EXPERIENCE_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Duration">
                  <input
                    className={FIELD}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="6 months / Full-time"
                  />
                </Field>
              </div>

              <Field label="Responsibilities">
                <textarea
                  className={`${FIELD} min-h-[110px] resize-y`}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="Day to day, what they'd own."
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Stipend / salary">
                <input
                  className={FIELD}
                  value={stipendOrSalary}
                  onChange={(e) => setStipendOrSalary(e.target.value)}
                  placeholder="₹12-18 LPA · Competitive · Unpaid"
                />
              </Field>
              <Field label="Apply by">
                <input
                  className={FIELD}
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                />
              </Field>
              <Field label="External application link">
                <input
                  className={FIELD}
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://company.com/careers/…"
                />
                <span className="mt-1.5 block font-sans text-xs text-ink/50">
                  Optional — people can still apply here in-app.
                </span>
              </Field>
            </>
          )}
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-gold/25 pt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-sm border border-gold/50 px-5 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/70 hover:border-oxblood hover:text-oxblood"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-sm border border-gold/50 px-5 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/70 hover:border-oxblood hover:text-oxblood"
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={publish}
            disabled={busy || !basicsValid}
            title={!basicsValid ? "Fill in title, company and description first" : ""}
            className="rounded-sm bg-oxblood px-8 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish opening"}
          </button>
          <span className="font-sans text-xs text-ink/45">
            Only the basics are required — the rest is optional.
          </span>
        </div>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className={LABEL}>Live preview</p>
        <div className="mt-3 flex flex-col rounded-2xl border border-gold/25 bg-ivory-dim/60 p-6">
          <span className="w-fit rounded-full border border-gold/40 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-oxblood/80">
            {type === "job" ? "Job" : "Internship"}
          </span>
          <h3 className="mt-4 font-display text-xl leading-snug text-ink">
            {title || "Role title"}
          </h3>
          <p className="mt-1 font-sans text-sm text-ink/70">
            {company || "Company"}
          </p>
          <p className="mt-2 font-sans text-sm text-ink/55">
            {remote
              ? location
                ? `${location} · Remote`
                : "Remote"
              : location || "Location"}
          </p>
          {experienceLevel && (
            <p className="mt-2 font-sans text-xs text-ink/50">
              {experienceLevel}
            </p>
          )}
          <p className="mt-4 line-clamp-3 font-sans text-sm leading-relaxed text-ink/70">
            {description || "Your description will appear here."}
          </p>
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-gold/30 px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.1em] text-ink/60"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
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
