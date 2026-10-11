import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CampusMap, { CampusLegend } from "@/components/v2/campus/CampusMap";

export const metadata: Metadata = {
  title: "Campus map: BMSCE Alumni Network",
  description: "A hand-drawn map of the BMSCE campus. Walk up to a building to open that part of the alumni network.",
  openGraph: { title: "The BMSCE campus, from memory", type: "website" },
};

export default function CampusPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-8 md:px-10 md:pt-12">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,41rem)] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="label-mono text-tangerine">Find your way around</p>
            <h1 className="mt-3 font-display text-[clamp(2.6rem,8vw,5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
              The campus, <span className="serif-accent hl">from memory</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/75">
              Every block, road and gate where you left it. Walk up to a building and it opens the part of the Network that
              belongs there: the canteen is the feed, the Indoor Stadium is events, and the noticeboard outside the
              Administration Block is The Wall.
            </p>
            <h2 className="label-mono mt-9 text-ink/70">Where everything leads</h2>
            <CampusLegend className="mt-3" />
            <p className="hand mt-7 text-[1.35rem] leading-snug text-forest">
              Drawn from a student&rsquo;s own sketch of the campus. Not to scale, and some corners are best left unlabelled.
            </p>
          </div>

          <div className="sheet relative min-w-0 -rotate-[0.5deg] p-2.5 sm:p-4">
            <span className="tape" aria-hidden="true" />
            <CampusMap />
            <p className="label-mono px-2 pb-1 pt-2 text-ink/70 md:hidden">Drag the map sideways to see all of it</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
