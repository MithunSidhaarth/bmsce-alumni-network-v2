import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Pill, table } from "@/components/v2/admin/ui";
import { moderateComment, moderatePost } from "../manage";
import { requireAdmin } from "@/lib/me";
import { KIND_LABEL } from "@/lib/posts";
import { shortDate } from "@/lib/format";
import type { PostKind } from "@/lib/types";

export const metadata: Metadata = { title: "Posts and replies · Admin" };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "posts", label: "Recent posts" },
  { key: "pinned", label: "Pinned" },
  { key: "hidden", label: "Hidden" },
  { key: "replies", label: "Recent replies" },
];
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function ModerationAdmin({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.key === sp.view)?.key ?? "posts";
  const { supabase } = await requireAdmin();
  const link = "text-xs font-semibold text-forest underline";

  let body;
  if (view === "replies") {
    const { data } = await supabase
      .from("post_comments")
      .select("id, body, is_hidden, created_at, post_id, author:profiles!post_comments_author_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(60);
    body =
      (data ?? []).length === 0 ? (
        <Empty>No replies yet.</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead><tr><th className={table.th}>Reply</th><th className={table.th}>By</th><th className={table.th}>When</th><th className={table.th} /></tr></thead>
            <tbody>
              {data!.map((c) => (
                <tr key={c.id} className={c.is_hidden ? "opacity-60" : ""}>
                  <td className={table.td}>
                    <Link href={`/community/${c.post_id}`} className="line-clamp-2 hover:underline">{c.body}</Link>
                    {c.is_hidden && <Pill tone="warn">Hidden</Pill>}
                  </td>
                  <td className={table.td}>{one(c.author)?.full_name ?? "Former member"}</td>
                  <td className={table.td}>{shortDate(c.created_at)}</td>
                  <td className={table.td}>
                    <div className="flex gap-3">
                      <AdminForm action={moderateComment} hidden={{ id: c.id, what: c.is_hidden ? "unhide" : "hide" }}><Submit className={link}>{c.is_hidden ? "Unhide" : "Hide"}</Submit></AdminForm>
                      <AdminForm action={moderateComment} hidden={{ id: c.id, what: "delete" }}><Submit className="text-xs font-semibold text-pin underline" confirm="Delete this reply permanently?">Delete</Submit></AdminForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  } else {
    let q = supabase
      .from("posts")
      .select("id, kind, title, body, is_pinned, is_hidden, comment_count, reaction_count, created_at, author:profiles!posts_author_id_fkey(full_name), chapter:chapters(name)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (view === "pinned") q = q.eq("is_pinned", true);
    if (view === "hidden") q = q.eq("is_hidden", true);
    const { data } = await q;
    body =
      (data ?? []).length === 0 ? (
        <Empty>{view === "posts" ? "No posts yet." : `Nothing is ${view}.`}</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead><tr><th className={table.th}>Post</th><th className={table.th}>By</th><th className={table.th}>Activity</th><th className={table.th}>When</th><th className={table.th} /></tr></thead>
            <tbody>
              {data!.map((p) => (
                <tr key={p.id} className={p.is_hidden ? "opacity-60" : ""}>
                  <td className={table.td}>
                    <Link href={`/community/${p.id}`} className="line-clamp-2 font-semibold hover:underline">{p.title ?? p.body}</Link>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Pill>{KIND_LABEL[p.kind as PostKind]}</Pill>
                      {one(p.chapter)?.name && <Pill>{one(p.chapter)!.name}</Pill>}
                      {p.is_pinned && <Pill tone="good">Pinned</Pill>}
                      {p.is_hidden && <Pill tone="warn">Hidden</Pill>}
                    </span>
                  </td>
                  <td className={table.td}>{one(p.author)?.full_name ?? "Former member"}</td>
                  <td className={table.td}>{p.reaction_count} reactions · {p.comment_count} replies</td>
                  <td className={table.td}>{shortDate(p.created_at)}</td>
                  <td className={table.td}>
                    <div className="flex flex-wrap gap-3">
                      <AdminForm action={moderatePost} hidden={{ id: p.id, what: p.is_pinned ? "unpin" : "pin" }}><Submit className={link}>{p.is_pinned ? "Unpin" : "Pin"}</Submit></AdminForm>
                      <AdminForm action={moderatePost} hidden={{ id: p.id, what: p.is_hidden ? "unhide" : "hide" }}><Submit className={link}>{p.is_hidden ? "Unhide" : "Hide"}</Submit></AdminForm>
                      <AdminForm action={moderatePost} hidden={{ id: p.id, what: "delete" }}><Submit className="text-xs font-semibold text-pin underline" confirm="Delete this post and all its replies permanently?">Delete</Submit></AdminForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }

  return (
    <>
      <AdminHeader
        title="Posts and replies"
        lead="Everything members publish in the feed, the forum and chapters. Hiding keeps the content but removes it from view; pinning also places a post on The Wall."
      />
      <nav aria-label="Views" className="mb-5 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Link key={v.key} href={v.key === "posts" ? "/admin/moderation" : `/admin/moderation?view=${v.key}`} data-active={view === v.key} className="chip">
            {v.label}
          </Link>
        ))}
        <Link href="/admin/reports" className="chip">Reports from members</Link>
      </nav>
      {body}
    </>
  );
}
