"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Links a LinkedIn identity to the signed-in account. Requires "Allow manual
// linking" to be enabled in Supabase Auth settings; otherwise the error is
// shown so it's obvious what to switch on.
export default function VerifyLinkedIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = async () => {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.linkIdentity({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={link}
        disabled={busy}
        className="rounded-sm border border-[#0A66C2]/40 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/5 disabled:opacity-60"
      >
        {busy ? "Redirecting…" : "Verify with LinkedIn"}
      </button>
      {error && <p className="mt-2 font-sans text-xs text-oxblood">{error}</p>}
    </div>
  );
}
