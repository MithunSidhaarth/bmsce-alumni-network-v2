import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { getCareersEnabled } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Careers — BMSCE Alumni Network",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// While Careers is enabled, this lands on the jobs board. While it's off,
// all /careers/* subpaths are redirected here by middleware and this shows a
// simple "not available" state. The underlying pages/code are kept intact.
export default async function CareersUnavailablePage() {
  if (await getCareersEnabled()) {
    redirect("/careers/jobs");
  }

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-2xl px-6 py-32 text-center md:px-10">
            <Eyebrow align="center">Careers</Eyebrow>
            <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
              Not available right now.
            </h1>
            <p className="mx-auto mt-5 max-w-md font-sans text-base leading-relaxed text-ink/70">
              The careers &amp; referrals section is being reworked and
              isn&rsquo;t open at the moment. Check back soon.
            </p>
            <Link
              href="/"
              className="mt-10 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
            >
              Back home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
