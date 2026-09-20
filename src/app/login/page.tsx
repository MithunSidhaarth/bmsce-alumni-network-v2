import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
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
          <div className="mx-auto flex max-w-md flex-col px-6 pb-24 pt-20 md:pt-28">
            <LoginPanel initialStudent={isStudent} next={next} error={!!error} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
