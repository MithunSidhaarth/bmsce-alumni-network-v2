import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import { CHAPTER_COUNT, COUNTRY_COUNT } from "@/data/chapters";

// Alumni worldwide stays a manually-set number (no live source). Countries and
// active chapters are derived from the chapters data, so they never go stale.
const SPREAD = [
  { value: "55,000+", label: "Alumni worldwide" },
  { value: String(COUNTRY_COUNT), label: "Countries" },
  { value: String(CHAPTER_COUNT), label: "Active chapters" },
];

export default function GlobalCommunity() {
  return (
    <section className="bg-oxblood text-ivory">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <Eyebrow tone="ivory" align="center">
            The network, worldwide
          </Eyebrow>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="mx-auto mt-6 max-w-2xl text-center font-display text-4xl leading-[1.05] text-ivory md:text-5xl">
            A family, wherever you land.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-y-14 border-y border-gold/25 py-14 md:mt-20 md:grid-cols-3 md:py-16">
          {SPREAD.map((stat, i) => (
            <Reveal
              key={stat.label}
              delay={i * 90}
              className="flex flex-col items-center border-gold/25 px-4 text-center md:border-l md:first:border-l-0"
            >
              <span className="font-display text-[13vw] leading-none text-accent sm:text-6xl md:text-7xl">
                <CountUp value={stat.value} />
              </span>
              <span className="mt-4 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ivory/70">
                {stat.label}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
