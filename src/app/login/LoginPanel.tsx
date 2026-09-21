"use client";

import { useState } from "react";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import LoginButtons from "./LoginButtons";

// Returning members. Alumni/student switch is client state + replaceState so
// it is instant (a <Link> would re-render the whole server page).
export default function LoginPanel({
  initialStudent,
  next,
  error,
}: {
  initialStudent: boolean;
  next: string;
  error: boolean;
}) {
  const [isStudent, setIsStudent] = useState(initialStudent);

  const choose = (student: boolean) => {
    setIsStudent(student);
    const params = new URLSearchParams();
    if (student) params.set("as", "student");
    if (next !== "/") params.set("next", next);
    const q = params.toString();
    window.history.replaceState(null, "", q ? `/login?${q}` : "/login");
  };

  const joinHref = `/join${isStudent ? "?as=student" : ""}`;

  return (
    <>
      <div className="hidden lg:block">
        <Eyebrow>Members</Eyebrow>
        <h1 className="mt-5 font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.02] tracking-tight text-ink">
          Welcome back.
        </h1>
        <p className="mt-4 font-sans text-base leading-relaxed text-ink/70">
          Pick up where you left off: the directory, your chapter, events, and
          your conversations.
        </p>
      </div>

      {/* I am a… */}
      <div
        role="tablist"
        aria-label="I am signing in as"
        className="grid grid-cols-2 gap-1 rounded-xl lg:mt-8 border border-gold/40 bg-ivory-dim/50 p-1"
      >
        {[
          { label: "Alumnus", student: false },
          { label: "Current student", student: true },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={isStudent === t.student}
            onClick={() => choose(t.student)}
            className={`rounded-lg px-3 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${
              isStudent === t.student
                ? "bg-oxblood text-ivory shadow-sm"
                : "text-ink/60 hover:text-oxblood"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood"
        >
          Something went wrong signing you in. Please try again.
        </p>
      )}

      <div className="mt-6">
        <LoginButtons
          userType={isStudent ? "student" : "alumni"}
          next={next}
          mode="login"
        />
      </div>

      <div className="mt-10 flex items-center gap-4 border-t border-gold/30 pt-6">
        <p className="font-sans text-sm text-ink/60">New to the network?</p>
        <Link
          href={joinHref}
          className="rounded-sm border border-oxblood/30 px-4 py-2 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood transition-colors hover:border-oxblood"
        >
          Join now →
        </Link>
      </div>
    </>
  );
}
