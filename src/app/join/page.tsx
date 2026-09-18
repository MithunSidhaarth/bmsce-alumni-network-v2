import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import LoginButtons from "../login/LoginButtons";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Join: BMSCE Alumni Network",
};

type Props = {
  searchParams: Promise<{ as?: string; error?: string; next?: string }>;
};

// Separate landing page for new members (vs. /login for returning ones).
// Shares LoginButtons/the OAuth+password flow with /login since joining and
// signing in are the same Supabase auth call either way — these two pages
// are expected to fold back into one once the flows fully converge.
export default async function JoinPage({ searchParams }: Props) {
  const { as, error, next: nextParam } = await searchParams;
  const isStudent = as === "student";
  const next = safeNextPath(nextParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .single();
    redirect(profile?.onboarded ? next : "/onboarding");
  }

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto flex max-w-md flex-col px-6 pb-24 pt-20 md:pt-28">
            <Reveal>
              <Eyebrow>{isStudent ? "For students" : "New here"}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
                Join the network.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 font-sans text-base leading-relaxed text-ink/70">
                {isStudent
                  ? "Create your account to connect with BMS alumni who can guide you."
                  : "It takes two minutes: the directory, chapters, events, and mentorship are waiting."}
              </p>
            </Reveal>

            {error && (
              <Reveal delay={200}>
                <p className="mt-6 rounded-xl border border-oxblood/30 bg-oxblood/5 px-4 py-3 font-sans text-sm text-oxblood">
                  Something went wrong signing you in. Please try again.
                </p>
              </Reveal>
            )}

            <Reveal delay={240}>
              <div className="mt-10">
                <LoginButtons
                  userType={isStudent ? "student" : "alumni"}
                  next={next}
                />
              </div>
            </Reveal>

            <Reveal delay={320}>
              <p className="mt-8 font-sans text-sm text-ink/60">
                Already a member?{" "}
                <Link
                  href={next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
                  className="border-b border-gold pb-0.5 text-oxblood transition-colors hover:border-oxblood"
                >
                  Sign in here
                </Link>
                .
              </p>
            </Reveal>

            <Reveal delay={360}>
              <p className="mt-6 font-sans text-xs leading-relaxed text-ink/45">
                By continuing you agree to be part of the BMSCE Alumni Network
                community. Alumni profiles are reviewed before appearing in the
                directory.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
