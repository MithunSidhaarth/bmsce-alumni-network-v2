import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AuthSplit from "@/components/AuthSplit";
import CountUp from "@/components/CountUp";
import LoginPanel from "./LoginPanel";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Sign in: BMSCE Alumni Network",
};

type Props = {
  searchParams: Promise<{ as?: string; error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { as, error, next: nextParam } = await searchParams;
  const isStudent = as === "student";
  // Where to land after signing in (e.g. "/chapters"). Sanitized to a same-origin
  // path; carried through the OAuth/email flows and the /auth/callback route.
  const next = safeNextPath(nextParam);

  // Already signed in? Skip the login screen.
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
          <AuthSplit
            mobileHero={
              <>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ivory/60">
                  Members
                </p>
                <h1 className="mt-4 font-display text-[2.75rem] leading-[0.98] tracking-tight">
                  Welcome <span className="italic text-accent">back.</span>
                </h1>
                <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-ivory/70">
                  The directory, your chapter, events and conversations are
                  waiting.
                </p>
              </>
            }
            panel={
              <>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ivory/60">
                  In their words
                </p>
                <blockquote className="mt-8 font-display text-[clamp(1.75rem,2.6vw,2.5rem)] italic leading-[1.2] text-ivory">
                  &ldquo;I connected with an alumnus who referred me, and that
                  internship became a full-time role.&rdquo;
                </blockquote>
                <p className="mt-6 font-sans text-sm text-ivory/70">
                  Bharath Gorental, BMSCE alumnus
                </p>
                <div className="mt-14 grid grid-cols-2 gap-8 border-t border-ivory/15 pt-8">
                  <div>
                    <p className="font-display text-5xl text-accent"><CountUp value="10+" /></p>
                    <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ivory/60">
                      Countries
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-5xl text-accent"><CountUp value="30+" /></p>
                    <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ivory/60">
                      Chapters
                    </p>
                  </div>
                </div>
              </>
            }
          >
            <LoginPanel initialStudent={isStudent} next={next} error={!!error} />
          </AuthSplit>
        </section>
      </main>
      <Footer />
    </>
  );
}
