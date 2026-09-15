import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import BecomeMentorForm from "./BecomeMentorForm";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Become a Mentor — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function BecomeMentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !profile.onboarded) redirect("/onboarding");

  const eligible =
    profile.user_type === "alumni" && profile.verification_status === "verified";

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-2xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <Eyebrow>Mentorship</Eyebrow>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
              {profile.is_mentor ? "Your mentor profile." : "Become a mentor."}
            </h1>

            {!eligible ? (
              <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-12 text-center">
                <p className="font-display text-xl italic text-ink">
                  Mentoring is for verified alumni.
                </p>
                <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-ink/65">
                  {profile.user_type === "student"
                    ? "You're signed in as a current student — you can request mentorship from alumni instead."
                    : "Once an admin verifies your alumni profile, you'll be able to list yourself as a mentor."}
                </p>
                <Link
                  href="/careers/mentorship"
                  className="mt-6 inline-flex items-center justify-center rounded-sm bg-oxblood px-6 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                >
                  Browse mentors
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
                  Tell students what you can help with. You choose which
                  requests to accept — nothing is automatic.
                </p>
                <div className="mt-10">
                  <BecomeMentorForm profile={profile} />
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
