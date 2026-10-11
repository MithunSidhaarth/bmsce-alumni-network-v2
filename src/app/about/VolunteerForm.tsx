"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/70 focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/70";

// Inserts straight into volunteer_signups (RLS: anyone may insert, only
// admins may read). Column length checks are enforced by the database too.
export default function VolunteerForm() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle"
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    setState("busy");
    const { error } = await createClient()
      .from("volunteer_signups")
      .insert({
        name: g("name"),
        email: g("email"),
        batch: g("batch") || null,
        city: g("city") || null,
        message: g("message") || null,
      });
    setState(error ? "error" : "done");
  };

  if (state === "done") {
    return (
      <p className="mt-8 max-w-xl rounded-2xl border border-gold/40 bg-ivory p-6 font-sans text-base text-ink/80">
        Thank you. We&rsquo;ve got your details and will be in touch soon.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-xl flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={LABEL}>Name *</span>
        <input name="name" required maxLength={120} className={FIELD} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={LABEL}>Email *</span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          className={FIELD}
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Class year and branch</span>
          <input name="batch" maxLength={60} className={FIELD} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>City</span>
          <input name="city" maxLength={120} className={FIELD} />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className={LABEL}>How would you like to help?</span>
        <textarea name="message" rows={4} maxLength={2000} className={FIELD} />
      </label>
      {state === "error" && (
        <p role="alert" className="font-sans text-sm text-oxblood">
          Something went wrong. Please try again, or email us directly.
        </p>
      )}
      <button
        disabled={state === "busy"}
        className="self-start rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-50"
      >
        {state === "busy" ? "Sending…" : "Volunteer with us"}
      </button>
    </form>
  );
}
