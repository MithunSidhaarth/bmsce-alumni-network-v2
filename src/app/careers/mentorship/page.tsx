import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import CareersTabs from "@/components/CareersTabs";
import MentorList, { type MentorCard } from "@/components/MentorList";
import { createClient } from "@/lib/supabase/server";
import type { MentorshipRequest, Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Find a Mentor — BMSCE Alumni Network",
  description:
    "Get paired with a BMS alum who has already walked the path you are on — one conversation at a time.",
};

export const dynamic = "force-dynamic";

export default async function MentorshipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let me: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();
    me = data ?? null;
  }

  // Real mentors: opted in, verified alumni.
  const { data: mentorRows } = await supabase
    .from("profiles")
    .select(
      "id, full_name, job_title, company, graduation_year, branch, mentor_expertise, mentor_industries, mentor_bio, mentor_availability, photo_url"
    )
    .eq("is_mentor", true)
    .eq("verification_status", "verified")
    .eq("user_type", "alumni")
    .order("full_name", { ascending: true });

  const mentors: MentorCard[] = (mentorRows ?? []).map((m) => ({
    id: m.id as string,
    name: (m.full_name as string) ?? "BMS alum",
    title: (m.job_title as string) ?? null,
    company: (m.company as string) ?? null,
    batch: (m.graduation_year as number) ?? null,
    branch: (m.branch as string) ?? null,
    bio: (m.mentor_bio as string) ?? null,
    expertise: (m.mentor_expertise as string[]) ?? [],
    industries: (m.mentor_industries as string[]) ?? [],
    availability: (m.mentor_availability as string) ?? null,
    photoUrl: (m.photo_url as string) ?? null,
  }));

  // Requests this viewer has already sent, so cards show their status.
  const requestedIds: Record<string, "pending" | "accepted" | "declined"> = {};
  if (me) {
    const { data: mine } = await supabase
      .from("mentorship_requests")
      .select("mentor_id, status")
      .eq("mentee_id", me.id)
      .returns<Pick<MentorshipRequest, "mentor_id" | "status">[]>();
    for (const r of mine ?? []) requestedIds[r.mentor_id] = r.status;
  }

  const viewer = !me
    ? ({ state: "anon" } as const)
    : me.verification_status !== "verified"
    ? ({ state: "unverified" } as const)
    : ({ state: "eligible", id: me.id } as const);

  const canBecomeMentor =
    me?.user_type === "alumni" && me?.verification_status === "verified";

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-16 md:px-10 md:pb-8 md:pt-24">
            <Reveal>
              <Eyebrow>Careers</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                Find a mentor.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                Alumni who have offered their time. Pick someone a few steps
                ahead and start the conversation.
              </p>
            </Reveal>

            {/* Entry points */}
            <Reveal delay={200}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {canBecomeMentor && (
                  <Link
                    href="/careers/mentorship/become"
                    className="inline-flex items-center justify-center rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                  >
                    {me?.is_mentor ? "Edit mentor profile" : "Become a mentor"}
                  </Link>
                )}
                {me && (
                  <Link
                    href="/careers/mentorship/requests"
                    className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                  >
                    My mentorship →
                  </Link>
                )}
              </div>
            </Reveal>

            <Reveal delay={240}>
              <CareersTabs />
            </Reveal>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-7xl px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-12">
            <MentorList
              mentors={mentors}
              viewer={viewer}
              requestedIds={requestedIds}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
