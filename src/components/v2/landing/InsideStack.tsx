"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

type Postcard = { name: string; image: string };

const bar = (w: string, tone = "bg-ink/15") => <span className={`block h-2 rounded-full ${tone}`} style={{ width: w }} />;

// Small drawings of each part of the product. They are deliberately abstract
// (bars instead of words) so nothing here pretends to be a real post.
function FeedSpecimen() {
  return (
    <div className="relative mx-auto h-56 w-full max-w-sm" aria-hidden="true">
      {[
        { top: "0%", left: "8%", tilt: -4, stamp: null },
        { top: "22%", left: "0%", tilt: 3, stamp: "Memory" },
        { top: "44%", left: "12%", tilt: -1.5, stamp: "Announcement" },
      ].map((s, i) => (
        <div key={i} className="sheet absolute w-[78%] px-4 py-3" style={{ top: s.top, left: s.left, transform: `rotate(${s.tilt}deg)` }}>
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-full bg-lime" />
            <span className="flex flex-1 flex-col gap-1.5">{bar("46%", "bg-ink/35")}{bar("28%")}</span>
            {s.stamp && <span className="stamp text-tangerine">{s.stamp}</span>}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">{bar("92%")}{bar("74%")}</div>
        </div>
      ))}
    </div>
  );
}

function ChapterSpecimen({ postcards }: { postcards: Postcard[] }) {
  return (
    <div className="relative mx-auto h-56 w-full max-w-sm" aria-hidden="true">
      {postcards.slice(0, 3).map((p, i) => (
        <div
          key={p.name}
          className="absolute w-[58%] bg-white p-2 pb-3 shadow-[var(--shadow-lift)]"
          style={{ left: `${i * 20}%`, top: `${[10, 0, 16][i]}%`, transform: `rotate(${[-7, 2, 8][i]}deg)`, zIndex: i }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
          <span className="mt-1.5 block font-display text-sm font-bold text-ink">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

function MessageSpecimen() {
  return (
    <div className="mx-auto flex h-56 w-full max-w-sm flex-col justify-center gap-2.5" aria-hidden="true">
      <span className="flex w-[62%] flex-col gap-1.5 self-start rounded-[4px_16px_16px_16px] bg-paper px-4 py-3">{bar("88%")}{bar("54%")}</span>
      <span className="flex w-[54%] flex-col gap-1.5 self-end rounded-[16px_4px_16px_16px] bg-forest px-4 py-3">{bar("80%", "bg-ivory/45")}</span>
      <span className="flex w-[70%] flex-col gap-1.5 self-start rounded-[4px_16px_16px_16px] bg-paper px-4 py-3">{bar("94%")}{bar("70%")}{bar("36%")}</span>
      <span className="label-mono self-end text-ink/55">Seen</span>
    </div>
  );
}

function BlogSpecimen() {
  return (
    <div className="mx-auto flex h-56 w-full max-w-sm gap-5" aria-hidden="true">
      <span className="font-serif text-[9rem] leading-[0.8] text-lime">Aa</span>
      <span className="flex flex-1 flex-col justify-center gap-2">
        {bar("100%", "bg-ivory/35")}{bar("92%", "bg-ivory/35")}{bar("96%", "bg-ivory/35")}{bar("60%", "bg-ivory/35")}
        <span className="h-3" />
        {bar("100%", "bg-ivory/20")}{bar("84%", "bg-ivory/20")}
      </span>
    </div>
  );
}

/**
 * Four sheets that stack as you scroll: each one slides up over the last,
 * which shrinks back slightly, like papers being laid on a desk.
 */
export default function InsideStack({ chapters, countries, postcards }: { chapters: number; countries: number; postcards: Postcard[] }) {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!motionOK() || !root.current) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".stack-card");
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card.firstElementChild, {
          scale: 1 - (cards.length - 1 - i) * 0.035,
          rotate: i % 2 ? 0.8 : -0.8,
          ease: "none",
          scrollTrigger: { trigger: next, start: "top bottom", end: "top 20%", scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const sheets = [
    {
      kicker: "01 · Home",
      title: "A feed that sounds like the canteen",
      body: "Milestones, memories, announcements and questions from people who sat in the same classrooms.",
      href: "/join",
      link: "Join to see it",
      tone: "sheet sheet-ruled text-ink",
      specimen: <FeedSpecimen />,
    },
    {
      kicker: "02 · Chapters",
      title: `${chapters} chapters, ${countries} countries`,
      body: "Every city chapter has its own space: its people, its plans, its reunions.",
      href: "/chapters",
      link: "Find your city",
      tone: "sheet sheet-kraft text-ink",
      specimen: <ChapterSpecimen postcards={postcards} />,
    },
    {
      kicker: "03 · Messages",
      title: "Write to anyone, directly",
      body: "Private messages between verified members, with the privacy controls in your hands.",
      href: "/join",
      link: "Join to say hello",
      tone: "bg-[#e3f5ab] text-ink border border-ink/10 shadow-[var(--shadow-sheet)]",
      specimen: <MessageSpecimen />,
    },
    {
      kicker: "04 · Blog & Insights",
      title: "Stories worth keeping",
      body: "Career journeys, startup lessons and campus memories, written by the network.",
      href: "/blog",
      link: "Start reading",
      tone: "bg-forest text-ivory shadow-[var(--shadow-sheet)]",
      specimen: <BlogSpecimen />,
    },
  ];

  return (
    <section aria-labelledby="inside-title" className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pb-32">
      <div className="max-w-2xl">
        <p className="label-mono text-tangerine">What is inside</p>
        <h2 id="inside-title" className="mt-4 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.95]">
          Less of a website, more of a <span className="serif-accent hl">common room</span>.
        </h2>
      </div>

      <div ref={root} className="mt-12">
        {sheets.map((s, i) => (
          <div key={s.kicker} className="stack-card sticky pb-6" style={{ top: `calc(5.5rem + ${i * 1.1}rem)` }}>
            <article className={`grid origin-top gap-8 rounded-md px-6 py-9 will-change-transform md:grid-cols-[1.1fr_1fr] md:items-center md:px-12 md:py-14 ${s.tone}`}>
              <div>
                <p className="label-mono opacity-60">{s.kicker}</p>
                <h3 className={`mt-4 max-w-[16ch] text-[clamp(2rem,4.6vw,3.6rem)] leading-[0.98] ${i === 3 ? "font-serif font-normal tracking-tight" : "font-display"}`}>
                  {s.title}
                </h3>
                <p className="mt-4 max-w-md text-lg opacity-80">{s.body}</p>
                <Link href={s.href} className="mt-6 inline-flex items-center gap-2 font-semibold underline decoration-2 underline-offset-4">
                  {s.link} <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
              {s.specimen}
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
