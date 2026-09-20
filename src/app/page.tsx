import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import GlobalCommunity from "@/components/GlobalCommunity";
import ValueProps from "@/components/ValueProps";
import Testimonials from "@/components/Testimonials";
import AlumniSpotlight from "@/components/AlumniSpotlight";
import MentorCta from "@/components/MentorCta";
import CampusUpdates from "@/components/CampusUpdates";
import FinalCta from "@/components/FinalCta";
import MemberHome, { type MemberHomeProfile } from "@/components/MemberHome";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { getCareersEnabled } from "@/lib/settings";

// Auth state must be read per-request so the right homepage is served.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Same server-side auth pattern used by /directory, /profile, /events, etc.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: MemberHomeProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, photo_url, user_type, role, verification_status, rejection_reason, industry, job_title, graduation_year, current_city, onboarded, created_at"
      )
      .eq("id", user.id)
      .single<MemberHomeProfile>();
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
            <CampusUpdates />
            {careersEnabled && <MentorCta />}
            <FinalCta />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
