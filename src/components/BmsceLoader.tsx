// Branded loader: two interlocking gears — a nod to the mark in the actual
// logo — one turning clockwise, the smaller one counter-clockwise, like they
// mesh. Pure SVG + CSS animation (globals.css), so it paints instantly with
// no image request and never needs a `prefers-reduced-motion` fallback more
// elaborate than "hold still" (handled by motion-safe:).
function Gear({
  size,
  teeth = 8,
  color,
}: {
  size: number;
  teeth?: number;
  color: string;
}) {
  const cx = 50;
  const cy = 50;
  const outerR = 34;
  const innerR = 24;
  const toothW = 13;
  const toothH = 12;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx={cx} cy={cy} r={outerR} fill={color} />
      {Array.from({ length: teeth }).map((_, i) => (
        <rect
          key={i}
          x={cx - toothW / 2}
          y={cy - outerR - toothH + 6}
          width={toothW}
          height={toothH}
          rx={2}
          fill={color}
          transform={`rotate(${(360 / teeth) * i} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill="var(--color-ivory)" />
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.18} />
    </svg>
  );
}

export default function BmsceLoader({
  label = "Loading",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-5 ${className}`}
    >
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 motion-safe:animate-spin [animation-duration:3.2s]">
          <Gear size={80} color="var(--color-oxblood)" />
        </div>
        <div className="absolute -right-2 -top-2 h-9 w-9 [animation-direction:reverse] motion-safe:animate-spin [animation-duration:2s]">
          <Gear size={36} teeth={7} color="var(--color-accent)" />
        </div>
      </div>
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ink/45 motion-safe:animate-pulse">
        {label}
      </p>
    </div>
  );
}
