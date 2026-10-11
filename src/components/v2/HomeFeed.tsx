import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Me } from "@/lib/me";
import { listPosts, myReactions, type PostQuery } from "@/lib/posts";
import type { NoticeCard, PostKind } from "@/lib/types";
import { seeded, stampDate, timeAgo } from "@/lib/format";
import Composer from "./Composer";
import Icon from "./Icon";
import PostCard from "./PostCard";
import EmptyState from "./EmptyState";
import EventStub from "./EventStub";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "chapters", label: "My chapters" },
  { key: "announcement", label: "Announcements" },
  { key: "achievement", label: "Achievements" },
  { key: "memory", label: "Memories" },
  { key: "discussion", label: "Discussions" },
];

const PAGE = 15;

function greeting() {
  const hour = Number(
    new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })
  );
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomeFeed({
  supabase,
  me,
  show,
  count,
}: {
  supabase: SupabaseClient;
  me: Me;
  show: string;
  count: number;
}) {
  const isAdmin = me.role === "admin";
  const verified = me.verification_status === "verified" || isAdmin;
  const filter = FILTERS.some((f) => f.key === show) ? show : "all";
  const limit = Math.min(Math.max(count, PAGE), 90);

  const { data: memberships } = await supabase
    .from("chapter_members")
    .select("role, status, chapter:chapters(id, name, slug)")
    .eq("profile_id", me.id)
    .eq("status", "active");
  const myChapters = (memberships ?? [])
    .map((m) => ({ role: m.role as string, ...(Array.isArray(m.chapter) ? m.chapter[0] : m.chapter) }))
    .filter((c): c is { role: string; id: string; name: string; slug: string } => Boolean(c?.id));

  const query: PostQuery = { scope: "feed", limit: limit + 1 };
  if (filter === "chapters") query.chapterIds = myChapters.map((c) => c.id);
  else if (filter !== "all") query.kind = filter as PostKind;
  const skipFeed = filter === "chapters" && myChapters.length === 0;

  const now = new Date().toISOString();
  const [posts, pinned, events, articles, board, activity] = await Promise.all([
    verified && !skipFeed ? listPosts(supabase, query) : Promise.resolve([]),
    verified
      ? supabase
          .from("posts")
          .select("id, title, body, kind, created_at, chapter:chapters(name)")
          .eq("is_pinned", true)
          .order("pinned_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    supabase
      .from("events")
      .select("id, title, event_date, location")
      .gte("event_date", now)
      .order("event_date")
      .limit(3),
    supabase
      .from("articles")
      .select("slug, title, category, reading_minutes, cover_url")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(3),
    supabase.rpc("noticeboard_feed", { p_limit: 3 }),
    supabase
      .from("notifications")
      .select("id, title, link, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const hasMore = posts.length > limit;
  const visible = posts.slice(0, limit);
  const reactions = await myReactions(supabase, me.id, visible.map((p) => p.id));
  const viewer = { id: me.id, isAdmin, leadOf: myChapters.filter((c) => c.role === "lead").map((c) => c.id) };
  const kinds: PostKind[] = ["post", "memory", "achievement", "discussion", ...(isAdmin ? (["announcement"] as PostKind[]) : [])];
  const first = (me.full_name ?? "").trim().split(/\s+/)[0];
  const cards = (board.data as NoticeCard[] | null) ?? [];

  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-16 pt-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
      <div className="min-w-0">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-mono text-ink/55">{stampDate(now)} · Bengaluru time</p>
            <h1 className="mt-2 font-display text-[clamp(1.9rem,5vw,2.9rem)] leading-[0.98]">
              {greeting()}
              {first ? <>, <span className="serif-accent hl">{first}</span></> : null}.
            </h1>
          </div>
        </header>

        {!verified && (
          <div className="stickynote mb-6 max-w-xl px-5 py-4" style={{ ["--note" as string]: "#ffd9c7" }}>
            <p className="font-display text-lg font-bold">
              {me.verification_status === "rejected" ? "Your registration was not approved" : "Your account is waiting for review"}
            </p>
            <p className="mt-1 text-sm text-ink/75">
              An admin verifies every alum before the feed, the forum and messages open up. You can
              finish your profile and browse events, the blog and The Wall in the meantime.
            </p>
            <Link href="/profile" className="btn btn-sm mt-3">
              Go to your profile
            </Link>
          </div>
        )}

        {verified && (
          <>
            <Composer me={me} userId={me.id} kinds={kinds} defaultKind="post" />

            <nav aria-label="Filter the feed" className="-mx-4 my-5 flex gap-1.5 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={f.key === "all" ? "/" : `/?show=${f.key}`}
                  aria-current={filter === f.key ? "page" : undefined}
                  className="chip"
                  scroll={false}
                >
                  {f.label}
                </Link>
              ))}
            </nav>

            {filter === "all" && (pinned.data?.length ?? 0) > 0 && (
              <section aria-label="Pinned" className="mb-6 grid gap-4 sm:grid-cols-2">
                {pinned.data!.map((p, i) => {
                  const chapter = Array.isArray(p.chapter) ? p.chapter[0] : p.chapter;
                  return (
                    <Link
                      key={p.id}
                      href={`/community/${p.id}`}
                      className="stickynote pinned block px-5 pb-4 pt-6"
                      style={{
                        ["--tilt" as string]: `${((seeded(p.id) - 0.5) * 3).toFixed(2)}deg`,
                        ["--note" as string]: ["#c8f53c", "#ffd9c7", "#e2dbff"][i % 3],
                      }}
                    >
                      <span className="pin" aria-hidden="true" />
                      <p className="label-mono text-ink/60">Pinned{chapter?.name ? ` · ${chapter.name}` : ""}</p>
                      <p className="mt-2 line-clamp-3 font-display text-lg font-bold leading-snug">
                        {p.title ?? p.body}
                      </p>
                    </Link>
                  );
                })}
              </section>
            )}

            <div className="flex flex-col gap-5">
              {visible.map((p) => (
                <PostCard key={p.id} post={p} viewer={viewer} myReaction={reactions[p.id] ?? null} />
              ))}
            </div>

            {visible.length === 0 &&
              (skipFeed ? (
                <EmptyState
                  title="You have not joined a chapter yet"
                  body="Chapters are the city and region communities of the network. Join one and its posts show up here."
                  action={{ href: "/chapters", label: "Find your chapter" }}
                />
              ) : (
                <EmptyState
                  title={filter === "all" ? "The feed is a blank page" : "Nothing here yet"}
                  body={
                    filter === "all"
                      ? "Nobody has posted yet, which makes this the best moment to say hello. Share a memory, a milestone or a question."
                      : "No posts of this kind so far. Yours could be the first."
                  }
                />
              ))}

            {hasMore && (
              <div className="mt-8 text-center">
                <Link
                  href={`/?${filter === "all" ? "" : `show=${filter}&`}n=${limit + PAGE}`}
                  scroll={false}
                  className="btn btn-ghost"
                >
                  Show older posts
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Context column ---- */}
      <aside className="flex flex-col gap-8 lg:sticky lg:top-[calc(var(--topbar)+1.5rem)] lg:max-h-[calc(100vh-var(--topbar)-3rem)] lg:overflow-y-auto lg:pb-4 no-scrollbar">
        <section aria-labelledby="side-wall">
          <Link href="/noticeboard" className="board group block overflow-hidden rounded-md px-5 pb-5 pt-4">
            <p id="side-wall" className="flex items-center justify-between font-display text-xl font-extrabold text-ivory">
              The Wall
              <Icon name="arrow" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </p>
            <div className="mt-4 flex gap-3">
              {cards.length === 0 && (
                <p className="rounded-sm bg-paper px-3 py-2 text-sm text-ink/70">Nothing pinned yet.</p>
              )}
              {cards.slice(0, 3).map((c, i) => {
                const img = c.instagram?.image ?? c.photo?.thumb ?? c.event?.image ?? c.image ?? c.post?.media?.[0];
                return (
                  <div
                    key={c.id}
                    className="relative w-1/3 bg-white p-1.5 pb-4 shadow-[0_6px_10px_-6px_rgb(0_0_0/0.5)]"
                    style={{ transform: `rotate(${[-4, 3, -2][i]}deg)` }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    ) : (
                      <p className="flex aspect-square items-center p-1 text-[0.625rem] font-semibold leading-tight">
                        {(c.title ?? c.post?.title ?? c.post?.body ?? c.event?.title ?? "").slice(0, 60)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Link>
        </section>

        <section aria-labelledby="side-events">
          <h2 id="side-events" className="label-mono mb-3 flex items-center justify-between text-ink/60">
            Coming up
            <Link href="/events" className="normal-case tracking-normal text-forest hover:underline">
              All events
            </Link>
          </h2>
          {(events.data ?? []).length === 0 ? (
            <p className="text-sm text-ink/60">No events on the calendar right now.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {events.data!.map((e) => (
                <li key={e.id}>
                  <EventStub id={e.id} title={e.title} date={e.event_date} location={e.location} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="side-chapters">
          <h2 id="side-chapters" className="label-mono mb-3 flex items-center justify-between text-ink/60">
            Your chapters
            <Link href="/chapters" className="normal-case tracking-normal text-forest hover:underline">
              Browse
            </Link>
          </h2>
          {myChapters.length === 0 ? (
            <p className="text-sm text-ink/60">
              You are not in a chapter yet.{" "}
              <Link href="/chapters" className="font-semibold text-forest hover:underline">
                Find your city
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {myChapters.map((c) => (
                <li key={c.id}>
                  <Link href={`/chapters/${c.slug}`} className="chip">
                    <Icon name="map" className="h-4 w-4" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(articles.data ?? []).length > 0 && (
          <section aria-labelledby="side-blog">
            <h2 id="side-blog" className="label-mono mb-3 flex items-center justify-between text-ink/60">
              From Blog &amp; Insights
              <Link href="/blog" className="normal-case tracking-normal text-forest hover:underline">
                Read
              </Link>
            </h2>
            <ul className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
              {articles.data!.map((a) => (
                <li key={a.slug}>
                  <Link href={`/blog/${a.slug}`} className="group block py-3">
                    <p className="label-mono text-tangerine">{a.category}</p>
                    <p className="mt-1 font-serif text-[1.05rem] leading-snug group-hover:underline">{a.title}</p>
                    <p className="mt-1 text-xs text-ink/50">{a.reading_minutes} min read</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(activity.data ?? []).length > 0 && (
          <section aria-labelledby="side-activity">
            <h2 id="side-activity" className="label-mono mb-3 flex items-center justify-between text-ink/60">
              Recent activity
              <Link href="/notifications" className="normal-case tracking-normal text-forest hover:underline">
                See all
              </Link>
            </h2>
            <ul className="flex flex-col gap-2.5">
              {activity.data!.map((n) => (
                <li key={n.id} className="flex gap-2 text-sm leading-snug">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read_at ? "bg-ink/20" : "bg-tangerine"}`} />
                  <Link href={n.link ?? "/notifications"} className="hover:underline">
                    {n.title} <span className="text-ink/45">· {timeAgo(n.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
