import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import MemberPhoto from "@/components/MemberPhoto";
import NewPostForm from "./NewPostForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Community — BMSCE Alumni Network",
  description:
    "Ask questions and start discussions with verified BMS alumni and students.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type FeedRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: { full_name: string | null; photo_url: string | null } | null;
  comments: { count: number }[];
  likes: { count: number }[];
};

function initials(name: string | null) {
  const parts = (name || "?").trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

function preview(body: string, max = 180) {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-out visitors are sent to sign in (same as the Careers gate).
  if (!user) redirect("/login?next=/community");

  const { data: me } = await supabase
    .from("profiles")
    .select("verification_status, role")
    .eq("id", user.id)
    .single();

  const canAccess =
    me?.verification_status === "verified" || me?.role === "admin";

  // Logged in but not verified — show a gentle "verify first" state.
  if (!canAccess) {
    return (
      <>
        <Nav />
        <main>
          <section id="top">
            <div className="mx-auto max-w-2xl px-6 py-32 text-center md:px-10">
              <Eyebrow align="center">Community</Eyebrow>
              <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
                Verify your account first.
              </h1>
              <p className="mx-auto mt-5 max-w-md font-sans text-base leading-relaxed text-ink/70">
                The community discussions are for verified members. An admin
                reviews new alumni before this opens up — it usually
                doesn&rsquo;t take long.
              </p>
              <Link
                href="/profile"
                className="mt-10 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
              >
                Go to your profile
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from("discussion_posts")
    .select(
      `id, title, body, created_at,
       author:profiles!discussion_posts_author_id_fkey(full_name, photo_url),
       comments:discussion_comments(count),
       likes:discussion_likes(count)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<FeedRow[]>();

  const posts = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <Eyebrow>Community</Eyebrow>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight text-ink">
              Ask the network.
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
              Questions, advice, introductions — start a thread and the network
              answers. Visible to verified members only.
            </p>

            <div className="mt-10">
              <NewPostForm />
            </div>

            {posts.length === 0 ? (
              <div className="mt-12 border-t border-gold/30 pt-12 text-center">
                <p className="font-display text-2xl italic text-ink">
                  No discussions yet.
                </p>
                <p className="mt-2 font-sans text-sm text-ink/60">
                  Be the first to start one.
                </p>
              </div>
            ) : (
              <ul className="mt-12 flex flex-col gap-4 border-t border-gold/30 pt-10">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/community/${p.id}`}
                      className="group block rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60"
                    >
                      <h2 className="font-display text-xl leading-snug text-ink transition-colors group-hover:text-oxblood md:text-2xl">
                        {p.title}
                      </h2>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-ink/65">
                        {preview(p.body)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-ink/55">
                        <span className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-ivory-dim font-display text-[10px] italic text-oxblood">
                            {p.author?.photo_url ? (
                              <MemberPhoto src={p.author.photo_url} />
                            ) : (
                              initials(p.author?.full_name ?? null)
                            )}
                          </span>
                          <span className="font-sans text-xs">
                            {p.author?.full_name || "A member"}
                          </span>
                        </span>
                        <span className="font-sans text-xs">
                          {p.likes[0]?.count ?? 0} likes ·{" "}
                          {p.comments[0]?.count ?? 0} comments ·{" "}
                          {new Date(p.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between border-t border-gold/25 pt-6 font-sans text-[12px] font-medium uppercase tracking-[0.12em]">
                {page > 1 ? (
                  <Link
                    href={`/community?page=${page - 1}`}
                    className="text-oxblood hover:text-maroon"
                  >
                    ← Newer
                  </Link>
                ) : (
                  <span className="text-ink/30">← Newer</span>
                )}
                <span className="text-ink/50">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/community?page=${page + 1}`}
                    className="text-oxblood hover:text-maroon"
                  >
                    Older →
                  </Link>
                ) : (
                  <span className="text-ink/30">Older →</span>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
