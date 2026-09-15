import Link from "next/link";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

// Homepage entry point into the mentor opt-in flow. Purely a link through to
// /careers/mentorship/become — no opt-in logic is duplicated here.
export default function MentorCta() {
  return (
    <section className="border-t border-gold/30">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:px-10 md:py-28 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow>Mentorship</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-6 max-w-md font-display text-4xl leading-[1.05] text-ink md:text-5xl">
              Someone once made room for <span className="italic">you</span>.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-md font-sans text-base leading-relaxed text-ink/70">
              Students and younger graduates are looking for someone a few steps
              ahead. Offer an hour a month — you choose who you take on.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/careers/mentorship/become"
                className="inline-flex items-center justify-center rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
              >
                Become a mentor
              </Link>
              <Link
                href="/careers/mentorship"
                className="group font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-oxblood"
              >
                <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
                  Find a mentor
                </span>
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="border-l border-t border-gold/30">
            {[
              {
                tag: "You choose",
                body: "Requests come to you. Accept the ones you have room for, decline the rest — no automatic pairing.",
              },
              {
                tag: "On your terms",
                body: "Set your areas of expertise, your availability, and a cap on how many mentees at once.",
              },
              {
                tag: "Real conversations",
                body: "Once you accept, you both get each other's contact details and take it from there.",
              },
            ].map((item) => (
              <div
                key={item.tag}
                className="border-b border-r border-gold/30 px-6 py-7"
              >
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                  {item.tag}
                </span>
                <p className="mt-3 font-sans text-sm leading-relaxed text-ink/70">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
