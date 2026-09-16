import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";

const QUICK_LINKS = [
  { label: "Directory", href: "/directory" },
  { label: "Events", href: "/events" },
  { label: "Chapters", href: "/chapters" },
  { label: "Community", href: "/community" },
];

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <section id="top" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bmsce-crest.png"
              alt=""
              className="h-[70vmin] w-[70vmin] max-w-[560px] object-contain opacity-[0.05]"
            />
          </div>

          <div className="relative mx-auto max-w-xl px-6 py-32 text-center md:px-10 md:py-40">
            <Eyebrow align="center">Error 404</Eyebrow>
            <p className="mt-6 font-display text-[clamp(4rem,14vw,7rem)] italic leading-none text-oxblood/15">
              404
            </p>
            <h1 className="-mt-8 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
              We couldn&rsquo;t find that page.
            </h1>
            <p className="mx-auto mt-5 max-w-md font-sans text-base leading-relaxed text-ink/70">
              The link may be broken, the page may have moved, or it never
              existed in the first place.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
              >
                Back home
              </Link>
            </div>

            <div className="mt-14 border-t border-gold/30 pt-8">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">
                Or try one of these
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-sans text-sm font-medium text-oxblood underline decoration-brass underline-offset-4 transition-colors hover:text-maroon"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
