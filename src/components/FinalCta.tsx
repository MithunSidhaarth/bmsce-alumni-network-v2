import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

export default function FinalCta() {
  return (
    <section className="bg-oxblood text-ivory">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center md:px-10 md:py-32">
        <Reveal>
          <Eyebrow tone="ivory" align="center">
            One more thing
          </Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] text-ivory md:text-6xl">
            Ready when <span className="italic text-accent">you</span> are.
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-md font-sans text-base leading-relaxed text-ivory/75">
            It takes two minutes to join, and a lifetime of BMS to catch up
            on.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-10">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-sm bg-ivory px-9 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-oxblood transition-colors hover:bg-gold hover:text-ink"
            >
              Join the network
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
