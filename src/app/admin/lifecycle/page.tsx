import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Panel, Pill, table } from "@/components/v2/admin/ui";
import { runLifecycleNow, setMembership, setPassingOutDate } from "../manage";
import { requireAdmin } from "@/lib/me";
import { longDate, shortDate, clockTime } from "@/lib/format";

export const metadata: Metadata = { title: "Student to alumni · Admin" };
export const dynamic = "force-dynamic";

const REASON: Record<string, string> = {
  auto_graduation: "Automatic graduation",
  admin_override: "Admin override",
  date_correction: "Date corrected",
  date_correction_revert: "Reverted after date correction",
  hold_changed: "Hold changed",
};

type Member = {
  id: string;
  full_name: string | null;
  user_type: "student" | "alumni";
  graduation_year: number | null;
  passing_out_date: string | null;
  lifecycle_hold: boolean;
  lifecycle_note: string | null;
};

export default async function LifecycleAdmin({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const { supabase } = await requireAdmin();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const [review, due, events, runs, selected] = await Promise.all([
    supabase.rpc("lifecycle_needs_review"),
    supabase
      .from("profiles")
      .select("id, full_name, passing_out_date, lifecycle_hold")
      .eq("user_type", "student")
      .not("passing_out_date", "is", null)
      .order("passing_out_date")
      .limit(25),
    supabase
      .from("membership_events")
      .select("id, profile_id, from_type, to_type, reason, passing_out_date, note, created_at, profile:profiles!membership_events_profile_id_fkey(full_name), actor:profiles!membership_events_actor_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(member ? 200 : 40),
    supabase.from("job_runs").select("id, ok, detail, finished_at").eq("job", "membership_lifecycle").order("id", { ascending: false }).limit(8),
    member
      ? supabase.from("profiles").select("id, full_name, user_type, graduation_year, passing_out_date, lifecycle_hold, lifecycle_note").eq("id", member).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const m = selected.data as Member | null;
  const history = (events.data ?? []).filter((e) => !member || e.profile_id === member);
  const needs = (review.data ?? []) as { id: string; full_name: string | null; graduation_year: number | null; reason: string }[];
  const name = (v: unknown) => (Array.isArray(v) ? v[0]?.full_name : (v as { full_name?: string } | null)?.full_name) ?? null;

  return (
    <>
      <AdminHeader
        title="Student to alumni"
        lead={
          <>
            A scheduled database job moves a student to alumni when their recorded passing-out date arrives. It runs every six hours
            (one run lands at 00:05 India time), compares dates in India Standard Time, and only ever acts on a real date: a missing
            date or a held account is never graduated. Today in network time is <strong>{longDate(`${today}T12:00:00+05:30`)}</strong>.
          </>
        }
      >
        <AdminForm action={runLifecycleNow}>
          <Submit className="btn btn-ghost btn-sm">Run the job now</Submit>
        </AdminForm>
      </AdminHeader>

      {m && (
        <Panel title={`${m.full_name ?? "Member"}: ${m.user_type === "student" ? "Student" : "Alumni"}`} aside={<Link href="/admin/lifecycle" className="text-sm font-semibold text-forest underline">Close</Link>}>
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminForm action={setPassingOutDate} hidden={{ id: m.id }} className="flex flex-col gap-3">
              <p className="text-sm font-bold">Passing-out date</p>
              <label>
                <span className="field-label">Date (leave empty to clear)</span>
                <input type="date" name="date" defaultValue={m.passing_out_date ?? ""} className="field" />
              </label>
              <label>
                <span className="field-label">Note for the history</span>
                <input name="note" className="field" placeholder="e.g. confirmed with the department" />
              </label>
              <div><Submit>Save date</Submit></div>
              <p className="text-xs leading-relaxed text-ink/70">
                How a correction treats a transition that already happened: if this member was graduated <em>automatically</em> and
                the corrected date is still in the future, that graduation is reversed and they become a student again until the new
                date. A change made by an admin by hand is never reversed by a date. A corrected date that has already passed
                graduates a student immediately.
              </p>
            </AdminForm>

            <AdminForm action={setMembership} hidden={{ id: m.id }} className="flex flex-col gap-3">
              <p className="text-sm font-bold">Override</p>
              <label>
                <span className="field-label">Membership status</span>
                <select name="type" defaultValue={m.user_type} className="field">
                  <option value="student">Student</option>
                  <option value="alumni">Alumni</option>
                </select>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="hold" defaultChecked={m.lifecycle_hold} className="mt-1 h-4 w-4" />
                <span>
                  Hold: do not graduate automatically
                  <span className="block text-xs text-ink/70">For a postponed graduation, a year back, or any case that needs a person to decide.</span>
                </span>
              </label>
              <label>
                <span className="field-label">Reason (kept in the history)</span>
                <input name="note" defaultValue={m.lifecycle_note ?? ""} className="field" />
              </label>
              <div><Submit confirm="Apply this override? It is recorded in the membership history.">Apply override</Submit></div>
            </AdminForm>
          </div>
        </Panel>
      )}

      <Panel title={`Needs a person (${needs.length})`}>
        {needs.length === 0 ? (
          <p className="text-sm text-ink/70">Every student has a usable passing-out date.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink/70">
              These students will not graduate automatically. A graduation year alone is not turned into a date, because the exact
              day differs by programme and year. Open each one and enter the confirmed date.
            </p>
            <div className={table.wrap}>
              <table className="w-full border-collapse text-left text-sm">
                <thead><tr><th className={table.th}>Student</th><th className={table.th}>Year on file</th><th className={table.th}>Why</th><th className={table.th} /></tr></thead>
                <tbody>
                  {needs.map((n) => (
                    <tr key={n.id}>
                      <td className={table.td}>{n.full_name ?? "No name yet"}</td>
                      <td className={table.td}>{n.graduation_year ?? "None"}</td>
                      <td className={table.td}>{n.reason}</td>
                      <td className={table.td}><Link href={`/admin/lifecycle?member=${n.id}`} className="font-semibold text-forest underline">Fix</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Next to graduate">
        {(due.data ?? []).length === 0 ? (
          <p className="text-sm text-ink/70">No student has a passing-out date on file.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 text-sm">
            {due.data!.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <Link href={`/admin/lifecycle?member=${d.id}`} className="font-semibold underline">{d.full_name ?? "No name yet"}</Link>
                <span className="flex items-center gap-2 text-ink/70">
                  {longDate(`${d.passing_out_date}T12:00:00+05:30`)}
                  {d.lifecycle_hold ? <Pill tone="warn">On hold</Pill> : d.passing_out_date! <= today ? <Pill tone="good">Due at the next run</Pill> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={member ? "This member's history" : "Recent membership changes"}>
        {history.length === 0 ? (
          <Empty>No membership changes recorded yet.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead><tr><th className={table.th}>When</th><th className={table.th}>Member</th><th className={table.th}>Change</th><th className={table.th}>By</th><th className={table.th}>Note</th></tr></thead>
              <tbody>
                {history.map((e) => (
                  <tr key={e.id}>
                    <td className={table.td}>{shortDate(e.created_at)}<span className="block text-xs text-ink/70">{clockTime(e.created_at)}</span></td>
                    <td className={table.td}><Link href={`/admin/lifecycle?member=${e.profile_id}`} className="font-semibold underline">{name(e.profile) ?? "Member"}</Link></td>
                    <td className={table.td}>
                      {REASON[e.reason] ?? e.reason}
                      <span className="block text-xs text-ink/70">
                        {e.from_type !== e.to_type ? `${e.from_type} to ${e.to_type}` : e.passing_out_date ? `date ${e.passing_out_date}` : ""}
                      </span>
                    </td>
                    <td className={table.td}>{name(e.actor) ?? (e.reason === "auto_graduation" ? "Scheduled job" : "System")}</td>
                    <td className={table.td}>{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Job runs">
        {(runs.data ?? []).length === 0 ? (
          <p className="text-sm text-ink/70">The job has not run yet. Its first scheduled run is within six hours of deployment.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {runs.data!.map((r) => {
              const d = r.detail as { graduated?: number; trigger?: string; error?: string };
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3">
                  {r.ok ? <Pill tone="good">OK</Pill> : <Pill tone="bad">Failed</Pill>}
                  <span className="font-mono text-xs text-ink/70">{shortDate(r.finished_at)} {clockTime(r.finished_at)}</span>
                  <span>{r.ok ? `${d.graduated ?? 0} graduated (${d.trigger ?? "schedule"})` : d.error}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
