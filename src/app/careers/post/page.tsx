import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import PostOpeningForm from "./PostOpeningForm";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Post an Opening — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function PostOpeningPage() {
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

  const verified = profile.verification_status === "verified";

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-5xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <div className="flex items-center justify-between">
              <Eyebrow>Careers</Eyebrow>
              <Link
                href="/careers/my-postings"
                className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
              >
                My postings →
              </Link>
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
              Post an opening.
            </h1>

            {!verified ? (
              <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-14 text-center">
                <p className="font-display text-xl italic text-ink">
                  Your account is pending verification.
                </p>
                <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-ink/65">
                  Once an admin verifies your profile, you&rsquo;ll be able to
                  post jobs and internships to the network.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
                  Three short steps. Only the basics are required — you can skip
                  anything you don&rsquo;t have handy.
                </p>
                <div className="mt-10">
                  <PostOpeningForm />
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
