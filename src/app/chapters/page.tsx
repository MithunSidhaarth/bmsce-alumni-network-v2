import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import ChapterList from "@/components/ChapterList";
import { GLOBAL_WHATSAPP_URL } from "@/data/chapters";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Chapters: BMSCE Alumni Network",
  description:
    "Find your city. BMS alumni chapters meet worldwide, and one global WhatsApp community connects them all.",
};

// Reads the session to gate the WhatsApp link, so render per-request.
export const dynamic = "force-dynamic";

export default async function ChaptersPage() {
  // The global WhatsApp community link is members-only: only render it for
  // signed-in users, so the URL never reaches signed-out visitors' HTML.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-10 pt-16 md:px-10 md:pb-14 md:pt-24">
            <Reveal>
              <Eyebrow>Chapters</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                Find your city.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                Wherever you have landed, there is likely a table of BMS alumni
                already meeting nearby. {signedIn
                  ? "Join the global WhatsApp community to get connected, then find your chapter below."
                  : "Sign in to join the global WhatsApp community, then find your chapter below."}
              </p>
            </Reveal>

            {/* Primary CTA — the one clickable action on the page. There are no
                per-city join links, only this global community group, and its
                link is members-only (rendered for signed-in users only). */}
            <Reveal delay={240}>
              <div className="mt-10 flex flex-col items-start gap-3">
                {signedIn ? (
                  <a
                    href={GLOBAL_WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2.5 rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Join the WhatsApp community
                  </a>
                ) : (
                  <Link
                    href="/login?next=/chapters"
                    className="inline-flex items-center gap-2.5 rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                  >
                    Sign in to join
                  </Link>
                )}
                <p className="font-sans text-xs text-ink/55">
                  {signedIn
                    ? "One global group for all BMS alumni: the fastest way in, wherever you are."
                    : "The WhatsApp community is members-only. Sign in and the link appears here."}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* All chapters list */}
        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
            <Reveal>
              <Eyebrow>All chapters</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                Every chapter, one list.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-10">
                <ChapterList />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
