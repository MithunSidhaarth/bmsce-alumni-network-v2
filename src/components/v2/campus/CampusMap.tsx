"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// The campus, drawn from a member's own sketch of it: the same blocks, roads
// and gates, in the same places. It is a map you can use: the places people
// remember lead to the parts of the network that match them.
//
// Not to scale, and not a survey. The Platinum Jubilee block is drawn the way
// it looks (a curved red-brick front with pale bands); the older blocks are
// the cream, long-corridor buildings they are.
// ---------------------------------------------------------------------------

const W = 860;
const H = 1090;

const INK = "#131a15";
const CREAM = "#f6e7bd";
const CREAM_ROOF = "#fdf4d6";
const BRICK = "#c9583b";
const GREY = "#cfd3cf";
const GREEN = "#2f8f5d";

type Go = { href: string; label: string };
type Block = {
  id: string;
  name: string;
  /** Footprint on the ground. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** How tall it stands. */
  up: number;
  look?: "cream" | "brick" | "grey" | "hall" | "kiosk";
  /** Extra footprints that belong to the same building. */
  more?: { x: number; y: number; w: number; h: number }[];
  go?: Go;
  /** Where the name is written, if not in the middle of the roof. */
  lx?: number;
  ly?: number;
  tilt?: number;
};

const BLOCKS: Block[] = [
  { id: "mech", name: "Mechanical\nBlock", x: 160, y: 270, w: 105, h: 95, up: 26, more: [{ x: 165, y: 205, w: 62, h: 62 }, { x: 266, y: 236, w: 34, h: 138 }] },
  { id: "telecom", name: "Telecom Block", x: 365, y: 146, w: 90, h: 48, up: 22, go: { href: "/messages", label: "Messages" }, ly: 112 },
  { id: "cs", name: "CS / IT / EC / Civil", x: 330, y: 214, w: 112, h: 116, up: 30, go: { href: "/directory", label: "Alumni Network" }, ly: 250 },
  { id: "shed", name: "", x: 495, y: 76, w: 36, h: 44, up: 12, look: "grey" },
  { id: "arch", name: "BMS College\nof\nArchitecture", x: 540, y: 132, w: 100, h: 188, up: 28 },
  { id: "pg", name: "PG Block", x: 392, y: 402, w: 150, h: 68, up: 30, more: [{ x: 372, y: 488, w: 172, h: 66 }, { x: 438, y: 466, w: 62, h: 26 }], go: { href: "/blog", label: "Blog & Insights" }, lx: 467, ly: 420 },
  { id: "admin", name: "Administration Block", x: 548, y: 538, w: 56, h: 42, up: 18, go: { href: "/noticeboard", label: "The Wall" }, lx: 640, ly: 512 },
  { id: "pj", name: "PJ Block", x: 368, y: 612, w: 112, h: 138, up: 46, look: "brick", go: { href: "/profile", label: "Your ID card" }, ly: 642 },
  { id: "stadium", name: "Indoor Stadium", x: 527, y: 627, w: 70, h: 108, up: 24, look: "hall", go: { href: "/events", label: "Events" }, lx: 604, ly: 600 },
  { id: "annex", name: "", x: 182, y: 427, w: 62, h: 92, up: 20 },
  { id: "physics", name: "Physics Lab\nsection", x: 146, y: 562, w: 112, h: 148, up: 22, tilt: -4 },
  { id: "mess", name: "Mess", x: 106, y: 730, w: 64, h: 26, up: 12, look: "grey", lx: 64, ly: 738 },
  { id: "hostel", name: "Boys Hostel 1", x: 112, y: 776, w: 104, h: 70, up: 26, go: { href: "/chapters", label: "Chapters" }, ly: 784 },
  { id: "lblock", name: "", x: 72, y: 866, w: 144, h: 36, up: 24, more: [{ x: 72, y: 898, w: 80, h: 42 }] },
  { id: "kanch", name: "Kanchenjunga Block", x: 56, y: 980, w: 190, h: 50, up: 30, go: { href: "/chapters", label: "Chapters" }, ly: 972 },
  { id: "canteen", name: "Nescafe Canteen", x: 467, y: 846, w: 88, h: 68, up: 16, look: "kiosk", go: { href: "/community", label: "Community" }, lx: 520, ly: 858 },
  { id: "side", name: "", x: 562, y: 852, w: 98, h: 96, up: 22 },
  { id: "bank", name: "Indian Bank", x: 347, y: 930, w: 113, h: 58, up: 20, go: { href: "/give-back", label: "Give back" }, ly: 936 },
  { id: "s1", name: "", x: 342, y: 1014, w: 112, h: 28, up: 12, look: "grey" },
  { id: "s2", name: "", x: 487, y: 976, w: 38, h: 34, up: 12, look: "grey" },
  { id: "s3", name: "", x: 592, y: 980, w: 62, h: 34, up: 14, look: "grey" },
];

// Roads, as centre lines. The ring is also the scooter's route.
const ROADS = {
  main: "M805 348 L384 348 Q346 348 345 386 L340 772 L320 800 L296 1046",
  ring: "M650 348 L650 690 Q648 768 578 770 L346 772",
  telecom: "M318 232 L318 152 Q319 122 350 122 L460 122 Q490 122 490 152 L490 348",
  pj: "M345 584 L500 584 L500 768",
};
const LOOP = "M790 348 L384 348 Q346 348 345 386 L341 742 Q341 772 372 772 L578 770 Q648 768 650 690 L650 368 Q650 348 670 348 Z";

const TREES: [number, number, number][] = [
  [700, 150, 17], [752, 138, 20], [778, 190, 18], [716, 204, 22], [768, 250, 21], [704, 268, 18], [742, 300, 19], [786, 300, 14],
  [120, 150, 15], [196, 132, 13], [286, 116, 12], [96, 470, 15], [112, 530, 12], [290, 470, 12], [300, 620, 11],
  [612, 420, 13], [604, 470, 11], [706, 520, 14], [700, 610, 12], [420, 880, 12], [610, 800, 12], [690, 760, 13], [250, 880, 11], [280, 960, 12], [500, 1040, 11], [620, 1040, 12],
];

function boxes(b: Block) {
  return [{ x: b.x, y: b.y, w: b.w, h: b.h }, ...(b.more ?? [])].sort((p, q) => p.y + p.h - (q.y + q.h));
}

/** One building: a soft shadow, a front wall with its windows, and the roof. */
function Building({ b }: { b: Block }) {
  const look = b.look ?? "cream";
  const wall = look === "brick" ? BRICK : look === "grey" ? "#b9beb9" : look === "kiosk" ? "#d5402f" : CREAM;
  const roof = look === "brick" ? "#e9b79f" : look === "grey" ? GREY : look === "kiosk" ? "#f6e7bd" : look === "hall" ? "#9fb6c9" : CREAM_ROOF;
  return (
    <g transform={b.tilt ? `rotate(${b.tilt} ${b.x + b.w / 2} ${b.y + b.h / 2})` : undefined}>
      {boxes(b).map((r, i) => {
        const top = r.y - b.up;
        const base = r.y + r.h;
        const floors = Math.max(1, Math.round(b.up / 9));
        return (
          <g key={i}>
            <rect x={r.x + 7} y={r.y + 9} width={r.w} height={r.h} rx={3} fill={INK} opacity={0.14} />
            {/* front wall */}
            {look === "brick" ? (
              <>
                <path d={`M${r.x} ${base - b.up} L${r.x} ${base} Q${r.x + r.w / 2} ${base + 13} ${r.x + r.w} ${base} L${r.x + r.w} ${base - b.up} Z`} fill={wall} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
                {Array.from({ length: 5 }, (_, n) => {
                  const yy = base - b.up + 6 + n * 8.4;
                  return <path key={n} d={`M${r.x + 3} ${yy} Q${r.x + r.w / 2} ${yy + 11} ${r.x + r.w - 3} ${yy}`} fill="none" stroke="#fbeed2" strokeWidth={3.2} strokeLinecap="round" />;
                })}
              </>
            ) : (
              <>
                <rect x={r.x} y={base - b.up} width={r.w} height={b.up} fill={wall} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
                {look !== "kiosk" &&
                  Array.from({ length: floors }, (_, n) => (
                    <line key={n} x1={r.x + 5} x2={r.x + r.w - 5} y1={base - b.up + 6 + n * (b.up / floors)} y2={base - b.up + 6 + n * (b.up / floors)} stroke={INK} strokeWidth={2.2} strokeDasharray="5 4" opacity={0.55} />
                  ))}
                {look === "kiosk" && <rect x={r.x - 4} y={base - b.up - 1} width={r.w + 8} height={7} rx={2} fill="#fbeed2" stroke={INK} strokeWidth={1.4} />}
              </>
            )}
            {/* roof */}
            {look === "hall" ? (
              <path
                d={`M${r.x} ${top + r.h} L${r.x} ${top + 14} Q${r.x + r.w / 2} ${top - 16} ${r.x + r.w} ${top + 14} L${r.x + r.w} ${top + r.h} Z`}
                fill={roof}
                stroke={INK}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            ) : look === "brick" ? (
              <path
                d={`M${r.x} ${top} L${r.x + r.w} ${top} L${r.x + r.w} ${top + r.h} Q${r.x + r.w / 2} ${top + r.h + 13} ${r.x} ${top + r.h} Z`}
                fill={roof}
                stroke={INK}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            ) : (
              <rect x={r.x} y={top} width={r.w} height={r.h} fill={roof} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
            )}
            {look === "hall" &&
              [0.25, 0.5, 0.75].map((t) => <line key={t} x1={r.x + r.w * t} x2={r.x + r.w * t} y1={top + (t === 0.5 ? 0 : 6)} y2={top + r.h} stroke={INK} strokeWidth={1} opacity={0.35} />)}
            {look === "cream" && r.w > 60 && r.h > 50 && <rect x={r.x + r.w * 0.3} y={top + r.h * 0.28} width={r.w * 0.4} height={r.h * 0.4} fill="none" stroke={INK} strokeWidth={1} opacity={0.3} />}
          </g>
        );
      })}
    </g>
  );
}

/** A paper label. Places you can walk into also get a green sign saying where they lead. */
function Tag({ x, y, text, sign, tilt = -2 }: { x: number; y: number; text: string; sign?: string; tilt?: number }) {
  const width = Math.max(text.length * 10.4 + 20, 48);
  const signWidth = sign ? (sign.length + 2) * 8.7 + 22 : 0;
  return (
    <g transform={`rotate(${tilt} ${x} ${y})`} className="cm-tag">
      <rect x={x - width / 2} y={y - 17} width={width} height={29} rx={5} fill="#fffdf4" stroke={INK} strokeWidth={1.3} />
      <text x={x} y={y + 6} textAnchor="middle" fontFamily="var(--font-caveat), cursive" fontSize={25} fontWeight={700} fill={INK}>
        {text}
      </text>
      {sign && (
        <g className="cm-sign">
          <rect x={x - signWidth / 2} y={y + 15} width={signWidth} height={22} rx={11} fill="#c8f53c" stroke={INK} strokeWidth={1.3} />
          <text x={x} y={y + 30.500} textAnchor="middle" fontFamily="var(--font-dmmono), monospace" fontSize={12.500} letterSpacing={0.7} fill={INK}>
            {`→ ${sign.toUpperCase()}`}
          </text>
        </g>
      )}
    </g>
  );
}

/** A name written straight onto a roof, for places that are part of the scenery. */
function Scribble({ x, y, text, tilt = -3 }: { x: number; y: number; text: string; tilt?: number }) {
  const lines = text.split("\n");
  return (
    <text
      transform={`rotate(${tilt} ${x} ${y})`}
      x={x}
      y={y - (lines.length - 1) * 10}
      textAnchor="middle"
      fontFamily="var(--font-caveat), cursive"
      fontSize={20}
      fontWeight={600}
      fill={INK}
      opacity={0.78}
      className="cm-tag"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 20}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export default function CampusMap({ className = "" }: { className?: string }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  // The building being pointed at or focused: its label lifts with it.
  const [hot, setHot] = useState<string | null>(null);

  // The map draws itself the first time it scrolls into view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // On a phone the map is wider than the screen: start with the middle of the campus in view.
    el.scrollLeft = (el.scrollWidth - el.clientWidth) * 0.42;
    if (!("IntersectionObserver" in window)) return setLive(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Walking in: the map swoops toward the building, then the page changes.
  const walkIn = (e: MouseEvent, b: Block) => {
    if (!b.go || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setZoom({ x: b.x + b.w / 2, y: b.y + b.h / 2 - b.up / 2 });
    window.setTimeout(() => router.push(b.go!.href), 520);
  };

  const sorted = [...BLOCKS].sort((a, b) => a.y + a.h - (b.y + b.h));

  return (
    <div ref={root} className={`campus overflow-x-auto no-scrollbar ${live ? "is-live" : ""} ${className}`}>
      <noscript>
        <style>{`.campus .cm-rise,.campus .cm-draw,.campus .cm-fade{animation-play-state:running!important}`}</style>
      </noscript>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="A hand-drawn map of the BMSCE campus. The buildings are links to parts of the network." className="block h-auto w-full min-w-[40rem] select-none md:min-w-0">
        <defs>
          {/* A slight wobble, so every line looks drawn by hand. */}
          <filter id="cm-wobble" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" />
          </filter>
          <pattern id="cm-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="2" />
          </pattern>
          <path id="cm-loop" d={LOOP} />
          <path id="cm-sky" d="M-40 260 C180 120 420 320 620 180 S 860 140 920 90" />
          <path id="cm-sky2" d="M-60 700 C200 600 380 760 560 640 S 800 560 930 600" />
        </defs>

        <g className="cm-scene" style={zoom ? { transform: `translate(${W / 2 - zoom.x * 2.6}px, ${H / 2 - zoom.y * 2.6}px) scale(2.6)` } : undefined}>
          <g filter="url(#cm-wobble)">
            {/* The compound wall, and the ground inside it */}
            <path
              className="cm-draw"
              pathLength={1}
              d="M135 96 Q300 60 480 56 L792 56 Q832 58 824 120 L812 326 L802 372 Q760 520 700 700 Q672 860 664 990 Q660 1046 600 1048 L80 1042 Q26 1040 30 980 Q40 880 62 800 Q100 600 120 420 Q124 260 126 180 Q124 110 135 96 Z"
              fill="#ece5c9"
              stroke={INK}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            {/* The garden */}
            <path className="cm-fade" d="M668 150 Q690 96 752 108 Q812 118 812 200 Q816 290 780 322 Q730 344 690 318 Q656 280 664 216 Z" fill="#cfe3a8" stroke={INK} strokeWidth={1.4} strokeDasharray="4 5" />

            {/* Roads: an inked edge, a pale surface, and a centre line that keeps moving */}
            {Object.values(ROADS).map((d) => (
              <path key={`e${d}`} className="cm-draw" pathLength={1} d={d} fill="none" stroke={INK} strokeWidth={29} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {Object.values(ROADS).map((d) => (
              <path key={`s${d}`} className="cm-draw" pathLength={1} d={d} fill="none" stroke="#fffdf4" strokeWidth={25.5} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {/* Gates */}
            <g className="cm-fade">
              <rect x={792} y={330} width={22} height={38} fill="url(#cm-hatch)" stroke={INK} strokeWidth={1.4} />
              <rect x={286} y={764} width={70} height={30} fill="url(#cm-hatch)" stroke={INK} strokeWidth={1.4} opacity={0.9} />
              <rect x={274} y={1040} width={40} height={14} fill="url(#cm-hatch)" stroke={INK} strokeWidth={1.4} />
            </g>
          </g>

          {/* Centre lines that keep moving (outside the wobble, so it is not redrawn every frame) */}
          {Object.values(ROADS).map((d) => (
            <path key={`c${d}`} className="cm-dash" d={d} fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="9 9" />
          ))}

          {/* Trees, each swaying a little out of step with the next */}
          {TREES.map(([x, y, r], i) => (
            <g key={i} className="cm-rise" style={{ ["--d" as string]: `${0.5 + (i % 9) * 0.06}s` }}>
              <g className="cm-tree" style={{ animationDelay: `${-(i % 7) * 0.6}s` }}>
                <rect x={x - 1.6} y={y + r * 0.5} width={3.2} height={r * 0.75} fill="#7a5a36" />
                <circle cx={x} cy={y} r={r} fill={i % 3 === 0 ? "#3fa06a" : GREEN} stroke={INK} strokeWidth={1.3} />
                <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.32} fill="#7cc592" opacity={0.7} />
              </g>
            </g>
          ))}

          {/* Buildings, back to front */}
          {sorted.map((b, i) => {
            const body = (
              <g className="cm-rise" style={{ ["--d" as string]: `${0.9 + i * 0.07}s` }}>
                <g className="cm-lift">
                  <g filter="url(#cm-wobble)">
                    <Building b={b} />
                  </g>
                </g>
              </g>
            );
            return b.go ? (
              <Link
                key={b.id}
                href={b.go.href}
                onClick={(e) => walkIn(e, b)}
                onMouseEnter={() => setHot(b.id)}
                onMouseLeave={() => setHot((h) => (h === b.id ? null : h))}
                onFocus={() => setHot(b.id)}
                onBlur={() => setHot((h) => (h === b.id ? null : h))}
                aria-label={`${b.name.replace(/\n/g, " ")}: opens ${b.go.label}`}
                className="cm-link"
                prefetch={false}
              >
                {body}
              </Link>
            ) : (
              <g key={b.id} aria-hidden={b.name ? undefined : true}>
                {body}
              </g>
            );
          })}

          {/* Names, on top of every building so none is hidden behind its neighbour */}
          {sorted.map((b, i) => {
            if (!b.name) return null;
            const cx = b.lx ?? b.x + b.w / 2;
            const cy = b.ly ?? b.y - b.up + b.h / 2;
            const tilt = ((i * 37) % 7) - 3;
            return (
              <g key={b.id} className="cm-rise" style={{ ["--d" as string]: `${1.15 + i * 0.07}s` }}>
                <g className={`cm-label ${hot === b.id ? "is-hot" : ""}`}>
                  {b.go ? <Tag x={cx} y={cy} text={b.name} sign={b.go.label} tilt={tilt} /> : <Scribble x={cx} y={cy} text={b.name} tilt={tilt} />}
                </g>
              </g>
            );
          })}

          {/* Labels for gates and the garden */}
          <g className="cm-fade">
            <Link href="/" aria-label="Main Gate: opens Home" className="cm-link" prefetch={false}>
              <g className="cm-lift">
                <rect x={770} y={316} width={66} height={66} fill="transparent" />
                <Tag x={770} y={410} text="Main Gate" sign="Home" tilt={-3} />
                {/* a flag over the gate */}
                <line x1={803} y1={330} x2={803} y2={296} stroke={INK} strokeWidth={1.6} />
                <path className="cm-flag" d="M803 297 L826 302 L803 311 Z" fill="#e8501f" stroke={INK} strokeWidth={1.1} />
              </g>
            </Link>
            <Link href="/gallery" aria-label="Park and garden: opens the Gallery" className="cm-link" prefetch={false}>
              <g className="cm-lift">
                <rect x={672} y={120} width={136} height={200} fill="transparent" />
                <Tag x={738} y={222} text="Park / Garden" sign="Gallery" tilt={3} />
              </g>
            </Link>
            <Scribble x={254} y={822} text="Exit Gate" tilt={-4} />
            <Scribble x={222} y={1072} text="Back Gate" tilt={2} />
            {/* A spot everyone knew about */}
            <g className="cm-heart">
              <path d="M377 862 C369 848 361 842 365 834 C369 826 377 830 377 836 C377 830 385 826 389 834 C393 842 385 848 377 862 Z" fill="#e23a2e" stroke={INK} strokeWidth={1.2} />
              <title>No comment.</title>
            </g>
            <Scribble x={392} y={884} text="couple spot" tilt={-5} />
          </g>

          {/* Life: a scooter on the ring road, birds, tea steam */}
          <g className="cm-fade" aria-hidden="true">
            <g>
              <ellipse rx={8} ry={4.4} fill="#e8501f" stroke={INK} strokeWidth={1.2} />
              <circle r={2.6} cy={-0.5} fill={INK} />
              <animateMotion dur="34s" repeatCount="indefinite" rotate="auto">
                <mpath href="#cm-loop" />
              </animateMotion>
            </g>
            <g>
              <ellipse rx={6.5} ry={4} fill="#6a4cff" stroke={INK} strokeWidth={1.2} />
              <animateMotion dur="47s" begin="-19s" repeatCount="indefinite" rotate="auto" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                <mpath href="#cm-loop" />
              </animateMotion>
            </g>
            {[0, 1, 2].map((n) => (
              <path key={n} d="M-7 0 Q-3.500 -5 0 0 Q3.500 -5 7 0" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.7}>
                <animateMotion dur={`${26 + n * 7}s`} begin={`${-n * 9}s`} repeatCount="indefinite">
                  <mpath href={n === 1 ? "#cm-sky2" : "#cm-sky"} />
                </animateMotion>
              </path>
            ))}
            {[0, 1, 2].map((n) => (
              <path key={n} className="cm-steam" style={{ animationDelay: `${n * 0.7}s` }} d={`M${492 + n * 18} 826 q5 -6 0 -12 q-5 -6 0 -12`} fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" opacity={0.5} />
            ))}
          </g>

          {/* Compass and a note on accuracy */}
          <g className="cm-fade" transform="translate(84 84)" aria-hidden="true">
            <circle r={24} fill="#fffdf4" stroke={INK} strokeWidth={1.3} />
            <path className="cm-needle" d="M0 -18 L5 0 L0 18 L-5 0 Z" fill="#e23a2e" stroke={INK} strokeWidth={1} />
            <text y={-28} textAnchor="middle" fontFamily="var(--font-dmmono), monospace" fontSize={11} fill={INK}>
              N
            </text>
          </g>
          <text className="cm-fade" x={W - 30} y={H - 14} textAnchor="end" fontFamily="var(--font-caveat), cursive" fontSize={21} fill={INK} opacity={0.7}>
            drawn from memory, not to scale
          </text>
        </g>
      </svg>
    </div>
  );
}

const PLACES: { place: string; opens: string; href: string }[] = [
  { place: "Main Gate", opens: "Home", href: "/" },
  ...BLOCKS.filter((b) => b.go).map((b) => ({ place: b.name, opens: b.go!.label, href: b.go!.href })),
  { place: "Park / Garden", opens: "Gallery", href: "/gallery" },
];

/** The same places as a plain list, for keyboards, screen readers and anyone who would rather read. */
export function CampusLegend({ className = "" }: { className?: string }) {
  const tidy = (s: string) => s.replace(/\n/g, " ");
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {PLACES.map((p) => (
        <li key={p.place}>
          <Link href={p.href} className="chip">
            <span className="hand text-[1.15rem] leading-none">{tidy(p.place)}</span>
            <span className="label-mono text-ink/55">→ {p.opens}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
