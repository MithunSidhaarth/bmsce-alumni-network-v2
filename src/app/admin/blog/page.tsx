import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Panel, Pill, table } from "@/components/v2/admin/ui";
import { deleteArticle, saveArticle } from "../manage";
import { requireAdmin } from "@/lib/me";
import { BLOG_CATEGORIES } from "@/lib/blog";
import { shortDate } from "@/lib/format";
import type { Article } from "@/lib/types";

export const metadata: Metadata = { title: "Blog & Insights · Admin" };
export const dynamic = "force-dynamic";

export default async function BlogAdmin({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { supabase, me } = await requireAdmin();
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, category, status, is_featured, published_at, view_count, reading_minutes, updated_at, author_name")
    .order("updated_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  const editing =
    edit && edit !== "new" ? ((await supabase.from("articles").select("*").eq("id", edit).maybeSingle()).data as Article | null) : null;
  const showForm = edit === "new" || Boolean(editing);

  return (
    <>
      <AdminHeader
        title="Blog & Insights"
        lead="Write, edit and publish articles. Published articles are what email digests are built from, so there is one library of content, not two."
      >
        <Link href="/admin/blog?edit=new" className="btn btn-sm">New article</Link>
        <Link href="/admin/digests" className="btn btn-ghost btn-sm">Email digests</Link>
      </AdminHeader>

      {showForm && (
        <Panel title={editing ? "Edit article" : "New article"} aside={<Link href="/admin/blog" className="text-sm font-semibold text-forest underline">Close</Link>}>
          <AdminForm action={saveArticle} hidden={{ id: editing?.id }} className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="field-label">Title</span><input name="title" defaultValue={editing?.title ?? ""} className="field font-serif text-lg" required maxLength={180} /></label>
            <label className="sm:col-span-2"><span className="field-label">Standfirst (one or two sentences shown under the title and in lists)</span><textarea name="excerpt" defaultValue={editing?.excerpt ?? ""} rows={2} maxLength={400} className="field" /></label>
            <label><span className="field-label">Category</span>
              <select name="category" defaultValue={editing?.category ?? "Alumni Stories"} className="field">{BLOG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label><span className="field-label">Tags (comma separated)</span><input name="tags" defaultValue={editing?.tags.join(", ") ?? ""} className="field" /></label>
            <label><span className="field-label">Author name as printed</span><input name="author_name" defaultValue={editing?.author_name ?? me.full_name ?? ""} className="field" /></label>
            <label><span className="field-label">Author line (role, class)</span><input name="author_title" defaultValue={editing?.author_title ?? ""} className="field" placeholder="e.g. Class of 2009, Product at ..." /></label>
            <label className="sm:col-span-2"><span className="field-label">Cover image link</span><input name="cover_url" defaultValue={editing?.cover_url ?? ""} className="field" placeholder="https://" /></label>
            <label className="sm:col-span-2">
              <span className="field-label">Article (Markdown: # headings, **bold**, &gt; quotes, lists, links, images)</span>
              <textarea name="body_md" defaultValue={editing?.body_md ?? ""} rows={18} className="field font-mono text-sm leading-relaxed" />
            </label>
            <label><span className="field-label">Address (after /blog/)</span><input name="slug" defaultValue={editing?.slug ?? ""} className="field" placeholder="made from the title if empty" /></label>
            <label><span className="field-label">Status</span>
              <select name="status" defaultValue={editing?.status ?? "draft"} className="field">
                <option value="draft">Draft (admins only)</option>
                <option value="published">Published</option>
                <option value="archived">Archived (hidden)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured ?? false} className="h-4 w-4" /> Feature at the top of Blog &amp; Insights</label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Submit>Save</Submit>
              {editing && <Link href={`/blog/${editing.slug}`} className="btn btn-ghost btn-sm">{editing.status === "published" ? "View" : "Preview"}</Link>}
            </div>
          </AdminForm>
          {editing && (
            <AdminForm action={deleteArticle} hidden={{ id: editing.id }} className="mt-5 border-t border-dashed border-ink/25 pt-4">
              <Submit className="text-sm font-semibold text-pin underline" confirm="Delete this article permanently? Archiving hides it without deleting.">Delete this article</Submit>
            </AdminForm>
          )}
        </Panel>
      )}

      {rows.length === 0 ? (
        <Empty>No articles yet. The public page shows an honest empty state until the first one is published.</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead><tr><th className={table.th}>Article</th><th className={table.th}>Category</th><th className={table.th}>Status</th><th className={table.th}>Published</th><th className={table.th}>Reads</th><th className={table.th} /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={table.td}>
                    <Link href={`/admin/blog?edit=${a.id}`} className="font-semibold underline">{a.title}</Link>
                    <p className="text-xs text-ink/70">{a.author_name ?? "No byline"} · {a.reading_minutes} min</p>
                  </td>
                  <td className={table.td}>{a.category}</td>
                  <td className={table.td}>
                    <span className="flex flex-wrap gap-1">
                      {a.status === "published" ? <Pill tone="good">Published</Pill> : a.status === "draft" ? <Pill tone="warn">Draft</Pill> : <Pill>Archived</Pill>}
                      {a.is_featured && <Pill>Featured</Pill>}
                    </span>
                  </td>
                  <td className={table.td}>{a.published_at ? shortDate(a.published_at) : ""}</td>
                  <td className={table.td}>{a.view_count}</td>
                  <td className={table.td}><Link href={`/blog/${a.slug}`} className="text-xs font-semibold text-forest underline">{a.status === "published" ? "View" : "Preview"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
