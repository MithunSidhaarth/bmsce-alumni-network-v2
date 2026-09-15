import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import OnboardingForm from "@/app/onboarding/OnboardingForm";
import { createClient } from "@/lib/supabase/server";
import type { Profile, EducationEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Edit profile — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
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

  const { data: contact } = await supabase
    .from("member_contacts")
    .select("personal_email")
    .eq("member_id", user.id)
    .maybeSingle();

  const { data: education } = await supabase
    .from("education_entries")
    .select("*")
    .eq("profile_id", user.id)
    .order("year", { ascending: false })
    .returns<EducationEntry[]>();

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-2xl px-6 pb-24 pt-16 md:pt-24">
            <Eyebrow>My profile</Eyebrow>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] tracking-tight text-ink">
              Edit your details.
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
              Keep your profile current — changes save straight away.
            </p>
            <div className="mt-10">
              <OnboardingForm
                userId={user.id}
                initial={profile}
                initialPersonalEmail={
                  (contact?.personal_email as string) ?? ""
                }
                email={user.email ?? ""}
                initialEducation={education ?? []}
                redirectTo="/profile"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
