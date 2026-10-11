import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Avatar from "@/components/v2/Avatar";
import EmptyState from "@/components/v2/EmptyState";
import PostCard from "@/components/v2/PostCard";
import { requireMember } from "@/lib/me";
import { listPosts, myReactions } from "@/lib/posts";
import { plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Search: BMSCE Alumni Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// One search box in the top bar, two kinds of result: people and posts.
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const { supabase, me, verified, isAdmin } = await requireMember(`/search?q=${encodeURIComponent(q)}`);
  const like = q.replace(/[%,()]/g, " ");
  const ready = q.length >= 2 && verified;

  const [people, posts] = ready
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, photo_url, user_type, graduation_year, branch, company, job_title, current_city, privacy")
          .eq("verification_status", "verified")
          .or(`full_name.ilike.%${like}%,company.ilike.%${like}%,job_title.ilike.%${like}%,current_city.ilike.%${like}%`)
          .limit(30),
        listPosts(supabase, { scope: "feed", q, limit: 15 }).catch(() => []),
      ])
    : [{ data: [] }, []];
  const reactions = await myReactions(supabase, me.id, posts.map((p) => p.id));
  // A member who hides their work or city is neither matched on it nor shown with it.
  const needle = like.toLowerCase().trim();
  const hit = (v: string | null) => Boolean(v && v.toLowerCase().includes(needle));
  const found = (people.data ?? [])
    .map((p) => {
      const privacy = (p.privacy ?? {}) as { show_work?: boolean; show_location?: boolean };
      const own = p.id === me.id || isAdmin;
      const work = own || privacy.show_work !== false;
      const place = own || privacy.show_location !== false;
      return { ...p, company: work ? p.company : null, job_title: work ? p.job_title : null, current_city: place ? p.current_city : null };
    })
    .filter((p) => hit(p.full_name) || hit(p.company) || hit(p.job_title) || hit(p.current_city))
    .slice(0, 12);

  return (
    <>
      <main className="mx-auto max-w-[860px] px-4 pb-16 pt-6 md:px-8">
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-none">
          {q ? (
            <>
              Results for <span className="serif-accent hl">{q}</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        <form action="/search" role="search" className="mt-5 flex gap-2">
          <label htmlFor="search-q" className="sr-only">
            Search people and posts
          </label>
          <input
            id="search-q"
            name="q"
            defaultValue={q}
            placeholder="A name, a company, a city, a topic"
            className="field rounded-full"
          />
          <button className="btn shrink-0">Search</button>
        </form>

        {!verified && (
          <EmptyState
            title="Search opens after verification"
            body="Once an admin has verified your account you can search members and posts."
          />
        )}
        {verified && q.length < 2 && <p className="mt-8 text-ink/70">Type at least two letters to search members and posts.</p>}

        {ready && (
          <>
            <section aria-labelledby="people-title" className="mt-10">
              <h2 id="people-title" className="label-mono text-ink/70">
                People · {plural(found.length, "match", "matches")}
              </h2>
              {found.length === 0 ? (
                <p className="mt-3 text-sm text-ink/70">
                  No members match. The{" "}
                  <Link href="/directory" className="font-semibold text-forest underline">
                    Alumni Network
                  </Link>{" "}
                  has filters for batch, branch, city and industry.
                </p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {found.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/directory/${p.id}`}
                        className="sheet flex items-center gap-3 px-4 py-3 transition-transform hover:-translate-y-0.5"
                      >
                        <Avatar name={p.full_name} src={p.photo_url} size={44} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.full_name ?? "Member"}</span>
                          <span className="block truncate text-xs text-ink/70">
                            {[
                              p.user_type === "student" ? "Student" : p.graduation_year ? `Class of ${p.graduation_year}` : "Alumni",
                              [p.job_title, p.company].filter(Boolean).join(" at "),
                              p.current_city,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="posts-title" className="mt-10">
              <h2 id="posts-title" className="label-mono text-ink/70">
                Posts · {plural(posts.length, "match", "matches")}
              </h2>
              {posts.length === 0 ? (
                <p className="mt-3 text-sm text-ink/70">No posts mention that yet.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-5">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} viewer={{ id: me.id, isAdmin }} myReaction={reactions[p.id] ?? null} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
