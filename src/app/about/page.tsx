import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import FounderWidget from "@/components/FounderWidget";

export const metadata: Metadata = {
  title: "About: BMSCE Alumni Network",
  description:
    "The BMSCE Alumni Network: 58 chapters across 90+ countries, and the programs that turn a shared campus into a lifelong community.",
};

// Drop the founder's portrait in at public/founder.jpg and it replaces the
// placeholder automatically — no code change needed.
const FOUNDER_PHOTO_FILE = "founder.jpg";

const WHAT_WE_RUN = [
  {
    tag: "Scholarships",
    body: "Alumni-funded scholarships cover tuition and living costs for BMS students who’d otherwise have to choose between the degree and the bill. The network paid it forward, and this is how it comes back.",
  },
  {
    tag: "Reunions & meetups",
    body: "Silver jubilees, decade meetups, and batch dinners bring people together on four continents, because some conversations are just better picked up in person.",
  },
  {
    tag: "Entrepreneurship accelerator",
    body: "An entrepreneurship accelerator backs alumni founders with mentorship, warm introductions, and early customers drawn from within the network itself. Three of your first five hires are probably already BMS.",
  },
  {
    tag: "Recruiting bootcamp",
    body: "And a recruiting bootcamp takes graduating students from campus to offer letter, run by alumni who sit on the other side of the hiring table.",
  },
];

function founderPhotoUrl(): string | null {
  try {
    const p = path.join(process.cwd(), "public", FOUNDER_PHOTO_FILE);
    return fs.existsSync(p) ? `/${FOUNDER_PHOTO_FILE}` : null;
  } catch {
    return null;
  }
}

export default function AboutPage() {
  const photoUrl = founderPhotoUrl();

  return (
    <>
      <Nav />
      <main>
        {/* 1 — Founder widget (maroon / oxblood, top of page) */}
        <FounderWidget
          photoUrl={photoUrl}
          photoFileName={`/public/${FOUNDER_PHOTO_FILE}`}
        />

        {/* A — The network (replaces the old college-description section) */}
        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
            <Reveal>
              <Eyebrow>The network</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                Built by alumni, for alumni.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-8 max-w-3xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                The BMSCE Alumni Network is what happens after convocation, the
                part where a degree turns into a lifelong community. It spans 58
                active chapters across 90+ countries, from Bengaluru to the Bay
                Area to Singapore, each one already meeting, hiring, and looking
                out for its own. Wherever a BMS graduate lands, a chapter is
                usually already there.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-6 max-w-3xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                But chapters are just the map. What the network actually does is
                bring alumni back into each other&rsquo;s lives, through the
                programs below, whether you graduated last summer or thirty years
                ago.
              </p>
            </Reveal>
          </div>
        </section>

        {/* B — What we run */}
        <section className="border-t border-gold/30 bg-ivory-dim/30">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
            <Reveal>
              <Eyebrow>What we run</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                Four ways the network shows up.
              </h2>
            </Reveal>
            <div className="mt-10 flex max-w-2xl flex-col gap-6">
              {WHAT_WE_RUN.map((item, i) => (
                <Reveal key={item.tag} delay={160 + i * 70}>
                  <div className="rounded-2xl border border-maroon/40 bg-ivory px-6 py-8 shadow-sm md:px-8">
                    <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                      {item.tag}
                    </span>
                    <p className="mt-3 font-sans text-base leading-relaxed text-ink/80 md:text-lg">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3 — Contact */}
        <section id="contact" className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <Reveal>
                  <Eyebrow>Get in touch</Eyebrow>
                </Reveal>
                <Reveal delay={80}>
                  <h2 className="mt-6 max-w-md font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                    Contact Us
                  </h2>
                </Reveal>
                <Reveal delay={160}>
                  <p className="mt-6 max-w-md font-sans text-base leading-relaxed text-ink/70">
                    Questions about the network, your membership, or an event?
                    We&rsquo;d love to hear from you.
                  </p>
                </Reveal>
              </div>

              <Reveal delay={160}>
                <div className="rounded-2xl border border-maroon/40 bg-ivory p-8 shadow-sm md:p-10">
                  <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                    BMS College of Engineering
                  </h3>
                  <address className="mt-4 not-italic font-sans text-base leading-relaxed text-ink/80">
                    P.O. Box No.: 1908, Bull Temple Road,
                    <br />
                    Bangalore - 560 019,
                    <br />
                    Karnataka, India
                  </address>

                  <dl className="mt-8 flex flex-col gap-5 border-t border-gold/40 pt-8">
                    <div>
                      <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/55">
                        Email
                      </dt>
                      <dd className="mt-1.5">
                        <a
                          href="mailto:bmscealumni@bmsce.ac.in"
                          className="font-sans text-base text-oxblood underline decoration-accent underline-offset-4 transition-colors hover:text-maroon"
                        >
                          bmscealumni@bmsce.ac.in
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/55">
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
                  </dl>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
