import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import LinkedInBadge from "@/components/LinkedInBadge";
import ReportButton from "@/components/ReportButton";
import EmptyState from "@/components/v2/EmptyState";
import IdCard from "@/components/v2/IdCard";
import Icon from "@/components/v2/Icon";
import PostCard from "@/components/v2/PostCard";
import { deptLine, idLines } from "@/lib/dept";
import { requireMember } from "@/lib/me";
import { listPosts, myReactions } from "@/lib/posts";
import { getCareersEnabled } from "@/lib/settings";
import { safeUrl } from "@/lib/url";
import type { EducationEntry, Privacy, Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Member profile: BMSCE Alumni Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Shown = Pick<
  Profile,
  | "id" | "full_name" | "photo_url" | "user_type" | "job_title" | "company" | "graduation_year" | "branch"
  | "current_city" | "country" | "industry" | "linkedin_url" | "linkedin_verified" | "bio" | "is_mentor"
  | "mentor_bio" | "skills" | "interests" | "privacy" | "verification_status" | "usn" | "created_at"
>;


const DEFAULT_PRIVACY: Privacy = { dm: "members", show_work: true, show_location: true, show_linkedin: true };

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, me, verified, isAdmin } = await requireMember(`/directory/${id}`);
  const careersEnabledPromise = getCareersEnabled();

  // Row Level Security decides who can load this row at all: verified members
  // see verified members; contact details live in a separate, stricter table.
  const { data: p } = await supabase
    .from("profiles")
    .select(
      "id, full_name, photo_url, user_type, job_title, company, graduation_year, branch, current_city, country, industry, linkedin_url, linkedin_verified, bio, is_mentor, mentor_bio, skills, interests, privacy, verification_status, usn, created_at"
    )
    .eq("id", id)
    .maybeSingle<Shown>();

  if (!p) {
    return (
      <>
        <main className="mx-auto max-w-2xl px-5 py-20">
          <EmptyState
            title="This profile is not visible to you"
            body="Member profiles are visible to verified members of the network."
            action={{ href: "/directory", label: "Back to the Alumni Network" }}
          />
        </main>
        <Footer />
      </>
    );
  }

  const own = p.id === me.id;
  // The member's own visibility choices. Their own view and admins see everything.
  const privacy = { ...DEFAULT_PRIVACY, ...(p.privacy ?? {}) };
  const all = own || isAdmin;
  const showWork = all || privacy.show_work;
  const showLocation = all || privacy.show_location;
  const showLinkedin = all || privacy.show_linkedin;
  const isStudent = p.user_type === "student";

  const [careersEnabled, education, chapters, posts, canDm] = await Promise.all([
    careersEnabledPromise,
    supabase
      .from("education_entries")
      .select("id, degree, institution, year")
      .eq("profile_id", id)
      .order("year", { ascending: false })
      .returns<Pick<EducationEntry, "id" | "degree" | "institution" | "year">[]>(),
    verified
      ? supabase.from("chapter_members").select("role, chapter:chapters(name, slug)").eq("profile_id", id).eq("status", "active")
      : Promise.resolve({ data: [] }),
    verified ? listPosts(supabase, { scope: "author", authorId: id, limit: 5 }).catch(() => []) : Promise.resolve([]),
    own || !verified ? Promise.resolve({ data: false }) : supabase.rpc("can_dm", { p_target: id }),
  ]);
  const reactions = await myReactions(supabase, me.id, posts.map((x) => x.id));
  const role = showWork ? [p.job_title, p.company].filter(Boolean).join(" at ") : "";
  const place = showLocation ? [p.current_city, p.country].filter(Boolean).join(", ") : "";
  const linkedin = showLinkedin ? safeUrl(p.linkedin_url) : null;
  const myChapters = ((chapters.data ?? []) as { role: string; chapter: { name: string; slug: string } | { name: string; slug: string }[] | null }[])
    .map((c) => ({ role: c.role, ...(Array.isArray(c.chapter) ? c.chapter[0] : c.chapter) }))
    .filter((c): c is { role: string; name: string; slug: string } => Boolean(c?.slug));

  return (
    <>
      <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-6 md:px-8">
        <Link href="/directory" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/65 hover:text-ink">
          <Icon name="back" className="h-4 w-4" /> Alumni Network
        </Link>

        <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
        {/* The member's college ID card, as it was printed. */}
        <div className="lg:col-start-1 lg:row-start-1">
          <IdCard
            data={{
              name: p.full_name || "BMS member",
              photo: p.photo_url,
              dept: deptLine(p.branch),
              // The roll number if the member gave one; otherwise their batch.
              ...idLines(p),
              back: {
                kind: isStudent ? "Student" : p.graduation_year ? `Alumni, batch of ${p.graduation_year}` : "Alumni",
                verified: p.verification_status === "verified",
                since: p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }) : null,
                role: role || null,
                place: place || null,
                chapters: myChapters.map((c) => c.name),
              },
            }}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <header className="sheet px-5 pb-6 pt-7 sm:px-8">
          <span className="tape tape-left" aria-hidden="true" />
          <div className="flex flex-wrap items-start gap-5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className={`stamp ${isStudent ? "text-violet" : "text-forest"}`}>{isStudent ? "Student" : "Alumni"}</span>
                {p.verification_status !== "verified" && <span className="stamp text-tangerine">Not verified yet</span>}
                {p.linkedin_verified && <LinkedInBadge />}
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.98]">{p.full_name || "BMS member"}</h1>
              {role && <p className="mt-2 text-lg text-ink/75">{role}</p>}
              <p className="label-mono mt-3 text-ink/55">
                {[p.graduation_year ? `${isStudent ? "Class of" : "Batch of"} ${p.graduation_year}` : null, p.branch, place].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col">
              {own ? (
                <>
                  <Link href="/profile/edit" className="btn btn-sm">
                    <Icon name="edit" className="h-4 w-4" /> Edit profile
                  </Link>
                  <a href="/profile/card" download="bms-id-card.png" className="btn btn-ghost btn-sm">
                    <Icon name="image" className="h-4 w-4" /> Save my ID card
                  </a>
                </>
              ) : canDm.data ? (
                <Link href={`/messages?to=${p.id}`} className="btn btn-sm">
                  <Icon name="mail" className="h-4 w-4" /> Message
                </Link>
              ) : (
                verified && (
                  <span className="rounded-full border border-ink/20 px-3 py-2 text-xs text-ink/60">
                    {privacy.dm === "nobody" ? "Not accepting messages" : privacy.dm === "chapters" ? "Messages from chapter members only" : "Messaging unavailable"}
                  </span>
                )
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  LinkedIn
                </a>
              )}
              {p.is_mentor && careersEnabled && !own && (
                <Link href="/careers/mentorship" className="btn btn-ghost btn-sm">
                  Request mentorship
                </Link>
              )}
            </div>
          </div>
        </header>

          <div className="mt-8 min-w-0">
            {p.bio && (
              <section aria-labelledby="about-title">
                <h2 id="about-title" className="label-mono text-ink/60">About</h2>
                <p className="mt-3 whitespace-pre-wrap font-serif text-[1.15rem] leading-relaxed">{p.bio}</p>
              </section>
            )}

            <section aria-labelledby="posts-title" className="mt-10">
              <h2 id="posts-title" className="label-mono text-ink/60">
                {own ? "Your recent posts" : `Recent posts by ${(p.full_name ?? "this member").split(" ")[0]}`}
              </h2>
              {posts.length === 0 ? (
                <p className="mt-3 text-sm text-ink/60">{own ? "You have not posted yet." : "Nothing posted yet."}</p>
              ) : (
                <div className="mt-4 flex flex-col gap-5">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} viewer={{ id: me.id, isAdmin }} myReaction={reactions[post.id] ?? null} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

          <aside className="flex flex-col gap-7 lg:col-start-1 lg:row-start-2">
            {showWork && p.industry && <Block title="Industry"><p className="text-sm">{p.industry}</p></Block>}
            {p.skills.length > 0 && (
              <Block title="Skills"><Tags items={p.skills} /></Block>
            )}
            {p.interests.length > 0 && (
              <Block title="Interests"><Tags items={p.interests} /></Block>
            )}
            {myChapters.length > 0 && (
              <Block title="Chapters">
                <ul className="flex flex-wrap gap-2">
                  {myChapters.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/chapters/${c.slug}`} className="chip">
                        <Icon name="map" className="h-4 w-4" />
                        {c.name}
                        {c.role === "lead" && <span className="label-mono text-tangerine">lead</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {(education.data ?? []).length > 0 && (
              <Block title="Higher education">
                <ul className="flex flex-col gap-2 text-sm">
                  {education.data!.map((e) => (
                    <li key={e.id}>
                      <span className="font-semibold">{e.degree}</span>
                      {e.institution ? `, ${e.institution}` : ""}
                      {e.year ? <span className="text-ink/55"> · {e.year}</span> : null}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {p.is_mentor && careersEnabled && (
              <Block title="Mentoring"><p className="text-sm leading-relaxed">{p.mentor_bio ?? "Available as a mentor."}</p></Block>
            )}
            {!own && (
              <div className="border-t border-ink/10 pt-4">
                <ReportButton targetType={p.is_mentor ? "mentor" : "profile"} targetId={p.id} />
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="label-mono mb-2.5 text-ink/60">{title}</h2>
      {children}
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <li key={s} className="rounded-sm bg-ink/[0.07] px-2 py-1 text-xs font-medium">
          {s}
        </li>
      ))}
    </ul>
  );
}
