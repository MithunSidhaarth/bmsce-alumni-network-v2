import Eyebrow from "./Eyebrow";
import Seal from "./Seal";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <Seal
        className="pointer-events-none absolute -right-24 top-8 hidden h-[420px] w-[420px] opacity-[0.06] lg:block"
        ringColor="var(--color-oxblood)"
        textColor="var(--color-oxblood)"
        monogramColor="var(--color-oxblood)"
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 md:px-10 md:pb-36 md:pt-24">
        <Reveal>
          <Eyebrow>Est. 1946 · Bengaluru</Eyebrow>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-8 max-w-4xl font-display text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.98] tracking-tight text-ink">
            Once BMS.
            <br />
            <span className="italic text-oxblood">Always BMS.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 max-w-md font-sans text-base leading-relaxed text-ink/70 md:text-lg">
            Wherever your degree took you, this is where the network finds
            you back.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
            >
              Join the network
            </a>
            <a
              href="/chapters"
              className="group inline-flex items-center gap-2.5 rounded-sm border border-oxblood/30 px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-oxblood transition-colors hover:border-oxblood"
            >
              Explore chapters
              <span
                aria-hidden="true"
                className="h-px w-5 bg-oxblood transition-all duration-300 group-hover:w-9"
              />
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal
        delay={480}
        className="pointer-events-none absolute inset-x-0 bottom-8 hidden justify-center md:flex"
      >
        <span className="flex flex-col items-center gap-2 text-ink/35">
          <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em]">
            Scroll
          </span>
          <span className="h-8 w-px animate-pulse bg-ink/25" aria-hidden="true" />
        </span>
      </Reveal>
    </section>
  );
}
