import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Avatar from "@/components/v2/Avatar";
import EmptyState from "@/components/v2/EmptyState";
import { markAllRead } from "./actions";
import { requireMember } from "@/lib/me";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = {
  title: "Notifications: BMSCE Alumni Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { supabase, me } = await requireMember("/notifications");
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at, actor:profiles!notifications_actor_id_fkey(full_name, photo_url)")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = data ?? [];
  const unread = rows.filter((n) => !n.read_at).length;
  // Opening the page counts as seeing them. This render still highlights
  // what was new; the bell is clear from the next navigation on.
  if (unread > 0) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", me.id)
      .is("read_at", null);
  }

  return (
    <>
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-6 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-none">Notifications</h1>
          {unread > 0 && (
            <form action={markAllRead}>
              <button className="chip">Mark all as read</button>
            </form>
          )}
        </header>
        {rows.length === 0 ? (
          <EmptyState
            title="All quiet"
            body="Replies to conversations you follow, reactions to your posts, chapter approvals and membership updates show up here."
          />
        ) : (
          <ul className="sheet mt-6 divide-y divide-ink/10">
            {rows.map((n) => {
              const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
              return (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "/"}
                    className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-lime/25 sm:px-5 ${n.read_at ? "" : "bg-lime/20"}`}
                  >
                    <Avatar name={actor?.full_name ?? "BMSCE"} src={actor?.photo_url} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[0.9375rem] leading-snug ${n.read_at ? "" : "font-semibold"}`}>{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-ink/60">{n.body}</span>}
                      <time dateTime={n.created_at} className="mt-1 block text-xs text-ink/50">
                        {timeAgo(n.created_at)}
                      </time>
                    </span>
                    {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-tangerine" aria-label="Unread" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
