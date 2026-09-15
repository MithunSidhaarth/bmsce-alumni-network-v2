import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import { notableAlumni } from "@/data/notableAlumni";

export const metadata: Metadata = {
  title: "Notable Alumni — BMSCE Alumni Network",
  description:
    "The graduates who went far — founders, scientists, civil servants, authors, and more from the BMS community.",
};

function initials(name: string) {
  return name
    .replace(/,.*$/, "") // drop suffixes like ", IAS"
    .replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function NotableAlumniPage() {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-16 md:px-10 md:pb-8 md:pt-24">
            <Reveal>
              <Eyebrow>Notable Alumni</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                The ones who went far.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                A few of the graduates whose work reached well beyond campus —
                and who still call this network home.
              </p>
            </Reveal>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {notableAlumni.map((alum, i) => (
                <Reveal
                  key={alum.name}
                  delay={Math.min(i, 8) * 60}
                  className="h-full"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-gold/25 bg-ivory-dim/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 font-display text-lg italic text-oxblood">
                      {initials(alum.name)}
                    </div>
                    <h2 className="mt-6 font-display text-xl text-ink">
                      {alum.name}
                    </h2>
                    <p className="mt-1 font-sans text-sm text-ink/65">
                      {alum.role}
                    </p>
                    <p className="mt-3 font-sans text-sm text-ink/55">
                      Batch of {alum.batch} · {alum.branch}
                    </p>
                    <p className="mt-5 border-t border-gold/20 pt-5 font-sans text-sm leading-relaxed text-ink/70">
                      {alum.knownFor}
                    </p>
                    <span className="mt-auto pt-5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                      Notable alum
                    </span>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
