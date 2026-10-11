import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import EmptyState from "@/components/v2/EmptyState";
import TransitionLink from "@/components/v2/vt/TransitionLink";
import { getMe } from "@/lib/me";
import { seeded } from "@/lib/format";
import type { Chapter } from "@/lib/types";

export const metadata: Metadata = {
  title: "Chapters: BMSCE Alumni Network",
  description: "City and region chapters of the BMSCE alumni network. Find yours and join its community.",
};
export const dynamic = "force-dynamic";

const REGION_ORDER = ["Asia", "North America", "Europe", "Australia"];

export default async function ChaptersPage() {
  const { supabase, user, me } = await getMe();
  const verified = me?.verification_status === "verified" || me?.role === "admin";

  const [{ data: rows }, mine, counts] = await Promise.all([
    supabase.from("chapters").select("*").eq("status", "active").order("name"),
    user
      ? supabase.from("chapter_members").select("chapter_id, status").eq("profile_id", user.id)
      : Promise.resolve({ data: [] as { chapter_id: string; status: string }[] }),
    verified ? supabase.rpc("chapter_member_counts") : Promise.resolve({ data: {} }),
  ]);
  const chapters = (rows ?? []) as Chapter[];
  const myStatus = new Map((mine.data ?? []).map((m) => [m.chapter_id, m.status]));
  const memberCount = (counts.data ?? {}) as Record<string, number>;
  const regions = [...new Set(chapters.map((c) => c.region))].sort(
    (a, b) => (REGION_ORDER.indexOf(a) + 99) % 99 - (REGION_ORDER.indexOf(b) + 99) % 99
  );
  const countries = new Set(chapters.map((c) => c.country).filter(Boolean)).size;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-10 md:pt-12">
        <header className="max-w-3xl">
          <p className="label-mono text-ink/70">Community · Chapters</p>
          <h1 className="mt-3 font-display text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[0.88] tracking-[-0.04em]">
            Wherever you <span className="serif-accent hl">landed</span>.
          </h1>
          <p className="mt-5 text-lg text-ink/70">
            {chapters.length > 0
              ? `${chapters.length} chapters across ${countries} countries. Each one is its own community inside the Network, with its own people, announcements, events and photos.`
              : "Chapters are the city and region communities of the Network."}
          </p>
        </header>

        {chapters.length === 0 && (
          <EmptyState
            title="No chapters yet"
            body="An admin has not set up any chapters. Once they do, every chapter gets its own community page here."
          />
        )}

        {regions.map((region) => (
          <section key={region} aria-labelledby={`region-${region}`} className="mt-16">
            <h2 id={`region-${region}`} className="flex items-baseline gap-4 border-b-[1.5px] border-ink pb-2 font-display text-2xl">
              {region}
              <span className="label-mono text-ink/70">
                {chapters.filter((c) => c.region === region).length} chapters
              </span>
            </h2>
            <ul className="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {chapters
                .filter((c) => c.region === region)
                .map((c) => {
                  const status = myStatus.get(c.id);
                  const n = memberCount[c.id] ?? 0;
                  return (
                    <li key={c.id}>
                      {/* A postcard from each city. */}
                      <TransitionLink
                        href={`/chapters/${c.slug}`}
                        vtName={`chapter-${c.slug}`}
                        className="pinned group relative block rounded-print bg-white p-2.5 pb-4 shadow-[var(--shadow-sheet)]"
                        style={{ ["--tilt" as string]: `${((seeded(c.slug) - 0.5) * 3.2).toFixed(2)}deg` }}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-brand-ink">
                          {c.cover_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.cover_url}
                              alt={`${c.name}: chapter photo`}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          )}
                          {status && (
                            <span className="stamp absolute right-2 top-2 border-blue bg-blue text-white">
                              {status === "active" ? "Member" : "Requested"}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 flex items-baseline justify-between gap-2 px-1">
                          <span className="font-display text-xl font-bold leading-none">{c.name}</span>
                          <span className="label-mono shrink-0 text-ink/70">
                            {verified ? `${n} ${n === 1 ? "member" : "members"}` : c.country ?? "Regional"}
                          </span>
                        </p>
                      </TransitionLink>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
