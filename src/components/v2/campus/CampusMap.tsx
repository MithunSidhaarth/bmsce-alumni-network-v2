"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// The campus, drawn from a member's own sketch of it: the same blocks, roads
// and gates, in the same places. It is a map you can use: the places people
// remember lead to the parts of the network that match them.
//
// Not to scale, and not a survey. Drawn from photographs: the Platinum
// Jubilee block (a tall, curved red-brick front with pale bands and blue
// glass), the cream blocks with their long open corridors and columns, and
// the black name wall by the main gate. The hostels, the stadium, the canteen
// and the small sheds are drawn as that kind of building, not as portraits.
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
  look?: "cream" | "white" | "brick" | "grey" | "hall" | "kiosk";
  /** How many storeys to draw on the front. */
  floors?: number;
  /** Extra footprints that belong to the same building. */
  more?: { x: number; y: number; w: number; h: number }[];
  go?: Go;
  /** Where the name is written, if not in the middle of the roof. */
  lx?: number;
  ly?: number;
  tilt?: number;
};

const BLOCKS: Block[] = [
  { id: "mech", name: "Mechanical\nBlock", x: 160, y: 270, w: 105, h: 95, up: 30, floors: 3, more: [{ x: 165, y: 205, w: 62, h: 62 }, { x: 266, y: 236, w: 34, h: 138 }] },
  { id: "telecom", name: "Telecom Block", x: 365, y: 146, w: 90, h: 48, up: 28, floors: 3, go: { href: "/messages", label: "Messages" }, ly: 112 },
  { id: "cs", name: "CS / IT / EC / Civil", x: 330, y: 214, w: 112, h: 116, up: 40, floors: 4, go: { href: "/directory", label: "Alumni Network" }, ly: 250 },
  { id: "shed", name: "", x: 495, y: 76, w: 36, h: 44, up: 12, look: "grey" },
  { id: "arch", name: "BMS College\nof\nArchitecture", x: 540, y: 132, w: 100, h: 188, up: 36, floors: 4 },
  { id: "pg", name: "PG Block", x: 392, y: 402, w: 150, h: 68, up: 38, floors: 4, more: [{ x: 372, y: 488, w: 172, h: 66 }, { x: 438, y: 466, w: 62, h: 26 }], go: { href: "/blog", label: "Blog & Insights" }, lx: 467, ly: 420 },
  { id: "admin", name: "Administration Block", x: 548, y: 538, w: 56, h: 42, up: 22, floors: 2, go: { href: "/noticeboard", label: "The Wall" }, lx: 640, ly: 512 },
  { id: "pj", name: "PJ Block", x: 368, y: 612, w: 112, h: 138, up: 60, floors: 7, look: "brick", go: { href: "/profile", label: "Your ID card" }, ly: 642 },
  { id: "stadium", name: "Indoor Stadium", x: 527, y: 627, w: 70, h: 108, up: 26, look: "hall", go: { href: "/events", label: "Events" }, lx: 604, ly: 600 },
  { id: "annex", name: "", x: 182, y: 427, w: 62, h: 92, up: 22, floors: 2 },
  { id: "physics", name: "Physics Lab\nsection", x: 146, y: 562, w: 112, h: 148, up: 26, floors: 3, tilt: -4 },
  { id: "mess", name: "Mess", x: 106, y: 730, w: 64, h: 26, up: 12, look: "grey", lx: 64, ly: 738 },
  { id: "hostel", name: "Boys Hostel 1", x: 112, y: 776, w: 104, h: 70, up: 34, floors: 4, look: "white", go: { href: "/chapters", label: "Chapters" }, ly: 776 },
  { id: "lblock", name: "", x: 72, y: 866, w: 144, h: 36, up: 28, floors: 3, look: "white", more: [{ x: 72, y: 898, w: 80, h: 42 }] },
  { id: "kanch", name: "Kanchenjunga Block", x: 56, y: 980, w: 190, h: 50, up: 42, floors: 5, look: "white", go: { href: "/chapters", label: "Chapters" }, ly: 962 },
  { id: "canteen", name: "Nescafe Canteen", x: 467, y: 846, w: 88, h: 68, up: 16, look: "kiosk", go: { href: "/", label: "The feed" }, lx: 520, ly: 858 },
  { id: "side", name: "", x: 562, y: 852, w: 98, h: 96, up: 24, floors: 2 },
  { id: "bank", name: "Indian Bank", x: 347, y: 930, w: 113, h: 58, up: 22, floors: 2, go: { href: "/give-back", label: "Give back" }, ly: 936 },
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

// How far a roof leans to the left for each unit of height. It is what lets
// the east wall show, so a building reads as a solid thing and not a tile.
const LEAN = 0.2;

type Box = { x: number; y: number; w: number; h: number };

const PALETTE = {
  cream: { wall: "#f3e2b3", side: "#d9c48d", roof: "#ebe4d0", glass: "#5f6d6c" },
  white: { wall: "#f8f5ea", side: "#d8d4c4", roof: "#e6e2d6", glass: "#51697a" },
  brick: { wall: "#b84c31", side: "#8d3a25", roof: "#d9d5ca", glass: "#7fa7bd" },
  grey: { wall: "#b9beb9", side: "#989d98", roof: "#cfd3cf", glass: "#5f6d6c" },
  hall: { wall: "#efe3c2", side: "#cfc099", roof: "#8ea9bd", glass: "#5f6d6c" },
  kiosk: { wall: "#d5402f", side: "#a83022", roof: "#f6e7bd", glass: "#5f6d6c" },
} as const;

/** The corners of a slice of the south wall between two heights, as polygon points. */
function slice(r: Box, t0: number, t1: number, inset = 0, from = 0, width = r.w) {
  const base = r.y + r.h;
  const left = r.x + from + inset;
  const right = r.x + from + width - inset;
  return `${left - LEAN * t0},${base - t0} ${right - LEAN * t0},${base - t0} ${right - LEAN * t1},${base - t1} ${left - LEAN * t1},${base - t1}`;
}

/**
 * One building: its shadow, the east wall, the south front with every storey
 * drawn, and the roof with whatever sits on it.
 */
function Building({ b }: { b: Block }) {
  const look = b.look ?? "cream";
  const P = PALETTE[look];
  const floors = b.floors ?? Math.max(1, Math.round(b.up / 10));
  const fh = b.up / floors;
  const lean = LEAN * b.up;
  return (
    <g transform={b.tilt ? `rotate(${b.tilt} ${b.x + b.w / 2} ${b.y + b.h / 2})` : undefined}>
      {boxes(b).map((r, i) => {
        const base = r.y + r.h;
        const top = r.y - b.up;
        const rx = r.x - lean;
        const bow = look === "brick" ? 14 : 0; // the Platinum Jubilee block's curved front
        return (
          <g key={i}>
            <path d={`M${r.x + 8} ${r.y + 12} H${r.x + r.w + 12} V${base + 10 + bow * 0.6} H${r.x + 8} Z`} fill={INK} opacity={0.13} />

            {/* east wall */}
            <polygon
              points={`${r.x + r.w},${r.y} ${r.x + r.w},${base} ${r.x + r.w - lean},${base - b.up} ${r.x + r.w - lean},${top}`}
              fill={P.side}
              stroke={INK}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />

            {/* south front */}
            {look === "brick" ? (
              <>
                <path
                  d={`M${r.x} ${base} Q${r.x + r.w / 2} ${base + bow} ${r.x + r.w} ${base} L${r.x + r.w - lean} ${base - b.up} Q${r.x + r.w / 2 - lean} ${base - b.up + bow} ${rx} ${base - b.up} Z`}
                  fill={P.wall}
                  stroke={INK}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                {/* every storey: a pale balcony band over a strip of blue glass */}
                {Array.from({ length: floors }, (_, n) => {
                  const t = n * fh;
                  const arc = (h: number, pad: number) =>
                    `M${r.x + pad - LEAN * h} ${base - h} Q${r.x + r.w / 2 - LEAN * h} ${base - h + bow} ${r.x + r.w - pad - LEAN * h} ${base - h}`;
                  return (
                    <g key={n}>
                      <path d={arc(t + fh * 0.42, 4)} fill="none" stroke={P.glass} strokeWidth={fh * 0.34} />
                      <path d={arc(t + fh * 0.86, 2)} fill="none" stroke="#f6ead0" strokeWidth={fh * 0.3} strokeLinecap="round" />
                    </g>
                  );
                })}
                {/* brick piers between the bays */}
                {[0.2, 0.4, 0.6, 0.8].map((k) => {
                  const dip = bow * 4 * k * (1 - k) * 0.5;
                  return <line key={k} x1={r.x + r.w * k} y1={base + dip} x2={r.x + r.w * k - lean} y2={base - b.up + dip} stroke="#8d3a25" strokeWidth={2.4} />;
                })}
              </>
            ) : (
              <>
                <polygon points={slice(r, 0, b.up)} fill={P.wall} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
                {look === "cream" &&
                  Array.from({ length: floors }, (_, n) => (
                    // an open corridor on every floor, in shadow behind its parapet
                    <polygon key={n} points={slice(r, n * fh + fh * 0.3, n * fh + fh * 0.8, 3)} fill={P.glass} opacity={0.78} />
                  ))}
                {look === "cream" &&
                  Array.from({ length: Math.max(1, Math.floor(r.w / 17)) }, (_, c) => {
                    const cx = r.x + ((c + 1) * r.w) / (Math.max(1, Math.floor(r.w / 17)) + 1);
                    return <line key={c} x1={cx} y1={base} x2={cx - lean} y2={base - b.up} stroke={P.wall} strokeWidth={2.6} />;
                  })}
                {look === "white" &&
                  Array.from({ length: floors }, (_, n) =>
                    Array.from({ length: Math.max(2, Math.floor((r.w - 8) / 13)) }, (_, c) => (
                      <polygon key={`${n}-${c}`} points={slice(r, n * fh + fh * 0.28, n * fh + fh * 0.76, 0, 6 + c * 13, 7)} fill={P.glass} />
                    ))
                  )}
                {look === "grey" && <polygon points={slice(r, b.up * 0.3, b.up * 0.7, 4)} fill={P.glass} opacity={0.6} />}
                {look === "hall" && (
                  <>
                    <polygon points={slice(r, 0, b.up * 0.62, 0, r.w * 0.36, r.w * 0.28)} fill={P.glass} opacity={0.75} />
                    <polygon points={slice(r, b.up * 0.72, b.up * 0.86, 5)} fill={P.glass} opacity={0.5} />
                  </>
                )}
                {look === "kiosk" && (
                  <>
                    <polygon points={slice(r, 0, b.up * 0.55, 5)} fill="#3a2a22" opacity={0.75} />
                    {/* a striped awning over the counter */}
                    {Array.from({ length: 8 }, (_, n) => (
                      <polygon key={n} points={slice(r, b.up * 0.55, b.up * 0.95, 0, (n * r.w) / 8, r.w / 8)} fill={n % 2 ? "#fdf4d6" : "#d5402f"} stroke={INK} strokeWidth={0.6} />
                    ))}
                  </>
                )}
              </>
            )}

            {/* roof */}
            {look === "hall" ? (
              <>
                <path
                  d={`M${rx} ${top + r.h} L${rx} ${top + 12} Q${rx + r.w / 2} ${top - 20} ${rx + r.w} ${top + 12} L${rx + r.w} ${top + r.h} Q${rx + r.w / 2} ${top + r.h - 32} ${rx} ${top + r.h} Z`}
                  fill={P.roof}
                  stroke={INK}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                {/* the south gable under the vault, and the ribs of the roof */}
                <path d={`M${rx} ${top + r.h} Q${rx + r.w / 2} ${top + r.h - 32} ${rx + r.w} ${top + r.h} Z`} fill={P.wall} stroke={INK} strokeWidth={1.3} />
                {[0.2, 0.4, 0.6, 0.8].map((k) => (
                  <path key={k} d={`M${rx} ${top + 12 + (r.h - 12) * k} Q${rx + r.w / 2} ${top - 20 + (r.h - 12) * k} ${rx + r.w} ${top + 12 + (r.h - 12) * k}`} fill="none" stroke={INK} strokeWidth={0.9} opacity={0.4} />
                ))}
              </>
            ) : look === "brick" ? (
              <>
                <path
                  d={`M${rx} ${top} L${rx + r.w} ${top} L${rx + r.w} ${top + r.h} Q${rx + r.w / 2} ${top + r.h + bow} ${rx} ${top + r.h} Z`}
                  fill={P.roof}
                  stroke={INK}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                {/* the name band along the top of the front, and plant on the roof */}
                <path d={`M${rx + 3} ${top + r.h - 5} Q${rx + r.w / 2} ${top + r.h + bow - 5} ${rx + r.w - 3} ${top + r.h - 5}`} fill="none" stroke="#f6ead0" strokeWidth={5} strokeLinecap="round" />
                <rect x={rx + r.w * 0.56} y={top + r.h * 0.2} width={r.w * 0.28} height={r.h * 0.22} fill="#c6c2b6" stroke={INK} strokeWidth={1} />
                <rect x={rx + r.w * 0.14} y={top + r.h * 0.16} width={r.w * 0.22} height={r.h * 0.3} fill="#b9b5a9" stroke={INK} strokeWidth={1} />
              </>
            ) : (
              <>
                <rect x={rx} y={top} width={r.w} height={r.h} fill={P.roof} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
                {/* the parapet, a stair head and the black water tanks every roof here has */}
                {r.w > 44 && r.h > 34 && <rect x={rx + 4} y={top + 4} width={r.w - 8} height={r.h - 8} fill="none" stroke={INK} strokeWidth={0.8} opacity={0.32} />}
                {(look === "cream" || look === "white") && r.w > 54 && r.h > 40 && (
                  <>
                    <rect x={rx + r.w * 0.62} y={top + r.h * 0.2} width={Math.min(20, r.w * 0.2)} height={Math.min(16, r.h * 0.3)} fill={P.wall} stroke={INK} strokeWidth={1} />
                    <circle cx={rx + r.w * 0.24} cy={top + r.h * 0.34} r={4.2} fill="#262b29" />
                    <circle cx={rx + r.w * 0.24 + 11} cy={top + r.h * 0.34} r={4.2} fill="#262b29" />
                  </>
                )}
              </>
            )}
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
              {/* the black granite name wall by the gate */}
              <rect x={744} y={300} width={44} height={17} rx={1.5} fill="#1d201f" stroke={INK} strokeWidth={1.2} />
              <line x1={749} y1={306} x2={783} y2={306} stroke="#e9d9a6" strokeWidth={1.6} />
              <line x1={753} y1={311} x2={779} y2={311} stroke="#e9d9a6" strokeWidth={1.1} />
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
