"use client";

import { useState } from "react";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import LoginButtons from "../login/LoginButtons";

const AUDIENCES = [
  {
    key: "alumni" as const,
    title: "I'm an alumnus",
    body: "Graduated from BMSCE. Reconnect with your batch and chapter.",
  },
  {
    key: "student" as const,
    title: "I'm a student",
    body: "Currently at BMSCE. Meet alumni who can guide you.",
  },
];

// New members. Choosing who you are up front makes the next screen (profile
// setup) feel earned rather than a form dump, and the audience is carried
// through OAuth to onboarding via the `as` query param.
export default function JoinPanel({
  initialStudent,
  next,
  error,
}: {
  initialStudent: boolean;
  next: string;
  error: boolean;
}) {
  const [audience, setAudience] = useState<"alumni" | "student">(
    initialStudent ? "student" : "alumni"
  );

  const pick = (a: "alumni" | "student") => {
    setAudience(a);
    window.history.replaceState(
      null,
      "",
      a === "student" ? "/join?as=student" : "/join"
    );
  };

  return (
    <>
      <Eyebrow>New here</Eyebrow>
      <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[0.98] tracking-tight text-ink">
        Join the <span className="italic text-accent">network.</span>
      </h1>
      <p className="mt-4 font-sans text-base leading-relaxed text-ink/70">
        Two minutes to set up. Once you&rsquo;re verified as a BMS graduate or
        student, the whole network opens up.
      </p>

      <fieldset className="mt-8">
        <legend className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/50">
          Step 1 · Who are you?
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {AUDIENCES.map((a) => {
            const on = audience === a.key;
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={on}
                onClick={() => pick(a.key)}
                className={`rounded-2xl border p-5 text-left transition-all duration-200 ${
                  on
                    ? "border-oxblood bg-oxblood text-ivory shadow-[0_16px_36px_-20px_rgba(20,34,64,0.7)]"
                    : "border-gold/50 bg-ivory hover:-translate-y-0.5 hover:border-oxblood/50"
                }`}
              >
                <span className="block font-display text-xl">{a.title}</span>
                <span
                  className={`mt-2 block font-sans text-[13px] leading-relaxed ${
                    on ? "text-ivory/75" : "text-ink/60"
                  }`}
                >
                  {a.body}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood"
        >
          Something went wrong signing you up. Please try again.
        </p>
      )}

      <div className="mt-8">
        <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/50">
          Step 2 · Create your account
        </p>
        <LoginButtons userType={audience} next={next} mode="join" />
      </div>

      <p className="mt-6 font-sans text-xs leading-relaxed text-ink/45">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink/70">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink/70">
          Privacy Policy
        </Link>
        . Alumni profiles are reviewed before appearing in the directory.
      </p>

      <div className="mt-8 flex items-center gap-4 border-t border-gold/30 pt-6">
        <p className="font-sans text-sm text-ink/60">Already a member?</p>
        <Link
          href={next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="rounded-sm border border-oxblood/30 px-4 py-2 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood transition-colors hover:border-oxblood"
        >
          Sign in →
        </Link>
      </div>
    </>
  );
}
