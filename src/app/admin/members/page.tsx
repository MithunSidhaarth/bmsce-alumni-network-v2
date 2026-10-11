import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Pill, table } from "@/components/v2/admin/ui";
import { setMemberRole, setMemberSuspended, updateMemberDetails } from "../manage";
import { requireAdmin } from "@/lib/me";
import { BRANCHES } from "@/lib/constants";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Members · Admin" };
export const dynamic = "force-dynamic";
const PAGE = 40;

type Row = {
  id: string;
  full_name: string | null;
  user_type: string;
  role: string;
  verification_status: string;
  graduation_year: number | null;
  branch: string | null;
  current_city: string | null;
  company: string | null;
  job_title: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  last_seen_at: string | null;
};

export default async function MembersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; batch?: string; chapter?: string; page?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, me } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80).replace(/[%,()]/g, " ");

  const { data: chapters } = await supabase.from("chapters").select("id, name").order("name");
  let ids: string[] | null = null;
  if (sp.chapter) {
    const { data } = await supabase.from("chapter_members").select("profile_id").eq("chapter_id", sp.chapter).eq("status", "active");
    ids = (data ?? []).map((r) => r.profile_id);
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, user_type, role, verification_status, graduation_year, branch, current_city, company, job_title, suspended_at, suspended_reason, created_at, last_seen_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`full_name.ilike.%${q}%,company.ilike.%${q}%`);
  if (sp.type === "student" || sp.type === "alumni") query = query.eq("user_type", sp.type);
  if (sp.status === "suspended") query = query.not("suspended_at", "is", null);
  else if (sp.status === "admin") query = query.eq("role", "admin");
  else if (["verified", "unverified", "rejected"].includes(sp.status ?? "")) query = query.eq("verification_status", sp.status!);
  if (/^(19|20)\d\d$/.test(sp.batch ?? "")) query = query.eq("graduation_year", Number(sp.batch));
  if (ids) query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const { data, count, error } = await query;
  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const qs = (patch: Record<string, string | undefined>) => {
    const next = { ...sp, ...patch };
    const s = Object.entries(next)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return s ? `/admin/members?${s}` : "/admin/members";
  };

  return (
    <>
      <AdminHeader title="Members" lead="Search and filter every account. Corrections made here are written to the audit log." />

      <form className="mb-5 flex flex-wrap items-end gap-3" action="/admin/members">
        <label className="min-w-[12rem] flex-1">
          <span className="field-label">Name or company</span>
          <input name="q" defaultValue={sp.q ?? ""} className="field" placeholder="Search" />
        </label>
        <label>
          <span className="field-label">Membership</span>
          <select name="type" defaultValue={sp.type ?? ""} className="field">
            <option value="">All</option>
            <option value="alumni">Alumni</option>
            <option value="student">Students</option>
          </select>
        </label>
        <label>
          <span className="field-label">Status</span>
          <select name="status" defaultValue={sp.status ?? ""} className="field">
            <option value="">Any</option>
            <option value="verified">Verified</option>
            <option value="unverified">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="admin">Admins</option>
          </select>
        </label>
        <label className="w-28">
          <span className="field-label">Class</span>
          <input name="batch" defaultValue={sp.batch ?? ""} className="field" inputMode="numeric" placeholder="2019" />
        </label>
        <label>
          <span className="field-label">Chapter</span>
          <select name="chapter" defaultValue={sp.chapter ?? ""} className="field">
            <option value="">Any</option>
            {(chapters ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm h-11">Filter</button>
        <Link href="/admin/members" className="btn btn-ghost btn-sm h-11">
          Reset
        </Link>
      </form>

      <p className="mb-3 text-sm text-ink/70">{error ? error.message : `${total} member${total === 1 ? "" : "s"}`}</p>

      {rows.length === 0 ? (
        <Empty>No members match these filters.</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Member</th>
                <th className={table.th}>Membership</th>
                <th className={table.th}>Status</th>
                <th className={table.th}>Joined / seen</th>
                <th className={table.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} id={r.id}>
                  <td className={table.td}>
                    <Link href={`/directory/${r.id}`} className="font-semibold underline">
                      {r.full_name ?? "No name yet"}
                    </Link>
                    <p className="text-xs text-ink/70">{[r.job_title, r.company].filter(Boolean).join(" at ") || r.current_city || ""}</p>
                  </td>
                  <td className={table.td}>
                    {r.user_type === "student" ? "Student" : "Alumni"}
                    <p className="text-xs text-ink/70">{[r.graduation_year, r.branch].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className={table.td}>
                    <span className="flex flex-wrap gap-1">
                      {r.verification_status === "verified" ? (
                        <Pill tone="good">Verified</Pill>
                      ) : r.verification_status === "rejected" ? (
                        <Pill tone="bad">Rejected</Pill>
                      ) : (
                        <Pill tone="warn">Pending</Pill>
                      )}
                      {r.role === "admin" && <Pill>Admin</Pill>}
                      {r.suspended_at && <Pill tone="bad">Suspended</Pill>}
                    </span>
                    {r.suspended_reason && <p className="mt-1 text-xs text-ink/70">{r.suspended_reason}</p>}
                  </td>
                  <td className={table.td}>
                    {shortDate(r.created_at)}
                    <p className="text-xs text-ink/70">{r.last_seen_at ? `seen ${shortDate(r.last_seen_at)}` : "not seen yet"}</p>
                  </td>
                  <td className={table.td}>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                      <Link href={`${qs({ edit: sp.edit === r.id ? undefined : r.id })}#${r.id}`} className="text-forest underline">
                        {sp.edit === r.id ? "Close" : "Edit"}
                      </Link>
                      <Link href={`/admin/lifecycle?member=${r.id}`} className="text-forest underline">
                        Lifecycle
                      </Link>
                    </div>
                    {sp.edit === r.id && (
                      <div className="mt-3 w-[22rem] max-w-full rounded border border-ink/15 bg-ivory p-3">
                        <AdminForm action={updateMemberDetails} hidden={{ id: r.id }} className="grid grid-cols-2 gap-2">
                          <label className="col-span-2">
                            <span className="field-label">Name</span>
                            <input name="full_name" defaultValue={r.full_name ?? ""} className="field" required />
                          </label>
                          <label>
                            <span className="field-label">Graduation year</span>
                            <input name="graduation_year" defaultValue={r.graduation_year ?? ""} className="field" inputMode="numeric" />
                          </label>
                          <label>
                            <span className="field-label">Branch</span>
                            <select name="branch" defaultValue={r.branch ?? ""} className="field">
                              <option value="">Not set</option>
                              {BRANCHES.map((b) => (
                                <option key={b}>{b}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="field-label">City</span>
                            <input name="current_city" defaultValue={r.current_city ?? ""} className="field" />
                          </label>
                          <label>
                            <span className="field-label">Company</span>
                            <input name="company" defaultValue={r.company ?? ""} className="field" />
                          </label>
                          <label className="col-span-2">
                            <span className="field-label">Role or title</span>
                            <input name="job_title" defaultValue={r.job_title ?? ""} className="field" />
                          </label>
                          <div className="col-span-2">
                            <Submit>Save details</Submit>
                          </div>
                        </AdminForm>
                        {r.id !== me.id && (
                          <>
                            <hr className="rule-dashed my-3" />
                            <AdminForm action={setMemberRole} hidden={{ id: r.id, role: r.role === "admin" ? "member" : "admin" }}>
                              <Submit
                                className="btn btn-ghost btn-sm"
                                confirm={r.role === "admin" ? "Remove this member's admin rights?" : "Give this member full admin rights?"}
                              >
                                {r.role === "admin" ? "Remove admin role" : "Make admin"}
                              </Submit>
                            </AdminForm>
                            <hr className="rule-dashed my-3" />
                            <AdminForm
                              action={setMemberSuspended}
                              hidden={{ id: r.id, suspend: r.suspended_at ? "0" : "1" }}
                              className="flex flex-wrap items-end gap-2"
                            >
                              {!r.suspended_at && (
                                <label className="min-w-0 flex-1">
                                  <span className="field-label">Reason (kept on record)</span>
                                  <input name="reason" className="field" />
                                </label>
                              )}
                              <Submit
                                className={r.suspended_at ? "btn btn-sm" : "btn btn-danger btn-sm"}
                                confirm={r.suspended_at ? undefined : "Suspend this account? Their content stays, but they cannot post or message."}
                              >
                                {r.suspended_at ? "Restore account" : "Suspend"}
                              </Submit>
                            </AdminForm>
                          </>
                        )}
                        <p className="mt-3 text-xs text-ink/70">
                          Admins suspend rather than delete, so posts and history are never lost by mistake. A member who wants
                          their account gone deletes it from their own profile.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={qs({ page: String(page - 1), edit: undefined })} className="btn btn-ghost btn-sm">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink/70">
            Page {page} of {Math.ceil(total / PAGE)}
          </span>
          {page * PAGE < total ? (
            <Link href={qs({ page: String(page + 1), edit: undefined })} className="btn btn-ghost btn-sm">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
