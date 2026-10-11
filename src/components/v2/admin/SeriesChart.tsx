"use client";

import { useId, useRef, useState } from "react";

// A small time-series chart for the admin dashboard: one shared y-axis,
// 2px lines, a light wash under a single series, a crosshair with a tooltip
// on hover or keyboard focus, and a table view of the same numbers.
// The two series colours are validated for colour-vision deficiency against
// the paper surface (green #12a15c, violet #5b3fe0).

export const SERIES_COLOURS = ["#12a15c", "#5b3fe0"] as const;

type Series = { name: string; values: number[] };

const W = 640;
const H = 210;
const PAD = { top: 14, right: 44, bottom: 26, left: 36 };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

export default function SeriesChart({
  title,
  days,
  series,
}: {
  title: string;
  days: string[];
  series: Series[];
}) {
  const id = useId();
  const svg = useRef<SVGSVGElement | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const n = days.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const r3 = (v: number) => Math.round(v * 100) / 100;
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${r3(x(i))} ${r3(y(v))}`).join(" ");
  const total = (s: Series) => s.values.reduce((a, b) => a + b, 0);
  const empty = series.every((s) => total(s) === 0);

  const locate = (clientX: number) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const px = ((clientX - box.left) / box.width) * W;
    setAt(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.left) / innerW) * (n - 1)))));
  };

  return (
    <figure className="min-w-0 flex-1 basis-[22rem] rounded-md border border-ink/12 bg-paper p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[0.9375rem] font-bold">{title}</span>
        {series.length > 1 ? (
          <span className="flex gap-4 text-xs text-ink/70">
            {series.map((s, i) => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ background: SERIES_COLOURS[i] }} />
                {s.name} ({total(s)})
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-ink/60">{total(series[0])} in this period</span>
        )}
      </figcaption>

      <div className="relative mt-2">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={`${id}-desc`}
          tabIndex={0}
          className="block h-auto w-full touch-pan-y outline-offset-4"
          onPointerMove={(e) => locate(e.clientX)}
          onPointerDown={(e) => locate(e.clientX)}
          onPointerLeave={() => setAt(null)}
          onBlur={() => setAt(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setAt((v) => Math.min(n - 1, (v ?? -1) + 1));
            if (e.key === "ArrowLeft") setAt((v) => Math.max(0, (v ?? n) - 1));
            if (e.key === "Escape") setAt(null);
          }}
        >
          <desc id={`${id}-desc`}>
            {title}, {days[0] ? dayLabel(days[0]) : ""} to {days[n - 1] ? dayLabel(days[n - 1]) : ""}.{" "}
            {series.map((s) => `${s.name}: ${total(s)} in total.`).join(" ")}
          </desc>
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#131a15" strokeOpacity={t === 0 ? 0.3 : 0.1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#131a15" fillOpacity="0.55">
                {t.toLocaleString("en-IN")}
              </text>
            </g>
          ))}
          {[0, Math.floor((n - 1) / 2), n - 1]
            .filter((v, i, a) => n > 0 && a.indexOf(v) === i)
            .map((i) => (
              <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill="#131a15" fillOpacity="0.55">
                {dayLabel(days[i])}
              </text>
            ))}

          {series.length === 1 && n > 1 && (
            <path d={`${path(series[0].values)} L${r3(x(n - 1))} ${y(0)} L${r3(x(0))} ${y(0)} Z`} fill={SERIES_COLOURS[0]} fillOpacity="0.1" />
          )}
          {series.map((s, i) => (
            <g key={s.name}>
              <path d={path(s.values)} fill="none" stroke={SERIES_COLOURS[i]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {n > 0 && (
                <>
                  <circle cx={x(n - 1)} cy={y(s.values[n - 1])} r="4.5" fill={SERIES_COLOURS[i]} stroke="#fcf9f0" strokeWidth="2" />
                  <text x={x(n - 1) + 9} y={y(s.values[n - 1]) + 4} fontSize="12" fontWeight="700" fill="#131a15">
                    {s.values[n - 1]}
                  </text>
                </>
              )}
            </g>
          ))}

          {at !== null && (
            <g pointerEvents="none">
              <line x1={x(at)} x2={x(at)} y1={PAD.top} y2={PAD.top + innerH} stroke="#131a15" strokeOpacity="0.45" />
              {series.map((s, i) => (
                <circle key={s.name} cx={x(at)} cy={y(s.values[at])} r="4.5" fill={SERIES_COLOURS[i]} stroke="#fcf9f0" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>

        {at !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-[8.5rem] -translate-x-1/2 rounded border border-ink/15 bg-ink px-3 py-2 text-xs text-ivory shadow-lg"
            style={{ left: `${Math.min(86, Math.max(14, (x(at) / W) * 100))}%` }}
          >
            <p className="font-mono opacity-70">{dayLabel(days[at])}</p>
            {series.map((s, i) => (
              <p key={s.name} className="mt-1 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLOURS[i] }} />
                  {s.name}
                </span>
                <span className="font-bold">{s.values[at]}</span>
              </p>
            ))}
          </div>
        )}
        {empty && (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-ink/50">No activity in this period yet.</p>
        )}
      </div>

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-ink/60 hover:text-ink">Show as a table</summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border-b border-ink/15 py-1 pr-4 font-semibold">Day</th>
                {series.map((s) => (
                  <th key={s.name} className="border-b border-ink/15 py-1 pr-4 font-semibold">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td className="border-b border-ink/[0.07] py-1 pr-4 font-mono">{d}</td>
                  {series.map((s) => (
                    <td key={s.name} className="border-b border-ink/[0.07] py-1 pr-4">
                      {s.values[i]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
