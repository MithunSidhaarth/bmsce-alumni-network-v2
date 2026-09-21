import Image from "next/image";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

/**
 * Founder widget — sits at the top of the About page.
 *
 * Background uses `bg-oxblood`, the same maroon token as the nav "Join" button
 * and the homepage CTA. Do not swap this for `bg-maroon` (the lighter #7a1e2e
 * hover tone) — that's the red/maroon mismatch we already fixed once.
 *
 * `photoUrl` is null until the founder image exists; the page passes it in.
 */
export default function FounderWidget({
  photoUrl,
  photoFileName,
}: {
  photoUrl: string | null;
  photoFileName: string;
}) {
  return (
    <section className="bg-oxblood text-ivory">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[320px_1fr] lg:gap-20">
          {/* Photo — first in the DOM so it stacks above the text on mobile */}
          <Reveal className="justify-self-center lg:justify-self-start">
            {photoUrl ? (
              photoUrl.startsWith("/") ? (
                <div className="relative aspect-[3/4] w-[min(240px,85vw)] overflow-hidden rounded-2xl border border-gold/40">
                  <Image
                    src={photoUrl}
                    alt="B. M. Sreenivasaiah, founder of BMS College of Engineering"
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="B. M. Sreenivasaiah, founder of BMS College of Engineering"
                  className="aspect-[3/4] w-[min(240px,85vw)] rounded-2xl border border-gold/40 object-cover"
                />
              )
            ) : (
              /* ---- PLACEHOLDER: drop the founder photo in to replace this ---- */
              <div
                role="img"
                aria-label="Founder photo placeholder"
                className="flex aspect-[3/4] w-[min(240px,85vw)] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gold/50 bg-ivory/5 px-6 text-center"
              >
                <span className="font-display text-2xl italic text-accent">
                  Founder photo
                </span>
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ivory/60">
                  Add {photoFileName}
                </span>
                <span className="font-sans text-[11px] leading-relaxed text-ivory/40">
                  Portrait orientation
                </span>
              </div>
            )}
          </Reveal>

          <div>
            <Reveal>
              <Eyebrow tone="ivory">The beginning</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-4xl leading-[1.05] text-ivory md:text-5xl">
                Our Founder
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-8 max-w-xl font-sans text-base leading-relaxed text-ivory/75 md:text-lg">
                B. M. Sreenivasaiah founded BMS College of Engineering in 1946 —
                the first privately established engineering college in India. He
                went on to found a sister institution, B.M.S. Institute of
                Technology and Management, in 2002. In recognition of his
                contributions, the Maharaja of Mysore honored him with the title{" "}
                <span className="italic text-accent">
                  Dharmaprakasha Rajakarya Prasaktha
                </span>{" "}
                in 1946.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
