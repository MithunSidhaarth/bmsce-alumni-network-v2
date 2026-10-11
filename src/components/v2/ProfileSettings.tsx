"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Privacy } from "@/lib/types";

const DM_OPTIONS: { value: Privacy["dm"]; label: string; hint: string }[] = [
  { value: "members", label: "Any verified member", hint: "Anyone in the network can start a conversation with you." },
  { value: "chapters", label: "Only people in my chapters", hint: "A member has to share a chapter with you to write first." },
  { value: "nobody", label: "Nobody", hint: "No new conversations. Ones you already have stay open." },
];

const clean = (value: string) =>
  [...new Set(value.split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean))].slice(0, 12);

/**
 * Skills, interests and privacy. Saved straight to the member's own profile
 * row; Row Level Security only lets a member update their own.
 */
export default function ProfileSettings({
  userId,
  skills,
  interests,
  privacy,
  usn,
}: {
  userId: string;
  skills: string[];
  interests: string[];
  privacy: Privacy;
  /** The roll number printed on the member's college ID card, if they gave it. */
  usn: string | null;
}) {
  const router = useRouter();
  const [skillText, setSkillText] = useState(skills.join(", "));
  const [interestText, setInterestText] = useState(interests.join(", "));
  const [p, setP] = useState<Privacy>(privacy);
  const [usnText, setUsnText] = useState(usn ?? "");
  const [state, setState] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setState({});
      const roll = usnText.toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (roll && (roll.length < 6 || roll.length > 12)) {
        setState({ error: "An ID number is 6 to 12 letters and digits, for example 1BM19CS001." });
        return;
      }
      const { error } = await createClient()
        .from("profiles")
        .update({ skills: clean(skillText), interests: clean(interestText), privacy: p, usn: roll || null })
        .eq("id", userId);
      if (error) setState({ error: error.message });
      else {
        setState({ ok: "Saved." });
        router.refresh();
      }
    });

  const toggle = (key: "show_work" | "show_location" | "show_linkedin" | "show_online", label: string, hint: string) => (
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={p[key] !== false} onChange={(e) => setP({ ...p, [key]: e.target.checked })} className="mt-1 h-4 w-4" />
      <span className="text-sm">
        {label}
        <span className="block text-xs text-ink/60">{hint}</span>
      </span>
    </label>
  );

  return (
    <section aria-labelledby="settings-title" className="sheet mt-12 px-5 py-6 sm:px-7">
      <h2 id="settings-title" className="font-display text-2xl">
        Skills, interests, ID card and privacy
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Skills (comma separated)</span>
          <input value={skillText} onChange={(e) => setSkillText(e.target.value)} className="field" placeholder="Structural design, Python, Fundraising" />
        </label>
        <label>
          <span className="field-label">Interests (comma separated)</span>
          <input value={interestText} onChange={(e) => setInterestText(e.target.value)} className="field" placeholder="Trekking, Carnatic music, Startups" />
        </label>
      </div>

      <label className="mt-4 block sm:max-w-xs">
        <span className="field-label">College ID number (USN), optional</span>
        <input
          value={usnText}
          onChange={(e) => setUsnText(e.target.value.toUpperCase())}
          maxLength={14}
          autoCapitalize="characters"
          className="field font-mono"
          placeholder="1BM19CS001"
        />
        <span className="mt-1 block text-xs text-ink/60">Printed on your ID card, which other members can see on your profile.</span>
      </label>

      <fieldset className="mt-7">
        <legend className="text-[0.9375rem] font-bold">Who can message you first</legend>
        <div className="mt-3 flex flex-col gap-2.5">
          {DM_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-start gap-3">
              <input type="radio" name="dm" checked={p.dm === o.value} onChange={() => setP({ ...p, dm: o.value })} className="mt-1 h-4 w-4" />
              <span className="text-sm">
                {o.label}
                <span className="block text-xs text-ink/60">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="text-[0.9375rem] font-bold">What other members see on your profile</legend>
        <div className="mt-3 flex flex-col gap-2.5">
          {toggle("show_work", "Company, role and industry", "Hidden from your profile page when off.")}
          {toggle("show_location", "City and country", "Hidden from your profile page when off.")}
          {toggle("show_linkedin", "LinkedIn link", "Hidden from your profile page when off.")}
          {toggle("show_online", "A green dot while I am online", "Shown beside your name in Messages. You still see others when this is off.")}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink/60">
          Your email addresses and phone number are never shown on your profile. They are stored separately and are visible only to
          you, the admins, and a mentor or mentee you have accepted.
        </p>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn">
          {pending ? "Saving" : "Save settings"}
        </button>
        {state.ok && <p role="status" className="text-sm text-forest">{state.ok}</p>}
        {state.error && <p role="alert" className="text-sm text-pin">{state.error}</p>}
      </div>
    </section>
  );
}
