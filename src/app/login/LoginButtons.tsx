"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { userType?: "alumni" | "student"; next?: string };

export default function LoginButtons({
  userType = "alumni",
  next = "/",
}: Props) {
  const [loading, setLoading] = useState<null | "google" | "linkedin_oidc">(
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const signIn = async (provider: "google" | "linkedin_oidc") => {
    setLoading(provider);
    // Carry both the post-login destination and the chosen entry path
    // (student/alumni) through the callback route as query params — not
    // localStorage, which persists across sessions on a shared computer and
    // can be edited from devtools. The callback route re-validates `type`
    // against a strict whitelist before it ever reaches the onboarding form.
    const params = new URLSearchParams();
    if (next !== "/") params.set("next", next);
    params.set("as", userType);
    const callback = `${window.location.origin}/auth/callback?${params.toString()}`;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback },
    });
    if (error) setLoading(null);
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setPasswordError(error.message);
      setPasswordLoading(false);
      return;
    }
    // Full navigation so the server picks up the new session cookie.
    window.location.href = next;
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={loading !== null}
        className="inline-flex items-center justify-center gap-3 rounded-sm border border-gold/40 bg-ivory-dim/40 px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:border-gold hover:bg-ivory-dim disabled:opacity-60"
      >
        <GoogleMark />
        {loading === "google" ? "Redirecting…" : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={() => signIn("linkedin_oidc")}
        disabled={loading !== null}
        className="inline-flex items-center justify-center gap-3 rounded-sm border border-gold/40 bg-ivory-dim/40 px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:border-gold hover:bg-ivory-dim disabled:opacity-60"
      >
        <LinkedInMark />
        {loading === "linkedin_oidc" ? "Redirecting…" : "Continue with LinkedIn"}
      </button>

      {!showPassword ? (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="mt-1 font-sans text-xs text-ink/50 underline underline-offset-2 hover:text-ink/70"
        >
          Sign in with email and password instead
        </button>
      ) : (
        <form onSubmit={signInWithPassword} className="mt-2 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-sm border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink outline-none focus:border-gold"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-sm border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink outline-none focus:border-gold"
          />
          {passwordError && (
            <p className="font-sans text-xs text-oxblood">{passwordError}</p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center justify-center rounded-sm border border-gold/40 bg-ivory-dim/40 px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:border-gold hover:bg-ivory-dim disabled:opacity-60"
          >
            {passwordLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
      />
    </svg>
  );
}
