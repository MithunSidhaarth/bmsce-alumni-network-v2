"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountManagement({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pull together everything this member owns and download it as JSON.
  const exportData = async () => {
    setExporting(true);
    setError(null);
    try {
      const supabase = createClient();
      const [profile, contact, mentorship, postings, applications] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase
            .from("member_contacts")
            .select("*")
            .eq("member_id", userId)
            .maybeSingle(),
          supabase
            .from("mentorship_requests")
            .select("*")
            .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`),
          supabase.from("job_postings").select("*").eq("posted_by", userId),
          supabase
            .from("job_applications")
            .select("*")
            .eq("applicant_id", userId),
        ]);

      const payload = {
        exported_at: new Date().toISOString(),
        profile: profile.data ?? null,
        contact: contact.data ?? null,
        mentorship_requests: mentorship.data ?? [],
        job_postings: postings.data ?? [],
        job_applications: applications.data ?? [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bms-alumni-data-${userId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = () => {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.rpc("delete_my_account");
        if (error) throw new Error(error.message);
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete account.");
      }
    });
  };

  return (
    <div className="mt-16 border-t border-gold/25 pt-10">
      <h2 className="font-display text-2xl text-ink">Your data & account</h2>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="rounded-sm border border-gold/50 px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60"
        >
          {exporting ? "Preparing…" : "Download my data (JSON)"}
        </button>
        <p className="font-sans text-sm text-ink/55">
          A copy of your profile and activity.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-oxblood/25 bg-oxblood/5 p-6">
        <h3 className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood">
          Delete account
        </h3>
        <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink/70">
          Permanently deletes your profile, contact details, mentorship
          requests, job postings, and applications. This <strong>cannot be
          undone</strong>.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-5 rounded-sm border border-oxblood/40 px-6 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood/80 transition-colors hover:border-oxblood hover:bg-oxblood hover:text-ivory"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            <label className="font-sans text-sm text-ink/70">
              Type <span className="font-semibold text-oxblood">DELETE</span> to
              confirm:
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-2 block w-full max-w-xs rounded-xl border border-gold/40 bg-ivory/70 px-4 py-2.5 font-sans text-sm text-ink focus:border-gold focus:outline-none"
                placeholder="DELETE"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || confirmText !== "DELETE"}
                onClick={deleteAccount}
                className="rounded-sm bg-oxblood px-6 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-maroon disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                }}
                className="rounded-sm border border-gold/50 px-6 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/70 hover:text-oxblood disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 font-sans text-sm text-oxblood">{error}</p>}
      </div>
    </div>
  );
}
