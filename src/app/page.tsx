import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ValueProps from "@/components/ValueProps";
import Testimonials from "@/components/Testimonials";
import GlobalCommunity from "@/components/GlobalCommunity";
import AlumniSpotlight from "@/components/AlumniSpotlight";
import MentorCta from "@/components/MentorCta";
import FinalCta from "@/components/FinalCta";
import MemberHome from "@/components/MemberHome";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { getCareersEnabled } from "@/lib/settings";
import type { Profile } from "@/lib/types";

// Auth state must be read per-request so the right homepage is served.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Same server-side auth pattern used by /directory, /profile, /events, etc.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();
    profile = data ?? null;
  }

  // Signed in and onboarded → the member homepage (no "Join the network" copy).
  // Anyone else falls through to the public marketing homepage, unchanged.
  const showMemberHome = !!user && !!profile && profile.onboarded;
  const careersEnabled = await getCareersEnabled();

  return (
    <>
      <Nav />
      <main>
        {showMemberHome ? (
          <MemberHome profile={profile!} careersEnabled={careersEnabled} />
        ) : (
          <>
            {/* Order: Hero -> stats (GlobalCommunity) -> ways back in
                (ValueProps) -> testimonials -> spotlight -> [mentorship promo, only when
                is enabled] -> final CTA. */}
            <Hero />
            <GlobalCommunity />
            <ValueProps careersEnabled={careersEnabled} />
            <Testimonials />
            <AlumniSpotlight />
            {careersEnabled && <MentorCta />}
            <FinalCta />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
