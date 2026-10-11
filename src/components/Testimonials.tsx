import { seeded } from "@/lib/format";

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

// The two letters are real quotes from members, kept exactly as given.
// They are shown as notes pinned to the page, each signed in handwriting.
export default function Testimonials() {
  return (
    <section aria-labelledby="letters-title" className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <p className="label-mono text-tangerine">In their words</p>
        <h2 id="letters-title" className="mt-4 max-w-2xl font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.95]">
          Why alumni <span className="serif-accent hl">stay</span> connected.
        </h2>
        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              className={`pinned sheet relative px-7 pb-8 pt-10 md:px-10 ${i % 2 ? "lg:mt-14" : ""}`}
              style={{ ["--tilt" as string]: `${((seeded(t.name) - 0.5) * 3.4).toFixed(2)}deg` }}
            >
              <span className={`tape ${i % 2 ? "tape-right tape-lime" : "tape-left"}`} aria-hidden="true" />
              <span className="font-serif text-7xl leading-[0.6] text-tangerine" aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-serif text-[1.3rem] leading-[1.5] text-ink/90">{t.quote}</blockquote>
              <figcaption className="mt-7 flex items-end justify-between gap-4 border-t border-dashed border-ink/25 pt-5">
                <span>
                  <span className="hand block text-[2rem] leading-none text-forest">{t.name}</span>
                  {t.batch && <span className="label-mono mt-2 block text-ink/55">Batch of {t.batch}</span>}
                </span>
                <span className="stamp text-ink/45">Member</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
