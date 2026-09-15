import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-xl px-6 py-32 text-center md:px-10">
            <Eyebrow align="center">404</Eyebrow>
            <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
              We couldn&rsquo;t find that page.
            </h1>
            <p className="mx-auto mt-5 max-w-md font-sans text-base leading-relaxed text-ink/70">
              The link may be broken or the page may have moved.
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
