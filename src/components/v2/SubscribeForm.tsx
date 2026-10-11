"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Email signup for the article digest. Consent is explicit (the checkbox),
// recorded with a timestamp, and every email carries an unsubscribe link.
export default function SubscribeForm({
  source,
  tone = "light",
}: {
  source: string;
  tone?: "light" | "dark";
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const dark = tone === "dark";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!form.get("consent")) {
      setState("error");
      setMessage("Tick the box so we know you want these emails.");
      return;
    }
    setState("busy");
    const { error } = await createClient().rpc("newsletter_subscribe", {
      p_email: String(form.get("email") ?? ""),
      p_source: source,
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("done");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className={`mt-4 text-sm font-medium ${dark ? "text-lime" : "text-forest"}`}>
        You are on the list. Thanks for signing up.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4" noValidate>
      <div className="flex gap-2">
        <label htmlFor={`sub-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`sub-${source}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={`h-11 min-w-0 flex-1 rounded-full border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-lime ${
            dark
              ? "border-ivory/30 bg-ivory/10 text-ivory placeholder:text-ivory/45"
              : "border-ink/25 bg-paper text-ink placeholder:text-ink/45"
          }`}
        />
        <button type="submit" disabled={state === "busy"} className="btn btn-lime btn-sm h-11 shrink-0 px-5">
          {state === "busy" ? "Adding" : "Subscribe"}
        </button>
      </div>
      <label className={`mt-3 flex items-start gap-2 text-xs ${dark ? "text-ivory/60" : "text-ink/60"}`}>
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[#c8f53c]" />
        <span>I agree to receive the BMSCE Alumni Network digest by email.</span>
      </label>
      {state === "error" && (
        <p role="alert" className={`mt-2 text-xs ${dark ? "text-[#ffb3a3]" : "text-pin"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
