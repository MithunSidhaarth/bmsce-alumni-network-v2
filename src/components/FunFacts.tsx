import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

// Researched from public sources (bmsce.ac.in, Wikipedia, the BMSSA founders
// page); approved for publishing by the client. The NBA and NAAC claims are
// the ones worth re-confirming with the college.
const FACTS = [
  "BMS College of Engineering was founded in 1946 by B. M. Sreenivasaiah, the first private-sector initiative in engineering education in India.",
  "It opened with just three courses: mechanical, civil, and electrical engineering.",
  "The Maharaja of Mysore honoured its founder with the title Dharmaprakasha Rajakarya Prasaktha in 1946.",
  "His son, B. S. Narayan, nurtured the college through its early decades.",
  "A sister institution, B.M.S. Institute of Technology and Management, was founded in 2002.",
  "The campus sits on about 11 acres in Basavanagudi, in the middle of Bengaluru.",
  "BMSCE is affiliated with Visvesvaraya Technological University and has been autonomous since 2008.",
  "It was the first institution in Karnataka accredited by the NBA in the Tier I format.",
  "BMSCE holds a NAAC A++ grade (Cycle II).",
  "Utsav, the college's cultural festival, has been running since 1973.",
];

export default function FunFacts() {
  return (
    <section className="border-t border-gold/30">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <Eyebrow>Did you know</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
            10 fun facts about BMS.
          </h2>
        </Reveal>
        <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {FACTS.map((fact, i) => (
            <Reveal key={i} delay={Math.min(i, 6) * 60} className="h-full">
              <li className="flex h-full gap-5 rounded-2xl border border-gold/30 bg-ivory p-6">
                <span className="font-display text-3xl italic leading-none text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-sans text-base leading-relaxed text-ink/80">
                  {fact}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
