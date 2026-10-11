"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";

export type MapChapter = { name: string; slug: string; lng: number; lat: number; region: string };

// A plain equirectangular window on the world, cropped to where chapters are.
const W = 1000;
const H = 400;
const LNG = [-132, 160];
const LAT = [-44, 62];
const HOME = { name: "Bengaluru", lng: 77.59, lat: 12.97 };
// Named on the map itself; every chapter is named in the list underneath.
const LABELLED = ["London", "New York", "San Francisco", "Singapore", "Dubai", "Toronto", "Japan", "Australia", "Munich", "Seattle"];

const r2 = (n: number) => Math.round(n * 100) / 100;
const px = (lng: number) => r2(((lng - LNG[0]) / (LNG[1] - LNG[0])) * W);
const py = (lat: number) => r2(((LAT[1] - lat) / (LAT[1] - LAT[0])) * H);

/** A route from the campus: a curve that bows higher the further it travels. */
function route(to: { lng: number; lat: number }) {
  const x1 = px(HOME.lng);
  const y1 = py(HOME.lat);
  const x2 = px(to.lng);
  const y2 = py(to.lat);
  const lift = Math.min(120, Math.hypot(x2 - x1, y2 - y1) * 0.26);
  // The curve's handle never leaves the frame, so no route is cut off at the top.
  return `M${x1} ${y1} Q${r2((x1 + x2) / 2)} ${r2(Math.max(14, Math.min(y1, y2) - lift))} ${x2} ${y2}`;
}

/**
 * Every chapter as a route out of Basavanagudi. The routes draw themselves
 * when the section arrives and each city lands with a small bounce. Hover or
 * focus a name in the list to light up its route.
 */
export default function FlightMap({ chapters, countries }: { chapters: MapChapter[]; countries: number }) {
  const root = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const away = chapters.filter((c) => c.name !== HOME.name);

  useEffect(() => {
    if (!motionOK() || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: ".map-frame", start: "top 72%", once: true } });
      tl.fromTo(".map-home", { scale: 0, transformOrigin: "center" }, { scale: 1, duration: 0.5, ease: "back.out(3)" })
        .fromTo(".map-route", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, stagger: 0.045, ease: "power2.inOut" }, "-=0.1")
        .fromTo(".map-pin", { scale: 0, transformOrigin: "center" }, { scale: 1, duration: 0.45, stagger: 0.045, ease: "back.out(3.5)" }, "-=1.9")
        .fromTo(".map-label", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 }, "-=0.9");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} aria-labelledby="map-title" className="bg-forest text-ivory">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="label-mono text-tangerine">Chapters</p>
            <h2 id="map-title" className="mt-4 font-display text-[clamp(2.6rem,7.5vw,6rem)] font-extrabold leading-[0.86] tracking-[-0.045em]">
              From Basavanagudi
              <br />
              to <span className="serif-accent text-[#d9f27a]">everywhere</span>.
            </h2>
          </div>
          <p className="max-w-md text-lg text-ivory/75 lg:justify-self-end">
            {chapters.length} chapters in {countries} countries, each with its own community inside the network. Every line
            below is one of them.
          </p>
        </div>

        <div className="map-frame relative mt-10 overflow-hidden rounded-box border border-ivory/15 bg-[#0b2d20]">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of routes from Bengaluru to ${away.length} chapters around the world`} className="block h-auto w-full">
            <defs>
              <pattern id="map-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.1" fill="#f4eedd" fillOpacity="0.09" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#map-dots)" />
            {[-20, 0, 20, 40].map((lat) => (
              <line key={lat} x1="0" x2={W} y1={py(lat)} y2={py(lat)} stroke="#f4eedd" strokeOpacity={lat === 0 ? 0.16 : 0.07} strokeDasharray={lat === 0 ? undefined : "3 7"} />
            ))}

            {away.map((c) => (
              <path
                key={c.slug}
                d={route(c)}
                pathLength={1}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="1"
                className="map-route transition-[stroke,stroke-width,opacity] duration-200"
                stroke={active === c.slug ? "#ff5a1f" : "#d9f27a"}
                strokeWidth={active === c.slug ? 2.6 : 1.2}
                opacity={active && active !== c.slug ? 0.18 : 0.75}
              />
            ))}
            {away.map((c) => (
              <circle
                key={c.slug}
                cx={px(c.lng)}
                cy={py(c.lat)}
                r={active === c.slug ? 6.5 : 4}
                className="map-pin transition-[r,fill] duration-200"
                fill={active === c.slug ? "#ff5a1f" : "#f4eedd"}
                stroke="#0b2d20"
                strokeWidth="1.5"
              />
            ))}
            {away
              .filter((c) => LABELLED.includes(c.name) || c.slug === active)
              .map((c) => (
                <text
                  key={c.slug}
                  x={px(c.lng) + (px(c.lng) > W - 110 ? -8 : 8)}
                  y={py(c.lat) - 8}
                  textAnchor={px(c.lng) > W - 110 ? "end" : "start"}
                  className="map-label"
                  fill="#f4eedd"
                  fontSize="12"
                  fontWeight="600"
                >
                  {c.name}
                </text>
              ))}

            <g>
              <circle cx={px(HOME.lng)} cy={py(HOME.lat)} r="14" fill="#ff5a1f" fillOpacity="0.25" className="map-pulse" />
              <circle cx={px(HOME.lng)} cy={py(HOME.lat)} r="6.5" fill="#ff5a1f" stroke="#0b2d20" strokeWidth="2" className="map-home" />
              <text x={px(HOME.lng) - 10} y={py(HOME.lat) + 22} textAnchor="end" fill="#f4eedd" fontSize="13" fontWeight="700">
                Bengaluru · home
              </text>
            </g>
          </svg>
        </div>

        <ul className="mt-6 flex flex-wrap gap-2">
          {chapters.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/chapters/${c.slug}`}
                onPointerEnter={() => setActive(c.slug)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(c.slug)}
                onBlur={() => setActive(null)}
                className="inline-flex min-h-9 items-center rounded-full border border-ivory/25 px-3.5 text-sm font-medium transition-colors hover:border-tangerine hover:bg-tangerine hover:text-white focus-visible:border-tangerine focus-visible:bg-tangerine"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
