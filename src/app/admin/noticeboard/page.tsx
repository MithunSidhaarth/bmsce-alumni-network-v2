import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Panel, Pill, table } from "@/components/v2/admin/ui";
import { addManualNotice, featureOnWall, saveWallSettings, updateNotice } from "../manage";
import { requireAdmin } from "@/lib/me";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "The Wall · Admin" };
export const dynamic = "force-dynamic";

const SOURCES = [
  { key: "instagram", label: "Instagram posts" },
  { key: "post", label: "Pinned posts and announcements" },
  { key: "event", label: "Events" },
  { key: "photo", label: "Gallery photographs" },
  { key: "manual", label: "Notices written by admins" },
];
const ORIGIN: Record<string, string> = { auto: "By rule", admin: "Featured by an admin", member: "Suggested by a member" };
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type Item = {
  id: string; source: string; status: string; origin: string; is_pinned: boolean; sort_order: number; display_date: string;
  title: string | null; body: string | null;
  social: { caption: string | null; permalink: string | null } | { caption: string | null; permalink: string | null }[] | null;
  post: { id: string; title: string | null; body: string } | { id: string; title: string | null; body: string }[] | null;
  event: { title: string } | { title: string }[] | null;
  photo: { caption: string | null } | { caption: string | null }[] | null;
};

const describe = (i: Item) =>
  i.title ?? one(i.post)?.title ?? one(i.post)?.body ?? one(i.event)?.title ?? one(i.social)?.caption ?? one(i.photo)?.caption ?? i.body ?? "Photograph";

export default async function WallAdmin({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show ?? "live";
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();

  let q = supabase
    .from("notice_items")
    .select("id, source, status, origin, is_pinned, sort_order, display_date, title, body, social:social_posts(caption, permalink), post:posts(id, title, body), event:events(title), photo:gallery_photos(caption)")
    .order("is_pinned", { ascending: false })
    .order("sort_order")
    .order("display_date", { ascending: false })
    .limit(80);
  q = show === "pending" ? q.eq("status", "pending") : show === "hidden" ? q.eq("status", "hidden") : q.eq("status", "published");

  const [{ data: items }, { data: settings }, pendingCount, events, photos, posts] = await Promise.all([
    q,
    supabase.from("site_settings").select("notice_sources, ig_auto_publish").eq("id", 1).maybeSingle(),
    supabase.from("notice_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("events").select("id, title, event_date").gte("event_date", now).order("event_date").limit(6),
    supabase.from("gallery_photos").select("id, caption, thumbnail_url").order("uploaded_at", { ascending: false }).limit(8),
    supabase.from("posts").select("id, title, body, kind").eq("is_hidden", false).in("kind", ["achievement", "memory"]).order("created_at", { ascending: false }).limit(8),
  ]);
  const rows = (items ?? []) as unknown as Item[];
  const sources: string[] = settings?.notice_sources ?? [];
  const link = "text-xs font-semibold text-forest underline";

  return (
    <>
      <AdminHeader
        title="The Wall"
        lead="The Wall only ever shows stored content. Items arrive by rule (a new Instagram import, a pinned post, an announcement), by an admin featuring them here, or as member suggestions that wait for your approval."
      >
        <Link href="/noticeboard" className="btn btn-ghost btn-sm">View The Wall</Link>
      </AdminHeader>

      <nav aria-label="Views" className="mb-5 flex flex-wrap gap-1.5">
        <Link href="/admin/noticeboard" data-active={show === "live"} className="chip">On the wall</Link>
        <Link href="/admin/noticeboard?show=pending" data-active={show === "pending"} className="chip">
          Waiting for review {pendingCount.count ? <span className="rounded-full bg-tangerine px-1.5 font-mono text-[10px] text-white">{pendingCount.count}</span> : null}
        </Link>
        <Link href="/admin/noticeboard?show=hidden" data-active={show === "hidden"} className="chip">Hidden</Link>
      </nav>

      {rows.length === 0 ? (
        <Empty>{show === "pending" ? "Nothing is waiting for review." : show === "hidden" ? "Nothing is hidden." : "The Wall is empty. Feature something below, or load the Instagram archive from the Instagram page."}</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead><tr><th className={table.th}>Item</th><th className={table.th}>Type</th><th className={table.th}>How it got here</th><th className={table.th}>Date</th><th className={table.th}>Order</th><th className={table.th} /></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className={table.td}>
                    <span className="line-clamp-2 max-w-md">{describe(i)}</span>
                    {i.is_pinned && <Pill tone="good">Pinned to top</Pill>}
                  </td>
                  <td className={table.td}>{i.source === "instagram" ? "Instagram (read only)" : i.source}</td>
                  <td className={table.td}>{ORIGIN[i.origin]}</td>
                  <td className={table.td}>{shortDate(i.display_date)}</td>
                  <td className={table.td}>
                    <AdminForm action={updateNotice} hidden={{ id: i.id, what: "order" }} className="flex items-center gap-1">
                      <label className="sr-only" htmlFor={`o-${i.id}`}>Order</label>
                      <input id={`o-${i.id}`} name="sort_order" type="number" defaultValue={i.sort_order} className="field h-9 min-h-0 w-16 px-2 py-1" />
                      <Submit className={link}>Set</Submit>
                    </AdminForm>
                  </td>
                  <td className={table.td}>
                    <div className="flex flex-wrap gap-3">
                      {i.status !== "published" && <AdminForm action={updateNotice} hidden={{ id: i.id, what: "publish" }}><Submit className={link}>{i.status === "pending" ? "Approve" : "Show"}</Submit></AdminForm>}
                      {i.status === "published" && <AdminForm action={updateNotice} hidden={{ id: i.id, what: i.is_pinned ? "unpin" : "pin" }}><Submit className={link}>{i.is_pinned ? "Unpin" : "Pin to top"}</Submit></AdminForm>}
                      {i.status !== "hidden" && <AdminForm action={updateNotice} hidden={{ id: i.id, what: "hide" }}><Submit className={link}>{i.status === "pending" ? "Decline" : "Hide"}</Submit></AdminForm>}
                      <AdminForm action={updateNotice} hidden={{ id: i.id, what: "remove" }}><Submit className="text-xs font-semibold text-pin underline" confirm="Take this off The Wall? The original post, photo or event is not deleted.">Remove</Submit></AdminForm>
                      {one(i.social)?.permalink && <a href={one(i.social)!.permalink!} target="_blank" rel="noreferrer" className={link}>Original</a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mb-7 mt-2 text-xs text-ink/70">Lower order numbers appear first. Items with the same number are sorted newest first. Imported Instagram posts cannot be edited here; hide them if needed and edit the original on Instagram.</p>

      <div className="grid gap-x-7 lg:grid-cols-2">
        <Panel title="Pin a notice">
          <AdminForm action={addManualNotice} className="flex flex-col gap-3">
            <label><span className="field-label">Headline</span><input name="title" className="field" maxLength={140} /></label>
            <label><span className="field-label">Text</span><textarea name="body" rows={3} className="field" maxLength={1200} /></label>
            <label><span className="field-label">Image link (optional)</span><input name="image_url" className="field" placeholder="https://" /></label>
            <label><span className="field-label">Link (optional)</span><input name="link_url" className="field" placeholder="https://" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" className="h-4 w-4" /> Pin to the top</label>
            <div><Submit>Pin to The Wall</Submit></div>
          </AdminForm>
        </Panel>

        <Panel title="What can appear">
          <AdminForm action={saveWallSettings} className="flex flex-col gap-2.5">
            {SOURCES.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`src_${s.key}`} defaultChecked={sources.includes(s.key)} className="h-4 w-4" /> {s.label}
              </label>
            ))}
            <hr className="rule-dashed my-2" />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="ig_auto_publish" defaultChecked={settings?.ig_auto_publish ?? true} className="mt-1 h-4 w-4" />
              <span>Show new Instagram imports straight away<span className="block text-xs text-ink/70">Off: each new import waits under &ldquo;Waiting for review&rdquo; until an admin approves it.</span></span>
            </label>
            <div className="mt-2"><Submit>Save</Submit></div>
          </AdminForm>
        </Panel>

        <Panel title="Feature an upcoming event">
          {(events.data ?? []).length === 0 ? <p className="text-sm text-ink/70">No upcoming events.</p> : (
            <ul className="flex flex-col gap-2 text-sm">
              {events.data!.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{e.title} <span className="text-ink/70">· {shortDate(e.event_date)}</span></span>
                  <AdminForm action={featureOnWall} hidden={{ source: "event", ref: e.id }}><Submit className={link}>Add</Submit></AdminForm>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Feature a memory or achievement">
          {(posts.data ?? []).length === 0 ? <p className="text-sm text-ink/70">No memories or achievements posted yet.</p> : (
            <ul className="flex flex-col gap-2 text-sm">
              {posts.data!.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <Link href={`/community/${p.id}`} className="min-w-0 truncate underline">{p.title ?? p.body}</Link>
                  <AdminForm action={featureOnWall} hidden={{ source: "post", ref: p.id }}><Submit className={link}>Add</Submit></AdminForm>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Feature a gallery photograph">
          {(photos.data ?? []).length === 0 ? <p className="text-sm text-ink/70">The gallery is empty.</p> : (
            <ul className="grid grid-cols-4 gap-3">
              {photos.data!.map((p) => (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail_url} alt={p.caption ?? ""} className="aspect-square w-full rounded object-cover" loading="lazy" />
                  <AdminForm action={featureOnWall} hidden={{ source: "photo", ref: p.id }}><Submit className={`${link} mt-1`}>Add</Submit></AdminForm>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
