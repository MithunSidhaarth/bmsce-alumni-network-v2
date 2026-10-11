import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Avatar from "@/components/v2/Avatar";
import ChapterControls, { MemberReview } from "@/components/v2/ChapterControls";
import Composer from "@/components/v2/Composer";
import EmptyState from "@/components/v2/EmptyState";
import EventStub from "@/components/v2/EventStub";
import Icon from "@/components/v2/Icon";
import PostCard from "@/components/v2/PostCard";
import { getMe } from "@/lib/me";
import { listPosts, myReactions } from "@/lib/posts";
import { plural } from "@/lib/format";
import type { Chapter, PostKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "posts", label: "Posts" },
  { key: "members", label: "Members" },
  { key: "events", label: "Events" },
  { key: "photos", label: "Photos" },
] as const;

type MemberRow = {
  role: "member" | "lead";
  status: "active" | "pending";
  profile: { id: string; full_name: string | null; photo_url: string | null; user_type: string; graduation_year: number | null; company: string | null; job_title: string | null } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getMe();
  const { data } = await supabase.from("chapters").select("name, description").eq("slug", slug).maybeSingle();
  return {
    title: data ? `${data.name} chapter: BMSCE Alumni Network` : "Chapter: BMSCE Alumni Network",
    description: data?.description ?? (data ? `The ${data.name} chapter of the BMSCE alumni network.` : undefined),
  };
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "posts";
  const { supabase, user, me } = await getMe();
  const isAdmin = me?.role === "admin" && !me?.suspended_at;
  const verified = Boolean(me && !me.suspended_at && (me.verification_status === "verified" || isAdmin));

  const { data: row } = await supabase.from("chapters").select("*").eq("slug", slug).maybeSingle();
  const chapter = row as Chapter | null;
  if (!chapter) notFound();

  const { data: memberRows } = verified
    ? await supabase
        .from("chapter_members")
        .select("role, status, profile:profiles(id, full_name, photo_url, user_type, graduation_year, company, job_title)")
        .eq("chapter_id", chapter.id)
        .order("role", { ascending: false })
        .order("created_at")
    : { data: [] };
  const members = ((memberRows ?? []) as unknown as (Omit<MemberRow, "profile"> & { profile: MemberRow["profile"] | MemberRow["profile"][] })[])
    .map((m) => ({ ...m, profile: Array.isArray(m.profile) ? (m.profile[0] ?? null) : m.profile }))
    .filter((m) => m.profile);
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");
  const leads = active.filter((m) => m.role === "lead");
  const mineRow = members.find((m) => m.profile!.id === user?.id);
  const isMember = mineRow?.status === "active";
  const isLead = isMember && mineRow?.role === "lead";
  const canManage = isAdmin || isLead;
  const place = [chapter.city, chapter.country].filter(Boolean).join(", ") || chapter.region;

  const posts = verified && tab === "posts" ? await listPosts(supabase, { scope: "chapter", chapterId: chapter.id, limit: 30 }) : [];
  const reactions = me ? await myReactions(supabase, me.id, posts.map((p) => p.id)) : {};
  const now = new Date().toISOString();
  const [upcoming, past, photos, memories] =
    tab === "events" || tab === "photos"
      ? await Promise.all([
          supabase.from("events").select("id, title, event_date, location").eq("chapter_id", chapter.id).gte("event_date", now).order("event_date"),
          supabase.from("events").select("id, title, event_date, location").eq("chapter_id", chapter.id).lt("event_date", now).order("event_date", { ascending: false }).limit(8),
          supabase.from("gallery_photos").select("id, thumbnail_url, image_url, caption").eq("chapter_id", chapter.id).order("uploaded_at", { ascending: false }).limit(40),
          verified
            ? supabase.from("posts").select("id, media").eq("chapter_id", chapter.id).neq("media", "{}").order("created_at", { ascending: false }).limit(30)
            : Promise.resolve({ data: [] as { id: string; media: string[] }[] }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const kinds: PostKind[] = ["post", "memory", "discussion", ...(canManage ? (["announcement"] as PostKind[]) : [])];
  const pics = [
    ...(photos.data ?? []).map((p) => ({ key: p.id, src: p.thumbnail_url as string, href: null as string | null, alt: (p.caption as string | null) ?? "" })),
    ...(memories.data ?? []).flatMap((p) => (p.media as string[]).map((m, i) => ({ key: `${p.id}-${i}`, src: m, href: `/community/${p.id}`, alt: "" }))),
  ];

  return (
    <>
      <Nav />
      <main className="pb-20">
        {/* Cover: the city photograph with the chapter name stamped over it. */}
        <header className="relative isolate overflow-hidden bg-forest text-ivory">
          {chapter.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chapter.cover_url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest via-forest/70 to-forest/20" />
          <div className="mx-auto max-w-[1180px] px-4 pb-8 pt-16 md:px-8 md:pt-28">
            <Link href="/chapters" className="inline-flex items-center gap-2 text-sm font-semibold text-ivory/80 hover:text-lime">
              <Icon name="back" className="h-4 w-4" /> All chapters
            </Link>
            <p className="label-mono mt-6 flex items-center gap-2 text-lime">
              <Icon name="map" className="h-4 w-4" /> {place}
              {chapter.status === "archived" && <span className="stamp ml-2 text-tangerine">Archived</span>}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.8rem,10vw,6.5rem)] font-extrabold leading-[0.86] tracking-[-0.045em]">
              {chapter.name}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
              {verified && (
                <p className="text-sm text-ivory/80">
                  {plural(active.length, "member")}
                  {leads.length > 0 && ` · led by ${leads.map((l) => l.profile!.full_name ?? "a member").join(", ")}`}
                </p>
              )}
              <ChapterControls
                chapterId={chapter.id}
                slug={chapter.slug}
                signedIn={Boolean(user)}
                verified={verified}
                status={mineRow?.status ?? null}
                joinPolicy={chapter.join_policy}
                whatsappUrl={isMember ? chapter.whatsapp_url : null}
              />
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pt-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <nav aria-label="Chapter sections" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={t.key === "posts" ? `/chapters/${slug}` : `/chapters/${slug}?tab=${t.key}`}
                  aria-current={tab === t.key ? "page" : undefined}
                  className="chip"
                  scroll={false}
                >
                  {t.label}
                  {t.key === "members" && canManage && pending.length > 0 && (
                    <span className="rounded-full bg-tangerine px-1.5 font-mono text-[10px] text-white">{pending.length}</span>
                  )}
                </Link>
              ))}
            </nav>

            {!verified && (
              <EmptyState
                title={user ? "Members only, once you are verified" : "This is a members' space"}
                body="Chapter posts, members and photos are visible to verified members of the network."
                action={user ? { href: "/profile", label: "Check your status" } : { href: `/login?next=/chapters/${slug}`, label: "Sign in" }}
              />
            )}

            {verified && tab === "posts" && (
              <div className="mt-6 flex flex-col gap-5">
                {me && (
                  <Composer
                    me={me}
                    userId={me.id}
                    kinds={kinds}
                    chapterId={chapter.id}
                    chapterName={chapter.name}
                    disabledReason={isMember || isAdmin ? undefined : "Join this chapter to post in it."}
                  />
                )}
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    viewer={{ id: me!.id, isAdmin, leadOf: canManage ? [chapter.id] : [] }}
                    myReaction={reactions[p.id] ?? null}
                  />
                ))}
                {posts.length === 0 && (
                  <EmptyState
                    title="A quiet chapter, for now"
                    body={`Nobody has posted in ${chapter.name} yet. Introduce yourself, propose a meetup, or share a photo from the last one.`}
                  />
                )}
              </div>
            )}

            {verified && tab === "members" && (
              <div className="mt-6">
                {canManage && pending.length > 0 && (
                  <section aria-labelledby="pending-title" className="stickynote mb-8 px-5 py-5" style={{ ["--note" as string]: "#ffd9c7" }}>
                    <h2 id="pending-title" className="font-display text-lg font-bold">
                      {plural(pending.length, "request")} to join
                    </h2>
                    <ul className="mt-3 flex flex-col gap-3">
                      {pending.map((m) => (
                        <li key={m.profile!.id} className="flex flex-wrap items-center gap-3">
                          <Avatar name={m.profile!.full_name} src={m.profile!.photo_url} size={36} />
                          <Link href={`/directory/${m.profile!.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                            {m.profile!.full_name ?? "Member"}
                          </Link>
                          <MemberReview chapterId={chapter.id} slug={slug} profileId={m.profile!.id} mode="pending" />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <ul className="sheet divide-y divide-ink/10">
                  {active.map((m) => (
                    <li key={m.profile!.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <Avatar name={m.profile!.full_name} src={m.profile!.photo_url} size={40} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/directory/${m.profile!.id}`} className="font-semibold hover:underline">
                          {m.profile!.full_name ?? "Member"}
                        </Link>
                        <p className="truncate text-xs text-ink/55">
                          {[
                            m.profile!.user_type === "student" ? "Student" : m.profile!.graduation_year ? `Batch of ${m.profile!.graduation_year}` : "Alumni",
                            [m.profile!.job_title, m.profile!.company].filter(Boolean).join(" at "),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {m.role === "lead" && <span className="stamp text-forest">Chapter lead</span>}
                      {canManage && m.profile!.id !== me?.id && m.role !== "lead" && (
                        <MemberReview chapterId={chapter.id} slug={slug} profileId={m.profile!.id} mode="active" />
                      )}
                    </li>
                  ))}
                </ul>
                {active.length === 0 && (
                  <EmptyState title="No members yet" body="Be the first to join this chapter and get it started." />
                )}
              </div>
            )}

            {tab === "events" && (
              <div className="mt-6">
                <h2 className="label-mono text-ink/60">Upcoming</h2>
                {(upcoming.data ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-ink/60">No upcoming events for this chapter.</p>
                ) : (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {upcoming.data!.map((e) => (
                      <li key={e.id}>
                        <EventStub id={e.id} title={e.title} date={e.event_date} location={e.location} />
                      </li>
                    ))}
                  </ul>
                )}
                {(past.data ?? []).length > 0 && (
                  <>
                    <h2 className="label-mono mt-10 text-ink/60">Past reunions and meetups</h2>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {past.data!.map((e) => (
                        <li key={e.id} className="opacity-75">
                          <EventStub id={e.id} title={e.title} date={e.event_date} location={e.location} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {tab === "photos" &&
              (pics.length === 0 ? (
                <EmptyState
                  title="No photos yet"
                  body="Photos shared in this chapter's posts, and chapter photos added by the admins, collect here."
                />
              ) : (
                <ul className="mt-6 columns-2 gap-3 sm:columns-3">
                  {pics.map((p) => {
                    // eslint-disable-next-line @next/next/no-img-element
                    const img = <img src={p.src} alt={p.alt} loading="lazy" className="w-full" />;
                    return (
                      <li key={p.key} className="mb-3 break-inside-avoid bg-white p-1.5 shadow-[var(--shadow-sheet)]">
                        {p.href ? <Link href={p.href}>{img}</Link> : img}
                      </li>
                    );
                  })}
                </ul>
              ))}
          </div>

          <aside className="flex flex-col gap-6">
            <section className="sheet sheet-kraft px-5 py-5">
              <h2 className="label-mono text-ink/65">About this chapter</h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed">
                {chapter.description ?? `The ${chapter.name} chapter brings together BMSCE alumni and students in and around ${place}.`}
              </p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-ink/60">Region</dt>
                <dd>{chapter.region}</dd>
                <dt className="text-ink/60">Joining</dt>
                <dd>{chapter.join_policy === "open" ? "Open to verified members" : "By request, approved by a lead"}</dd>
              </dl>
            </section>
            {verified && leads.length > 0 && (
              <section>
                <h2 className="label-mono text-ink/60">Leadership</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {leads.map((l) => (
                    <li key={l.profile!.id}>
                      <Link href={`/directory/${l.profile!.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar name={l.profile!.full_name} src={l.profile!.photo_url} size={38} />
                        <span className="text-sm font-semibold">{l.profile!.full_name ?? "Member"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
