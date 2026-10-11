import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import HomeFeed from "@/components/v2/HomeFeed";
import Landing from "@/components/v2/Landing";
import { getMe } from "@/lib/me";

// Auth state decides which homepage is served, so this renders per request.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; show?: string; n?: string }>;
}) {
  // If Supabase's Site URL points here, it can return the OAuth code to "/"
  // instead of /auth/callback. Forward it so sign-in still completes.
  const { code, show, n } = await searchParams;
  if (code && /^[\w-]{8,100}$/.test(code)) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  const { supabase, user, me } = await getMe();

  // Signed in and onboarded: the personalised feed.
  if (user && me?.onboarded) {
    return (
      <>
        <main>
          <HomeFeed supabase={supabase} me={me} show={show ?? "all"} count={Number(n) || 0} />
        </main>
        <Footer />
      </>
    );
  }

  // Everyone else: the public homepage.
  return (
    <>
      <Nav />
      <main>
        <Landing signedIn={Boolean(user)} />
      </main>
      <Footer />
    </>
  );
}
