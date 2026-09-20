"use client";

import { useState } from "react";
import Eyebrow from "@/components/Eyebrow";
import LoginButtons from "./LoginButtons";

// Client-side alumni/student switch: toggling used to be a <Link> to
// /login?as=student, i.e. a full server render (session + profile lookup)
// per click. State + history.replaceState makes it instant and keeps the URL
// shareable.
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

  const toggle = (student: boolean) => {
    setIsStudent(student);
    const params = new URLSearchParams();
    if (student) params.set("as", "student");
    if (next !== "/") params.set("next", next);
    const q = params.toString();
    window.history.replaceState(null, "", q ? `/login?${q}` : "/login");
  };

  const linkClass =
    "border-b border-gold pb-0.5 text-oxblood transition-colors hover:border-oxblood";

  return (
    <>
      <Eyebrow>{isStudent ? "For students" : "Members"}</Eyebrow>
      <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
        {isStudent ? "Find a mentor." : "Welcome back."}
      </h1>
      <p className="mt-5 font-sans text-base leading-relaxed text-ink/70">
        {isStudent
          ? "Sign in to connect with BMS alumni who can guide you. Current students welcome."
          : "Sign in to reach the network: the directory, chapters, events, and mentorship."}
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood">
          Something went wrong signing you in. Please try again.
        </p>
      )}

      <div className="mt-10">
        <LoginButtons userType={isStudent ? "student" : "alumni"} next={next} />
      </div>

      <p className="mt-8 font-sans text-sm text-ink/60">
        {isStudent ? "Are you an alumnus? " : "Current BMS student looking for a mentor? "}
        <button
          type="button"
          onClick={() => toggle(!isStudent)}
          className={linkClass}
        >
          {isStudent ? "Sign in here" : "Start here"}
        </button>
        .
      </p>

      <p className="mt-6 font-sans text-xs leading-relaxed text-ink/45">
        By continuing you agree to be part of the BMSCE Alumni Network
        community. Alumni profiles are reviewed before appearing in the
        directory.
      </p>
    </>
  );
}
