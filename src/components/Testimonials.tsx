import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

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
      "The BMSCE Alumni Network has been a great way for me to connect with alumni, both through casual meetups at home and through the larger network. It's given me a chance to chat with people who've been through the same journey and are now working in all kinds of industries. These conversations have really opened my eyes to how things work in the real world and what's going on in different fields. It's been a great way to pick up useful advice and stay updated, helping me grow both personally and professionally!",
    name: "Arundati Rao",
    batch: "2024",
    initials: "AR",
  },
  {
    quote:
      "During my final year of engineering, I was actively looking for a UI/UX design internship and was finding it difficult to get the right opportunity. At a time when I genuinely needed some guidance, I connected with an alumnus who referred me for an opportunity. That internship gave me the chance to prove myself and eventually convert it into a full-time role at a company that was also started by a BMS alumnus. I'm really grateful for the support I received and for being part of a community where alumni continue to help and create opportunities for each other.",
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
              <figure className="flex h-full flex-col rounded-2xl border border-gold/25 bg-ivory p-8 md:p-10">
                <span
                  aria-hidden="true"
                  className="font-display text-5xl leading-none text-accent/60"
                >
                  &ldquo;
                </span>
                <blockquote className="mt-2 flex-1 font-display text-lg italic leading-relaxed text-ink/85 md:text-xl md:leading-relaxed">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-4 border-t border-gold/20 pt-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-maroon to-oxblood font-display text-base italic text-ivory">
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
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
