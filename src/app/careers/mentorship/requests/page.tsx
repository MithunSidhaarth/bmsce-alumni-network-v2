import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import {
  IncomingList,
  OutgoingList,
  type Person,
  type ReqView,
} from "./RequestsClient";
import { createClient } from "@/lib/supabase/server";
import type { MentorshipRequest, Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "My Mentorship — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function MentorshipRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!me || !me.onboarded) redirect("/onboarding");

  // RLS: only rows where I'm the mentor or the mentee come back.
  const [{ data: incomingRaw }, { data: outgoingRaw }] = await Promise.all([
    supabase
      .from("mentorship_requests")
      .select("*")
      .eq("mentor_id", me.id)
      .order("created_at", { ascending: false })
      .returns<MentorshipRequest[]>(),
    supabase
      .from("mentorship_requests")
      .select("*")
      .eq("mentee_id", me.id)
      .order("created_at", { ascending: false })
      .returns<MentorshipRequest[]>(),
  ]);

  const incoming = incomingRaw ?? [];
  const outgoing = outgoingRaw ?? [];

  // Fetch the counterpart profiles in one go (visible via shares_mentorship_with).
  const otherIds = Array.from(
    new Set([
      ...incoming.map((r) => r.mentee_id),
      ...outgoing.map((r) => r.mentor_id),
    ])
  );

  const peopleById = new Map<string, Profile>();
  // Contact rows come from member_contacts, whose RLS only returns a
  // counterpart's contact when there's an ACCEPTED mentorship between us —
  // the server can't leak an email for a pending/declined request.
  const contactById = new Map<
    string,
    { personal_email: string | null; college_email: string | null }
  >();
  if (otherIds.length) {
    const [{ data: people }, { data: contacts }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", otherIds).returns<Profile[]>(),
      supabase
        .from("member_contacts")
        .select("member_id, personal_email, college_email")
        .in("member_id", otherIds),
    ]);
    for (const p of people ?? []) peopleById.set(p.id, p);
    for (const c of contacts ?? [])
      contactById.set(c.member_id as string, {
        personal_email: (c.personal_email as string) ?? null,
        college_email: (c.college_email as string) ?? null,
      });
  }

  // Contact details are only exposed once a request is accepted (enforced by
  // RLS above; the `accepted` flag is belt-and-braces).
  const toPerson = (p: Profile | undefined, accepted: boolean): Person => {
    const contact = p ? contactById.get(p.id) : undefined;
    return {
      id: p?.id ?? "",
      name: p?.full_name ?? "BMS member",
      branch: p?.branch ?? null,
      gradYear: p?.graduation_year ?? null,
      userType: p?.user_type ?? null,
      title: p?.job_title ?? null,
      company: p?.company ?? null,
      photoUrl: p?.photo_url ?? null,
      email: accepted
        ? contact?.personal_email ?? contact?.college_email ?? null
        : null,
      linkedin: accepted ? p?.linkedin_url ?? null : null,
    };
  };

  const toView = (r: MentorshipRequest, otherId: string): ReqView => ({
    id: r.id,
    status: r.status,
    message: r.message,
    createdAt: r.created_at,
    person: toPerson(peopleById.get(otherId), r.status === "accepted"),
  });

  const incomingViews = incoming.map((r) => toView(r, r.mentee_id));
  const outgoingViews = outgoing.map((r) => toView(r, r.mentor_id));

  const acceptedCount = incoming.filter((r) => r.status === "accepted").length;

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <div className="flex items-center justify-between">
              <Eyebrow>Mentorship</Eyebrow>
              <Link
                href="/careers/mentorship"
                className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
              >
                Browse mentors →
              </Link>
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
              My mentorship.
            </h1>

            {/* Mentor side */}
            {me.is_mentor && (
              <section className="mt-14">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl text-ink md:text-3xl">
                    Requests to me
                  </h2>
                  <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/45">
                    {acceptedCount} accepted
                    {me.max_mentees != null ? ` / ${me.max_mentees} max` : ""}
                  </span>
                </div>
                <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink/65">
                  You choose who to take on. Accepting shares your contact
                  details with them.
                </p>
                <div className="mt-6">
                  <IncomingList requests={incomingViews} />
                </div>
              </section>
            )}

            {/* Mentee side */}
            <section className="mt-14">
              <h2 className="font-display text-2xl text-ink md:text-3xl">
                My requests
              </h2>
              <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink/65">
                Mentorship you&rsquo;ve asked for. Once a mentor accepts,
                you&rsquo;ll see their contact details here.
              </p>
              <div className="mt-6">
                <OutgoingList requests={outgoingViews} />
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
