import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Press — BMSCE Alumni Network",
  description:
    "Press and media enquiries for BMS College of Engineering and its alumni network.",
};

export default function PressPage() {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:px-10 md:pt-28">
            <Reveal>
              <Eyebrow>Press</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight text-ink">
                Press &amp; media.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                We don&rsquo;t have a press kit or a coverage archive published
                yet. For anything media-related — interviews, alumni stories,
                photography, or details about the college — please reach the
                alumni office directly and we&rsquo;ll point you to the right
                person.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-12 rounded-2xl border border-gold/30 bg-ivory-dim/50 p-8 md:p-10">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                  Media enquiries
                </span>

                <dl className="mt-6 flex flex-col gap-5">
                  <div>
                    <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/50">
                      Email
                    </dt>
                    <dd className="mt-1.5">
                      <a
                        href="mailto:bmscealumni@bmsce.ac.in?subject=Press%20enquiry"
                        className="font-sans text-base text-oxblood underline decoration-accent underline-offset-4 transition-colors hover:text-maroon"
                      >
                        bmscealumni@bmsce.ac.in
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/50">
                      Phone
                    </dt>
                    <dd className="mt-1.5">
                      <a
                        href="tel:+918660230306"
                        className="font-sans text-base text-oxblood underline decoration-accent underline-offset-4 transition-colors hover:text-maroon"
                      >
                        +91 86602 30306
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/50">
                      Address
                    </dt>
                    <dd className="mt-1.5">
                      <address className="not-italic font-sans text-base leading-relaxed text-ink/75">
                        BMS College of Engineering
                        <br />
                        P.O. Box No.: 1908, Bull Temple Road,
                        <br />
                        Bangalore - 560 019, Karnataka, India
                      </address>
                    </dd>
                  </div>
                </dl>
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
                  href="/notable-alumni"
                  className="group font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood"
                >
                  <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
                    Notable alumni
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
