import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Avatar from "@/components/v2/Avatar";
import Composer from "@/components/v2/Composer";
import EmptyState from "@/components/v2/EmptyState";
import Icon from "@/components/v2/Icon";
import { requireMember } from "@/lib/me";
import { FORUM_TAGS, listPosts } from "@/lib/posts";
import { plural, timeAgo } from "@/lib/format";
import type { PostKind } from "@/lib/types";

export const metadata: Metadata = {
  title: "The forum: BMSCE Alumni Network",
  description: "One common forum for the whole network: ask, answer and share what you know.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PAGE = 20;
const SORTS = [
  { key: "active", label: "Active" },
  { key: "recent", label: "Newest" },
  { key: "popular", label: "Popular" },
] as const;

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, me, verified, isAdmin } = await requireMember("/community");
  const sort = (SORTS.find((s) => s.key === sp.sort)?.key ?? "active") as "active" | "recent" | "popular";
  const tag = (FORUM_TAGS as readonly string[]).includes(sp.tag ?? "") ? sp.tag : undefined;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);

  const rows = verified
    ? await listPosts(supabase, { scope: "forum", sort, tag, q, limit: PAGE + 1, offset: (page - 1) * PAGE })
    : [];
  const threads = rows.slice(0, PAGE);
  const hasMore = rows.length > PAGE;

  const link = (patch: Record<string, string | undefined>) => {
    const next = { q: q || undefined, tag, sort: sort === "active" ? undefined : sort, ...patch };
    const qs = Object.entries(next)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return qs ? `/community?${qs}` : "/community";
  };
  const kinds: PostKind[] = isAdmin ? ["discussion", "announcement"] : ["discussion"];

  return (
    <>
      <main className="mx-auto max-w-[960px] px-4 pb-16 pt-6 md:px-8">
        <header className="relative">
          <p className="label-mono text-ink/55">Community</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,6.5vw,3.9rem)] leading-[0.94]">
            One room. <span className="serif-accent hl">Every</span> question.
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            The common forum for the whole network. Tags sort the conversation; nothing is walled
            off. For city-specific plans, head to your{" "}
            <Link href="/chapters" className="font-semibold text-forest underline underline-offset-4">
              chapter
            </Link>
            .
          </p>
        </header>

        <div className="mt-7">
          <Composer
            me={me}
            userId={me.id}
            kinds={kinds}
            defaultKind="discussion"
            disabledReason={verified ? undefined : "The forum opens once an admin has verified your account."}
          />
        </div>

        <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center">
          <form action="/community" role="search" className="relative md:w-72">
            <label htmlFor="forum-q" className="sr-only">
              Search discussions
            </label>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
            <input id="forum-q" name="q" defaultValue={q} placeholder="Search discussions" className="field rounded-full pl-9" />
            {tag && <input type="hidden" name="tag" value={tag} />}
            {sort !== "active" && <input type="hidden" name="sort" value={sort} />}
          </form>
          <div className="flex gap-1.5 md:ml-auto" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <Link key={s.key} href={link({ sort: s.key === "active" ? undefined : s.key, page: undefined })} data-active={sort === s.key} className="chip">
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <nav aria-label="Filter by tag" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
          <Link href={link({ tag: undefined, page: undefined })} data-active={!tag} className="chip">
            All topics
          </Link>
          {FORUM_TAGS.map((t) => (
            <Link key={t} href={link({ tag: t, page: undefined })} data-active={tag === t} className="chip">
              {t}
            </Link>
          ))}
        </nav>

        {/* The ledger: one ruled line per conversation. */}
        {threads.length > 0 && (
          <ol className="sheet mt-6 divide-y divide-ink/10">
            {threads.map((t) => (
              <li key={t.id} className="relative">
                <Link href={`/community/${t.id}`} className="group flex gap-4 px-4 py-4 transition-colors hover:bg-lime/25 sm:px-6">
                  <Avatar name={t.author?.full_name} src={t.author?.photo_url} size={40} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[1.15rem] font-bold leading-snug group-hover:underline">
                      {t.is_pinned && <Icon name="pin" className="mr-1.5 inline h-4 w-4 -translate-y-px text-pin" filled />}
                      {t.kind === "announcement" && <span className="stamp mr-2 align-middle text-tangerine">Announcement</span>}
                      {t.title ?? t.body.slice(0, 90)}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-sm text-ink/60">{t.body}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/55">
                      <span>{t.author?.full_name ?? "Former member"}</span>
                      {t.tags.map((tg) => (
                        <span key={tg} className="label-mono rounded-sm bg-ink/[0.06] px-1.5 py-0.5">
                          {tg}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end justify-center text-right sm:flex">
                    <span className="font-display text-xl font-bold leading-none">{t.comment_count}</span>
                    <span className="label-mono mt-1 text-ink/50">{t.comment_count === 1 ? "reply" : "replies"}</span>
                    <span className="mt-2 text-xs text-ink/50">active {timeAgo(t.last_activity_at)}</span>
                  </div>
                </Link>
                <p className="px-4 pb-3 text-xs text-ink/50 sm:hidden">
                  {plural(t.comment_count, "reply", "replies")} · active {timeAgo(t.last_activity_at)}
                </p>
              </li>
            ))}
          </ol>
        )}

        {verified && threads.length === 0 && (
          <EmptyState
            title={q || tag ? "No discussions match" : "Nobody has asked anything yet"}
            body={
              q || tag
                ? "Try a different word or clear the filters."
                : "Start the first conversation: a question about a career move, a city, a course, anything the network might know."
            }
            action={q || tag ? { href: "/community", label: "Clear filters" } : undefined}
          />
        )}

        {(page > 1 || hasMore) && (
          <nav aria-label="Pages" className="mt-8 flex items-center justify-between">
            {page > 1 ? (
              <Link href={link({ page: page > 2 ? String(page - 1) : undefined })} className="btn btn-ghost btn-sm">
                <Icon name="back" className="h-4 w-4" /> Newer
              </Link>
            ) : (
              <span />
            )}
            {hasMore && (
              <Link href={link({ page: String(page + 1) })} className="btn btn-ghost btn-sm">
                Older <Icon name="arrow" className="h-4 w-4" />
              </Link>
            )}
          </nav>
        )}
      </main>
      <Footer />
    </>
  );
}
