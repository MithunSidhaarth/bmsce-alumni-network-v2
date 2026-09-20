import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import TiltCard from "./TiltCard";

type Testimonial = {
  quote: string;
  name: string;
  batch: string | null; // "Batch of 2024" year; null when unknown
  initials: string;
};

// Hardcoded member testimonials for the logged-out (marketing) homepage.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The BMSCE Alumni Network has been a great way for me to connect with alumni, through casual meetups at home and the larger network. Chatting with people who've been through the same journey, now working in all kinds of industries, has opened my eyes to how the real world works. It's helped me grow both personally and professionally!",
    name: "Arundati Rao",
    batch: "2024",
    initials: "AR",
  },
  {
    quote:
      "In my final year, I was struggling to find a UI/UX design internship. I connected with an alumnus who referred me, and that internship converted into a full-time role at a company also started by a BMS alumnus. I'm grateful to be part of a community where alumni keep creating opportunities for each other.",
    name: "Bharath Gorental",
    batch: null,
    initials: "BG",
  },
];

export default function Testimonials() {
  return (
    <section className="border-t border-gold/30 bg-ivory-dim/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <Eyebrow>In their words</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
            Why alumni stay connected.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 100} className="h-full">
              <TiltCard className="h-full" max={3}>
                <figure className="flex h-full flex-col rounded-2xl border border-gold/25 bg-ivory p-8 shadow-sm md:p-10">
                  <figcaption className="flex items-center gap-5">
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon to-oxblood font-display text-3xl italic text-ivory md:h-24 md:w-24 md:text-4xl">
                      {t.initials}
                    </span>
                    <span>
                      <span className="block font-display text-lg text-ink">
                        {t.name}
                      </span>
                      {t.batch && (
                        <span className="mt-0.5 block font-sans text-sm text-ink/55">
                          Batch of {t.batch}
                        </span>
                      )}
                    </span>
                  </figcaption>
                  <span
                    aria-hidden="true"
                    className="mt-6 font-display text-5xl leading-none text-accent/60"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="mt-2 flex-1 font-display text-lg italic leading-relaxed text-ink/85 md:text-xl md:leading-relaxed">
                    {t.quote}
                  </blockquote>
                </figure>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
