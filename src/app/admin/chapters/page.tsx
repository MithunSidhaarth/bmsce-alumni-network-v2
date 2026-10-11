import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Panel, Pill, table } from "@/components/v2/admin/ui";
import { importStarterContent, saveChapter, setChapterArchived, setChapterLead } from "../manage";
import { requireAdmin } from "@/lib/me";
import type { Chapter } from "@/lib/types";

export const metadata: Metadata = { title: "Chapters · Admin" };
export const dynamic = "force-dynamic";

const REGIONS = ["Asia", "North America", "Europe", "Australia", "Africa", "South America"];

export default async function ChaptersAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; find?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: rows }, { data: counts }] = await Promise.all([
    supabase.from("chapters").select("*").order("status").order("name"),
    supabase.rpc("chapter_member_counts"),
  ]);
  const chapters = (rows ?? []) as Chapter[];
  const n = (counts ?? {}) as Record<string, number>;
  const editing = sp.edit === "new" ? null : chapters.find((c) => c.id === sp.edit) ?? null;
  const showForm = sp.edit === "new" || Boolean(editing);

  const find = (sp.find ?? "").trim().slice(0, 60).replace(/[%,()]/g, " ");
  const [{ data: members }, { data: found }] = editing
    ? await Promise.all([
        supabase.from("chapter_members").select("role, status, profile:profiles(id, full_name)").eq("chapter_id", editing.id).eq("status", "active").order("role", { ascending: false }),
        find
          ? supabase.from("profiles").select("id, full_name, graduation_year").eq("verification_status", "verified").ilike("full_name", `%${find}%`).limit(8)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; graduation_year: number | null }[] }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <>
      <AdminHeader
        title="Chapters"
        lead="Create, edit and archive chapter communities. Nothing here needs a code change. Chapter leads are appointed here and can pin posts, post announcements and approve join requests in their own chapter only."
      >
        <Link href="/admin/chapters?edit=new" className="btn btn-sm">New chapter</Link>
      </AdminHeader>

      {chapters.length === 0 && (
        <Panel title="Start with the existing chapter list">
          <p className="text-sm text-ink/70">
            The site ships with the network&rsquo;s current list of chapters and its Instagram archive. Load them once to fill the
            Chapters page and The Wall. You can edit or archive anything afterwards.
          </p>
          <AdminForm action={importStarterContent} className="mt-4">
            <Submit>Load the chapter list and Instagram archive</Submit>
          </AdminForm>
        </Panel>
      )}

      {showForm && (
        <Panel title={editing ? `Edit ${editing.name}` : "New chapter"} aside={<Link href="/admin/chapters" className="text-sm font-semibold text-forest hover:underline">Close</Link>}>
          <AdminForm action={saveChapter} hidden={{ id: editing?.id }} className="grid gap-3 sm:grid-cols-2">
            <label><span className="field-label">Name</span><input name="name" defaultValue={editing?.name ?? ""} className="field" required /></label>
            <label><span className="field-label">Address (after /chapters/)</span><input name="slug" defaultValue={editing?.slug ?? ""} className="field" placeholder="made from the name if empty" /></label>
            <label><span className="field-label">Region</span>
              <select name="region" defaultValue={editing?.region ?? "Asia"} className="field">{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label><span className="field-label">Country</span><input name="country" defaultValue={editing?.country ?? ""} className="field" /></label>
            <label><span className="field-label">City</span><input name="city" defaultValue={editing?.city ?? ""} className="field" /></label>
            <label><span className="field-label">Who can join</span>
              <select name="join_policy" defaultValue={editing?.join_policy ?? "open"} className="field">
                <option value="open">Any verified member</option>
                <option value="request">By request, approved by a lead or admin</option>
              </select>
            </label>
            <label className="sm:col-span-2"><span className="field-label">Description</span><textarea name="description" defaultValue={editing?.description ?? ""} rows={3} className="field" /></label>
            <label className="sm:col-span-2"><span className="field-label">Cover photo link</span><input name="cover_url" defaultValue={editing?.cover_url ?? ""} className="field" placeholder="https://" /></label>
            <label className="sm:col-span-2"><span className="field-label">WhatsApp group link (shown to members only)</span><input name="whatsapp_url" defaultValue={editing?.whatsapp_url ?? ""} className="field" placeholder="https://chat.whatsapp.com/..." /></label>
            <label><span className="field-label">Latitude</span><input name="lat" defaultValue={editing?.lat ?? ""} className="field" inputMode="decimal" /></label>
            <label><span className="field-label">Longitude</span><input name="lng" defaultValue={editing?.lng ?? ""} className="field" inputMode="decimal" /></label>
            <div className="sm:col-span-2"><Submit>{editing ? "Save chapter" : "Create chapter"}</Submit></div>
          </AdminForm>

          {editing && (
            <>
              <hr className="rule-dashed my-6" />
              <h3 className="text-sm font-bold">Leadership</h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {(members ?? []).map((m) => {
                  const p = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as { id: string; full_name: string | null } | null;
                  if (!p) return null;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-3">
                      <span className="min-w-[10rem] font-semibold">{p.full_name ?? "Member"}</span>
                      {m.role === "lead" && <Pill tone="good">Lead</Pill>}
                      <AdminForm action={setChapterLead} hidden={{ chapter_id: editing.id, profile_id: p.id, role: m.role === "lead" ? "member" : "lead" }}>
                        <Submit className="text-xs font-semibold text-forest underline">{m.role === "lead" ? "Remove as lead" : "Make lead"}</Submit>
                      </AdminForm>
                    </li>
                  );
                })}
                {(members ?? []).length === 0 && <li className="text-ink/60">No members yet.</li>}
              </ul>
              <form action="/admin/chapters" className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="edit" value={editing.id} />
                <label className="min-w-[12rem] flex-1"><span className="field-label">Appoint a lead who is not a member yet</span><input name="find" defaultValue={sp.find ?? ""} className="field" placeholder="Search verified members by name" /></label>
                <button className="btn btn-ghost btn-sm h-11">Search</button>
              </form>
              {find && (
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {(found ?? []).map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3">
                      <span className="min-w-[10rem]">{p.full_name} {p.graduation_year ? <span className="text-ink/55">· {p.graduation_year}</span> : null}</span>
                      <AdminForm action={setChapterLead} hidden={{ chapter_id: editing.id, profile_id: p.id, role: "lead" }}>
                        <Submit className="text-xs font-semibold text-forest underline">Make lead</Submit>
                      </AdminForm>
                    </li>
                  ))}
                  {(found ?? []).length === 0 && <li className="text-ink/60">No verified member matches that name.</li>}
                </ul>
              )}
            </>
          )}
        </Panel>
      )}

      {chapters.length === 0 ? (
        <Empty>No chapters yet.</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead><tr><th className={table.th}>Chapter</th><th className={table.th}>Where</th><th className={table.th}>Members</th><th className={table.th}>Joining</th><th className={table.th}>Status</th><th className={table.th} /></tr></thead>
            <tbody>
              {chapters.map((c) => (
                <tr key={c.id} className={c.status === "archived" ? "opacity-60" : ""}>
                  <td className={table.td}><Link href={`/chapters/${c.slug}`} className="font-semibold hover:underline">{c.name}</Link></td>
                  <td className={table.td}>{[c.city, c.country].filter(Boolean).join(", ") || c.region}</td>
                  <td className={table.td}>{n[c.id] ?? 0}</td>
                  <td className={table.td}>{c.join_policy === "open" ? "Open" : "By request"}</td>
                  <td className={table.td}>{c.status === "active" ? <Pill tone="good">Active</Pill> : <Pill>Archived</Pill>}</td>
                  <td className={table.td}>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                      <Link href={`/admin/chapters?edit=${c.id}`} className="text-forest hover:underline">Edit</Link>
                      <AdminForm action={setChapterArchived} hidden={{ id: c.id, archived: c.status === "active" ? "1" : "0" }}>
                        <Submit className="text-xs font-semibold text-ink/60 underline hover:text-ink" confirm={c.status === "active" ? `Archive ${c.name}? Members will no longer see it. Nothing is deleted.` : undefined}>
                          {c.status === "active" ? "Archive" : "Restore"}
                        </Submit>
                      </AdminForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
