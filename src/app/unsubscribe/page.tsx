import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Unsubscribe: BMSCE Alumni Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// One click from any digest email. The token is unique per subscriber, so no
// sign-in is needed and nobody can unsubscribe someone else by guessing.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let done = false;
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("newsletter_unsubscribe", { p_token: token });
    done = data === true;
  }
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-4xl">{done ? "You are unsubscribed" : "That link did not work"}</h1>
        <p className="mt-4 text-ink/70">
          {done
            ? "You will not receive the BMSCE Alumni Network digest any more. If that was a mistake, you can subscribe again from Blog & Insights at any time."
            : "The unsubscribe link is missing or has expired. Open the link from your most recent digest email and try again."}
        </p>
        <Link href="/blog" className="btn mt-8">
          Go to Blog &amp; Insights
        </Link>
      </main>
      <Footer />
    </>
  );
}
