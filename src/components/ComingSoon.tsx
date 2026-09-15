import Link from "next/link";
import Nav from "./Nav";
import Footer from "./Footer";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

/**
 * Honest placeholder page for sections that don't have real functionality yet.
 * Deliberately contains NO invented content (no fake names, FAQs, or press
 * mentions) — just a clear status and a real way to get in touch.
 */
export default function ComingSoon({
  eyebrow,
  title,
  body,
  contactPrompt,
  contactSubject,
}: {
  eyebrow: string;
  title: string;
  body: string;
  contactPrompt: string;
  contactSubject: string;
}) {
  const mailto = `mailto:bmscealumni@bmsce.ac.in?subject=${encodeURIComponent(
    contactSubject
  )}`;

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:px-10 md:pt-28">
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight text-ink">
                {title}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                {body}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-12 rounded-2xl border border-gold/30 bg-ivory-dim/50 p-8 md:p-10">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                  In the meantime
                </span>
                <p className="mt-4 font-sans text-base leading-relaxed text-ink/75">
                  {contactPrompt}
                </p>
                <a
                  href={mailto}
                  className="mt-6 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
                >
                  Email the alumni office
                </a>
                <p className="mt-4 font-sans text-sm text-ink/55">
                  <a
                    href="mailto:bmscealumni@bmsce.ac.in"
                    className="text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                  >
                    bmscealumni@bmsce.ac.in
                  </a>
                </p>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
                <Link
                  href="/about"
                  className="group font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood"
                >
                  <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
                    About the college
                  </span>
                </Link>
                <Link
                  href="/directory"
                  className="group font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood"
                >
                  <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
                    Browse the directory
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
