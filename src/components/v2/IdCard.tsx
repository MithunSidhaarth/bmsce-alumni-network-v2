"use client";

import { useRef, useState, type PointerEvent } from "react";
import { code39 } from "@/lib/code39";
import { initials } from "@/lib/format";

// The colours and type of the real card: white laminate, navy print, Arial bold.
const NAVY = "#23297a";
const FACE = "absolute inset-0 overflow-hidden rounded-[5.2cqw] bg-[#fdfdfa] [backface-visibility:hidden] shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_0_0_1px_rgb(19_26_21/0.08),0_30px_45px_-22px_rgb(19_26_21/0.55)]";

export type IdCardData = {
  name: string;
  photo: string | null;
  /** "Dept. of ..." line, already worded. */
  dept: string | null;
  /** The line under the department: the roll number, or the batch when there is none. */
  idLine: string;
  /** What the barcode encodes. */
  code: string;
  back: {
    kind: string;
    verified: boolean;
    since: string | null;
    role: string | null;
    place: string | null;
    chapters: string[];
  };
};

function Barcode({ text }: { text: string }) {
  const { bars, width } = code39(text);
  return (
    <svg viewBox={`0 0 ${width} 10`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`Barcode for ${text}`}>
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={10} fill="#111" />
      ))}
    </svg>
  );
}

/**
 * A member's college ID card, laid out like the real BMS card: crest and
 * "BMS", the photograph, name, department, roll number and a barcode. It
 * hangs from a lanyard, tips toward the pointer like a laminated card
 * catching the light, and turns over to show the back.
 */
export default function IdCard({ data }: { data: IdCardData }) {
  const card = useRef<HTMLDivElement | null>(null);
  const [flipped, setFlipped] = useState(false);

  const tip = (e: PointerEvent<HTMLDivElement>) => {
    const el = card.current;
    if (!el) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 22).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 16).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--glare", "1");
  };
  const rest = () => {
    const el = card.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--glare", "0");
  };

  return (
    <div className="idcard-hang mx-auto w-[min(19.5rem,76vw)] [container-type:inline-size]">
      {/* Lanyard and clip */}
      <div className="mx-auto h-[20cqw] w-[6.5cqw] bg-forest shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]" aria-hidden="true" />
      <div className="relative z-10 mx-auto -mb-[3cqw] h-[8cqw] w-[13cqw] rounded-[1.6cqw] bg-gradient-to-b from-[#d9dcdf] to-[#8f959b] shadow-[0_2px_3px_rgb(19_26_21/0.35)]" aria-hidden="true" />

      <div className="[perspective:1100px]" onPointerMove={tip} onPointerLeave={rest}>
        <div
          ref={card}
          className="relative aspect-[54/85.6] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(calc(var(--ry,0deg)+var(--flip,0deg)))]"
          style={{ ["--flip" as string]: flipped ? "180deg" : "0deg" }}
        >
          {/* ---------- Front: as printed ---------- */}
          <div className={FACE} style={{ fontFamily: "Arial, Helvetica, sans-serif" }} aria-hidden={flipped}>
            <div className="flex items-center justify-center gap-[2.5cqw] px-[4cqw] pt-[6.5cqw]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bmsce-crest.png" alt="B.M.S. College of Engineering crest" className="h-auto w-[37cqw] shrink-0" draggable={false} />
              <span className="text-[21cqw] font-bold leading-none tracking-[0.05em]" style={{ color: NAVY }}>
                BMS
              </span>
            </div>
            <p className="mt-[2.4cqw] text-center text-[6.1cqw] font-bold leading-none tracking-[0.01em]" style={{ color: NAVY }}>
              COLLEGE OF ENGINEERING
            </p>

            <div className="mx-auto mt-[4cqw] aspect-[320/336] w-[51cqw] overflow-hidden bg-[#c7282d]">
              {data.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.photo} alt={`Photograph of ${data.name}`} className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[20cqw] font-bold text-white/90" aria-hidden="true">
                  {initials(data.name)}
                </span>
              )}
            </div>

            <p className="mt-[4.2cqw] truncate px-[4cqw] text-center text-[5.4cqw] font-bold leading-tight" style={{ color: NAVY }}>
              {data.name}
            </p>
            {data.dept && <p className="mt-[2cqw] truncate px-[4cqw] text-center text-[5.7cqw] font-bold leading-tight text-[#141414]">{data.dept}</p>}
            <p className="mt-[1.6cqw] text-center text-[4.9cqw] font-bold leading-tight tracking-[0.02em] text-[#141414]">{data.idLine}</p>

            <div className="absolute inset-x-[9cqw] bottom-[4.6cqw] h-[10.5cqw]">
              <Barcode text={data.code} />
            </div>
            {/* Laminate catching the light */}
            <span
              className="pointer-events-none absolute inset-0 opacity-[var(--glare,0)] transition-opacity duration-300 [background:radial-gradient(circle_at_var(--gx,50%)_var(--gy,30%),rgb(255_255_255/0.75),transparent_42%)] mix-blend-soft-light"
              aria-hidden="true"
            />
          </div>

          {/* ---------- Back ---------- */}
          <div className={`${FACE} [transform:rotateY(180deg)]`} aria-hidden={!flipped}>
            <div className="flex h-full flex-col px-[7cqw] pb-[6cqw] pt-[7cqw] text-ink">
              <p className="flex items-center justify-between">
                <span className="font-mono text-[3.4cqw] uppercase tracking-[0.16em] text-ink/55">Alumni Network</span>
                <span className={`stamp text-[3.2cqw] ${data.back.verified ? "text-forest" : "text-tangerine"}`}>{data.back.verified ? "Verified" : "Not verified yet"}</span>
              </p>
              <p className="mt-[6cqw] font-display text-[8cqw] font-extrabold leading-[0.95]">{data.back.kind}</p>
              <dl className="mt-[5cqw] flex flex-col gap-[3.4cqw] text-[4.2cqw] leading-snug">
                {data.back.role && (
                  <div>
                    <dt className="font-mono text-[3cqw] uppercase tracking-[0.14em] text-ink/50">Now</dt>
                    <dd className="line-clamp-2 font-semibold">{data.back.role}</dd>
                  </div>
                )}
                {data.back.place && (
                  <div>
                    <dt className="font-mono text-[3cqw] uppercase tracking-[0.14em] text-ink/50">Lives in</dt>
                    <dd className="truncate font-semibold">{data.back.place}</dd>
                  </div>
                )}
                {data.back.chapters.length > 0 && (
                  <div>
                    <dt className="font-mono text-[3cqw] uppercase tracking-[0.14em] text-ink/50">Chapters</dt>
                    <dd className="line-clamp-2 font-semibold">{data.back.chapters.join(", ")}</dd>
                  </div>
                )}
                {data.back.since && (
                  <div>
                    <dt className="font-mono text-[3cqw] uppercase tracking-[0.14em] text-ink/50">On the network since</dt>
                    <dd className="font-semibold">{data.back.since}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-auto">
                <p className="hand truncate border-b border-ink/40 pb-[1cqw] text-[9cqw] leading-none text-[#1b2a6b]">{data.name}</p>
                <p className="mt-[1.4cqw] font-mono text-[2.8cqw] uppercase tracking-[0.14em] text-ink/50">Holder&rsquo;s signature</p>
                <p className="mt-[4cqw] text-[3.1cqw] leading-snug text-ink/60">
                  If found, please return to B.M.S. College of Engineering, Bull Temple Road, Bengaluru 560019.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-[6cqw] text-center">
        <button type="button" onClick={() => setFlipped((v) => !v)} aria-pressed={flipped} className="btn btn-ghost btn-sm">
          {flipped ? "Show the front" : "Turn the card over"}
        </button>
      </p>
    </div>
  );
}
