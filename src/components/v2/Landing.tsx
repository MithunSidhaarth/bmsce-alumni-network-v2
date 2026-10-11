import Link from "next/link";
import archive from "@/data/instagram-archive.json";
import { chapters, CHAPTER_COUNT, COUNTRY_COUNT } from "@/data/chapters";
import { stampDate } from "@/lib/format";
import Collage, { type CollagePhoto } from "./Collage";
import Icon from "./Icon";

type ArchiveRow = { short_code: string; image_url: string | null; posted_at: string | null; post_type: string | null };

// Real photographs from the network's own Instagram archive, newest first.
const PHOTOS: CollagePhoto[] = (archive as ArchiveRow[])
  .filter((p) => p.image_url && p.posted_at)
  .sort((a, b) => (a.posted_at! < b.posted_at! ? 1 : -1))
  .slice(0, 9)
  .map((p) => ({ src: p.image_url!, stamp: stampDate(p.posted_at!), code: p.short_code }));

const INSIDE = [
  {
    kicker: "01 · Home",
    title: "A feed that sounds like the canteen",
    body: "Milestones, memories, announcements and questions from people who sat in the same classrooms.",
    href: "/join",
  },
  {
    kicker: "02 · Chapters",
    title: `${CHAPTER_COUNT} chapters, ${COUNTRY_COUNT} countries`,
    body: "Every city chapter has its own space: its people, its plans, its reunions.",
    href: "/chapters",
  },
  {
    kicker: "03 · Messages",
    title: "Write to anyone, directly",
    body: "Private messages between verified members, with the privacy controls in your hands.",
    href: "/join",
  },
  {
    kicker: "04 · Blog & Insights",
    title: "Stories worth keeping",
    body: "Career journeys, startup lessons and campus memories, written by the network.",
    href: "/blog",
  },
];

export default function Landing({ signedIn }: { signedIn: boolean }) {
  const cta = signedIn ? { href: "/onboarding", label: "Finish your profile" } : { href: "/join", label: "Join the network" };
  const cities = chapters.map((c) => c.name);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 md:px-10 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="relative z-10">
            <p className="stamp text-forest">Est. 1946 · Basavanagudi, Bengaluru</p>
            <h1 className="mt-7 font-display text-[clamp(3.4rem,11.5vw,8.25rem)] font-extrabold leading-[0.84] tracking-[-0.045em]">
              Once BMS.
              <br />
              <span className="serif-accent hl pr-[0.08em] text-[0.96em] tracking-[-0.03em]">Always</span> BMS.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-ink/75">
              The alumni network of B.M.S. College of Engineering. Find your batch, join your city
              chapter, and leave something on the wall for whoever comes next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={cta.href} className="btn h-12 px-6 text-base">
                {cta.label}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href="/noticeboard" className="btn btn-lime h-12 px-6 text-base">
                See The Wall
              </Link>
            </div>
            <p className="hand mt-8 -rotate-2 text-[1.55rem] text-forest/80" aria-hidden="true">
              your batch is in here somewhere &rarr;
            </p>
          </div>

          <Collage photos={PHOTOS.slice(0, 5)} />
        </div>

        {/* A strip of chapter names, like a departures board. */}
        <div className="border-y-[1.5px] border-ink bg-forest py-3 text-lime" aria-hidden="true">
          <div className="flex w-max motion-safe:animate-[var(--animate-marquee)] [animation-duration:70s]">
            {[0, 1].map((n) => (
              <ul key={n} className="flex shrink-0 items-center">
                {cities.map((c) => (
                  <li key={c} className="flex items-center font-display text-lg font-bold uppercase tracking-wide">
                    <span className="px-5">{c}</span>
                    <span className="text-tangerine">✳</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <p className="sr-only">Chapters in {cities.join(", ")}.</p>
      </section>

      {/* ---------------- What is inside ---------------- */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="max-w-2xl">
          <p className="label-mono text-tangerine">What is inside</p>
          <h2 className="mt-4 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.95]">
            Less of a website, more of a <span className="serif-accent">common room</span>.
          </h2>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-12">
          {/* Each one is a different object on the desk. */}
          <Link href={INSIDE[0].href} className="sheet sheet-ruled pinned block px-7 pb-8 pt-9 md:col-span-7" style={{ ["--tilt" as string]: "-1.1deg" }}>
            <span className="tape tape-left" aria-hidden="true" />
            <p className="label-mono text-ink/55">{INSIDE[0].kicker}</p>
            <h3 className="mt-4 max-w-[18ch] font-display text-[clamp(1.7rem,3.6vw,2.6rem)] leading-[1]">{INSIDE[0].title}</h3>
            <p className="mt-4 max-w-md text-ink/75">{INSIDE[0].body}</p>
          </Link>

          <Link
            href={INSIDE[1].href}
            className="sheet sheet-kraft pinned relative block px-7 pb-8 pt-9 md:col-span-5 md:mt-10"
            style={{ ["--tilt" as string]: "1.6deg", borderRadius: "3px 3px 3px 3px" }}
          >
            <span className="absolute left-5 top-5 h-4 w-4 rounded-full border-2 border-ink/50 bg-ivory" aria-hidden="true" />
            <p className="label-mono pl-8 text-ink/65">{INSIDE[1].kicker}</p>
            <h3 className="mt-4 font-display text-[clamp(1.7rem,3.2vw,2.3rem)] leading-[1]">{INSIDE[1].title}</h3>
            <p className="mt-4 text-ink/80">{INSIDE[1].body}</p>
          </Link>

          <Link
            href={INSIDE[2].href}
            className="stickynote pinned block px-7 pb-9 pt-8 md:col-span-4 md:col-start-2"
            style={{ ["--tilt" as string]: "-2.4deg", ["--note" as string]: "#c8f53c" }}
          >
            <p className="label-mono text-ink/60">{INSIDE[2].kicker}</p>
            <h3 className="hand mt-4 text-[2.2rem] leading-[0.95]">{INSIDE[2].title}</h3>
            <p className="mt-4 text-[0.9375rem] text-ink/80">{INSIDE[2].body}</p>
          </Link>

          <Link href={INSIDE[3].href} className="pinned block border-y-[3px] border-double border-ink bg-paper px-7 py-8 md:col-span-6 md:-mt-6" style={{ ["--tilt" as string]: "0.7deg" }}>
            <p className="label-mono text-tangerine">{INSIDE[3].kicker}</p>
            <h3 className="mt-4 font-serif text-[clamp(1.9rem,3.6vw,2.7rem)] font-normal leading-[1.02] tracking-tight">
              {INSIDE[3].title}
            </h3>
            <p className="mt-4 max-w-md font-serif text-lg text-ink/75">{INSIDE[3].body}</p>
          </Link>
        </div>
      </section>

      {/* ---------------- The Wall teaser ---------------- */}
      <section className="board overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="label-mono text-ink/70">The signature thing</p>
            <h2 className="mt-4 font-display text-[clamp(3.2rem,10vw,7rem)] font-extrabold leading-[0.82] tracking-[-0.05em] text-ink">
              The
              <br />
              Wall.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/85">
              A living noticeboard of the network: announcements, reunion photos, old fest posters
              and everything the alumni association posts on Instagram, pinned in one place.
            </p>
            <Link href="/noticeboard" className="btn mt-8 h-12 px-6 text-base">
              Walk up to the wall
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3" aria-label="Recent photos from the network">
            {PHOTOS.slice(3, 9).map((p, i) => (
              <li
                key={p.code}
                className={`pinned relative bg-white p-2 pb-7 shadow-[0_14px_22px_-12px_rgb(0_0_0/0.55)] ${i > 3 ? "hidden sm:block" : ""}`}
                style={{ ["--tilt" as string]: `${[-3.5, 2.5, -1.5, 3, -2.5, 1.5][i]}deg`, marginTop: `${[0, 22, 8, 14, 0, 26][i]}px` }}
              >
                <span className="pin" style={{ ["--pin" as string]: ["#e23a2e", "#6a4cff", "#ff5a1f"][i % 3] }} aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                <span className="label-mono absolute bottom-2 left-2 text-ink/60">{p.stamp}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
