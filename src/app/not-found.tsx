import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CampusMap from "@/components/v2/campus/CampusMap";

// Lost? Here is the map.
export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-10 md:px-10 md:pt-14">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:items-center">
          <div>
            <p className="stamp text-tangerine">Error 404</p>
            <h1 className="mt-5 font-display text-[clamp(2.8rem,9vw,5.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
              You look <span className="serif-accent hl">lost</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/75">
              That page is not here: the link may be broken, or it may have moved. The campus has not moved, though. Pick a
              building and walk in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="btn">
                Back to the main gate
              </Link>
              <Link href="/noticeboard" className="btn btn-ghost">
                See The Wall
              </Link>
            </div>
          </div>
          <div className="sheet relative min-w-0 rotate-[0.6deg] p-2.5 sm:p-4">
            <span className="tape tape-lime" aria-hidden="true" />
            <CampusMap />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
