"use client";

import { useMemo, useState } from "react";
import { chapters, CONTINENTS, type Continent } from "@/data/chapters";

// A flat, editorial "flight routes" map: every chapter plotted at its real
// longitude/latitude, connected back to Bengaluru — the one line in the
// page copy this visual is built to say without words: "wherever your
// degree took you, this is where the network finds you back." Replaces the
// old rotating 3D globe (react-globe.gl + three.js) with a lighter, static
// SVG that reads clearly at a glance instead of requiring drag-to-explore.

const HOME = "Bengaluru";

// Cropped to the actual spread of chapter coordinates (no chapter sits
// outside roughly -120..160 lon / -40..65 lat) so the map fills the frame
// instead of wasting space on empty ocean and poles.
const LON_MIN = -128;
const LON_MAX = 158;
const LAT_MIN = -40;
const LAT_MAX = 62;
const VB_W = 1040;
const VB_H = 440;

function project(lon: number, lat: number) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VB_W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VB_H;
  return { x, y };
}

// Cities that sit close together (the US West Coast, the Northeast, etc.)
// project to nearly the same point at this scale and hide each other — the
// hovered one's tooltip card would bury its neighbors entirely. This nudges
// any points closer than MIN_SEP apart away from each other, a few passes of
// simple pairwise repulsion, so every marker stays reachable. Positions are
// mutated in place on a fresh array; the true lon/lat is kept separately for
// display, only the dot (and the arc it anchors) move.
const MIN_SEP = 15;
function declutter<T extends { pos: { x: number; y: number }; isHome: boolean }>(
  pts: T[]
) {
  const arr = pts.map((p) => ({ ...p, pos: { ...p.pos } }));
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i];
        const b = arr[j];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        if (dist >= MIN_SEP) continue;
        moved = true;
        const push = (MIN_SEP - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        // Home stays anchored at its true position — only the other point
        // yields, so the "wherever you are" arcs still start from Bengaluru.
        if (a.isHome) {
          b.pos.x += ux * push * 2;
          b.pos.y += uy * push * 2;
        } else if (b.isHome) {
          a.pos.x -= ux * push * 2;
          a.pos.y -= uy * push * 2;
        } else {
          a.pos.x -= ux * push;
          a.pos.y -= uy * push;
          b.pos.x += ux * push;
          b.pos.y += uy * push;
        }
      }
    }
    if (!moved) break;
  }
  return arr;
}

const CONTINENT_COLOR: Record<Continent, string> = {
  "North America": "var(--color-oxblood)",
  Europe: "var(--color-maroon)",
  Asia: "var(--color-accent)",
  Oceania: "var(--color-ink)",
};

// Faint watermark labels — just enough cartographic context to orient the
// eye without drawing actual coastlines.
const REGION_LABELS: { label: string; lon: number; lat: number }[] = [
  { label: "NORTH AMERICA", lon: -100, lat: 44 },
  { label: "EUROPE", lon: 8, lat: 56 },
  { label: "ASIA", lon: 95, lat: 40 },
  { label: "OCEANIA", lon: 143, lat: -28 },
];

const GRATICULE_LONS = [-120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRATICULE_LATS = [-30, 0, 30, 60];

export default function ChapterFlightMap() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const points = useMemo(
    () =>
      declutter(
        chapters.map((c) => ({
          ...c,
          pos: project(...c.coordinates),
          isHome: c.name === HOME,
        }))
      ),
    []
  );
  const homePos = points.find((p) => p.isHome)!.pos;

  const active = points.find((p) => p.name === activeId) ?? null;
  // Grow the tooltip away from the point's own half of the map instead of
  // always centering it — a centered card over a dense cluster (the US
  // West Coast, say) buries the very neighbors the reader is exploring.
  const growRight = active ? active.pos.x <= VB_W / 2 : true;

  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-2xl border border-gold/30 bg-ivory-dim/30 px-2 py-6 sm:px-6 sm:py-10">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label="Map of BMS alumni chapter cities worldwide, connected back to Bengaluru"
          className="w-full"
          onClick={() => setActiveId(null)}
        >
          {/* Graticule — faint lat/long grid for map context, no coastlines needed. */}
          <g aria-hidden="true">
            {GRATICULE_LONS.map((lon) => {
              const { x } = project(lon, 0);
              return (
                <line
                  key={`lon-${lon}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={VB_H}
                  stroke="var(--color-gold)"
                  strokeWidth={1}
                  opacity={0.35}
                />
              );
            })}
            {GRATICULE_LATS.map((lat) => {
              const { y } = project(0, lat);
              return (
                <line
                  key={`lat-${lat}`}
                  x1={0}
                  y1={y}
                  x2={VB_W}
                  y2={y}
                  stroke="var(--color-gold)"
                  strokeWidth={1}
                  opacity={0.35}
                />
              );
            })}
          </g>

          {/* Region watermarks */}
          <g aria-hidden="true">
            {REGION_LABELS.map((r) => {
              const { x, y } = project(r.lon, r.lat);
              return (
                <text
                  key={r.label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className="font-sans"
                  style={{
                    fill: "var(--color-ink)",
                    opacity: 0.08,
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                  }}
                >
                  {r.label}
                </text>
              );
            })}
          </g>

          {/* Flight paths — gentle arcs from Bengaluru to every other chapter. */}
          <g>
            {points
              .filter((p) => !p.isHome)
              .map((p) => {
                const isActive = activeId === p.name;
                const mx = (homePos.x + p.pos.x) / 2;
                const my = (homePos.y + p.pos.y) / 2;
                // Bow the midpoint away from the straight line, scaled to
                // distance, so nearby cities get a subtle curve and distant
                // ones get a more pronounced great-circle-ish arc.
                const dx = p.pos.x - homePos.x;
                const dy = p.pos.y - homePos.y;
                const dist = Math.hypot(dx, dy);
                const bow = Math.min(dist * 0.18, 70);
                const nx = -dy / (dist || 1);
                const ny = dx / (dist || 1);
                const cx = mx + nx * bow;
                const cy = my + ny * bow;
                return (
                  <path
                    key={p.name}
                    d={`M ${homePos.x} ${homePos.y} Q ${cx} ${cy} ${p.pos.x} ${p.pos.y}`}
                    fill="none"
                    stroke={CONTINENT_COLOR[p.continent]}
                    strokeWidth={isActive ? 1.75 : 1}
                    opacity={isActive ? 0.85 : 0.25}
                    className="transition-[opacity,stroke-width] duration-200"
                  />
                );
              })}
          </g>

          {/* Chapter markers */}
          <g>
            {points.map((p) => {
              const isActive = activeId === p.name;
              return (
                <g
                  key={p.name}
                  tabIndex={0}
                  role="button"
                  aria-label={p.name}
                  onMouseEnter={() => setActiveId(p.name)}
                  onMouseLeave={() =>
                    setActiveId((cur) => (cur === p.name ? null : cur))
                  }
                  onFocus={() => setActiveId(p.name)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveId(p.name);
                  }}
                  className="cursor-pointer outline-none"
                >
                  {p.isHome && (
                    <circle
                      cx={p.pos.x}
                      cy={p.pos.y}
                      r={13}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.5}
                      opacity={0.55}
                      className="motion-safe:animate-[ping_2.4s_ease-in-out_infinite]"
                    />
                  )}
                  <circle
                    cx={p.pos.x}
                    cy={p.pos.y}
                    r={p.isHome ? 7 : isActive ? 6 : 4}
                    style={{
                      fill: p.isHome
                        ? "var(--color-accent)"
                        : CONTINENT_COLOR[p.continent],
                    }}
                    stroke="var(--color-ivory)"
                    strokeWidth={1.5}
                    className="transition-[r] duration-150"
                  />
                </g>
              );
            })}
          </g>

          {/* Redraw the hovered/focused marker on top so a denser neighbor
              drawn later in the list can never visually bury it. */}
          {active && !active.isHome && (
            <circle
              cx={active.pos.x}
              cy={active.pos.y}
              r={6}
              style={{ fill: CONTINENT_COLOR[active.continent] }}
              stroke="var(--color-ivory)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Tooltip — positioned by percentage so it tracks the SVG's
            responsive viewBox without measuring pixels. */}
        {active && (
          <div
            className={`pointer-events-none absolute z-10 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-lg border border-gold/50 bg-ivory px-3 py-1.5 shadow-lg ${
              growRight ? "translate-x-[-6px]" : "-translate-x-[calc(100%-6px)]"
            }`}
            style={{
              left: `${(active.pos.x / VB_W) * 100}%`,
              top: `${(active.pos.y / VB_H) * 100}%`,
            }}
          >
            <p className="font-display text-sm italic text-ink">
              {active.isHome ? "Bengaluru — home" : active.name}
            </p>
            {active.country && (
              <p className="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-ink/50">
                {active.country}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Continent legend */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/60">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
          Bengaluru — home
        </span>
        {CONTINENTS.map((c) => (
          <span
            key={c}
            className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/60"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: CONTINENT_COLOR[c] }}
            />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
