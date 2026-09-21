import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AuthSplit from "@/components/AuthSplit";
import CountUp from "@/components/CountUp";
import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import JoinPanel from "./JoinPanel";
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
          <AuthSplit
            mobileHero={
              <>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ivory/60">
                  New here
                </p>
                <h1 className="mt-4 font-display text-[2.75rem] leading-[0.98] tracking-tight">
                  Join the <span className="italic text-accent">network.</span>
                </h1>
                <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-ivory/70">
                  Two minutes to set up, then the whole BMS network opens up.
                </p>
                <div className="mt-6 flex gap-8">
                  <p>
                    <span className="block font-display text-3xl text-accent"><CountUp value="10+" /></span>
                    <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ivory/60">Countries</span>
                  </p>
                  <p>
                    <span className="block font-display text-3xl text-accent"><CountUp value="30+" /></span>
                    <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ivory/60">Chapters</span>
                  </p>
                </div>
              </>
            }
            panel={
              <>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ivory/60">
                  What you get
                </p>
                <ul className="mt-8 flex flex-col gap-3">
                  {[
                    ["The directory", "Find classmates by batch, branch, city, industry or company."],
                    ["Your chapter", "Meet BMS alumni in 30+ chapters across 10+ countries."],
                    ["Events & reunions", "RSVP to meetups and reunions near you."],
                    ["Mentorship & community", "Ask, answer and help, from campus to career."],
                  ].map(([t, d], i) => (
                    <Reveal as="li" key={t} delay={i * 90}>
                      <SpotlightCard className="rounded-2xl border border-ivory/10 p-4 transition-colors hover:border-ivory/25">
                        <div className="flex gap-5">
                          <span className="font-display text-3xl italic leading-none text-accent">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>
                            <span className="block font-display text-xl text-ivory">{t}</span>
                            <span className="mt-1 block font-sans text-sm leading-relaxed text-ivory/65">
                              {d}
                            </span>
                          </span>
                        </div>
                      </SpotlightCard>
                    </Reveal>
                  ))}
                </ul>
                <div className="mt-12 border-t border-ivory/15 pt-8">
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ivory/60">
                    How it works
                  </p>
                  <ol className="mt-5 flex flex-col gap-2 font-sans text-sm text-ivory/80">
                    <li>1. Sign up and complete your profile.</li>
                    <li>2. We confirm you&rsquo;re from BMS.</li>
                    <li>3. You&rsquo;re in. Say hello to your batch.</li>
                  </ol>
                </div>
              </>
            }
          >
            <JoinPanel initialStudent={isStudent} next={next} error={!!error} />
          </AuthSplit>
        </section>
      </main>
      <Footer />
    </>
  );
}
