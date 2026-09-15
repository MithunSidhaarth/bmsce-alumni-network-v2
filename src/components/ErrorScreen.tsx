"use client";

import Link from "next/link";
import Nav from "./Nav";
import Footer from "./Footer";
import Eyebrow from "./Eyebrow";

// Friendly boundary shown when a page's data fetch throws, instead of a raw
// Next.js crash overlay. `reset` re-runs the failed render.
export default function ErrorScreen({
  reset,
  title = "Something went wrong.",
  body = "We hit a snag loading this page. It's usually temporary — give it another try.",
}: {
  reset?: () => void;
  title?: string;
  body?: string;
}) {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-xl px-6 py-32 text-center md:px-10">
            <Eyebrow align="center">Hmm</Eyebrow>
            <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-md font-sans text-base leading-relaxed text-ink/70">
              {body}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {reset && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                >
                  Try again
                </button>
              )}
              <Link
                href="/"
                className="group font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood"
              >
                <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
                  Back home
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
