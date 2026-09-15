type SealProps = {
  className?: string;
  ringColor?: string;
  textColor?: string;
  monogramColor?: string;
  /** Adds a laurel wreath around the ring and a ribbon tie at the base —
   * the extra ceremonial detail for "official" moments (preloader, page
   * loader) where the plain ring reads as too plain on its own. Shrinks
   * the rings slightly to leave room for the wreath within the same
   * 0 0 200 200 viewBox, so existing callers (the Hero watermark) are
   * unaffected unless they opt in. */
  laurel?: boolean;
  laurelColor?: string;
  /** When true, leaves/rings animate in (staggered scale+fade / stroke
   * draw) instead of rendering static — used by SitePreloader. */
  animate?: boolean;
};

// Rounded to 3 decimals: an un-rounded float here serializes to a different
// number of digits in the server-rendered HTML attribute string than the
// client's re-computed value hydrates with, which React flags as a
// server/client mismatch even though the underlying number is identical.
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function laurelPoints(count: number, radius: number) {
  const startDeg = 96;
  const endDeg = 261;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    return {
      x: round(100 + radius * Math.cos(rad)),
      y: round(100 + radius * Math.sin(rad)),
      rot: round(deg + 90),
      t,
    };
  });
}

export default function Seal({
  className,
  ringColor = "var(--color-gold)",
  textColor = "var(--color-gold)",
  monogramColor = "var(--color-ink)",
  laurel = false,
  laurelColor = "var(--color-brass)",
  animate = false,
}: SealProps) {
  const outerR = laurel ? 76 : 94;
  const innerR = laurel ? 66 : 84;
  const leaves = laurel ? laurelPoints(9, 89) : [];

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="BMS Alumni Association seal, established 1946"
    >
      <defs>
        <path id="seal-top-arc" d="M 32,100 A 68,68 0 0 1 168,100" fill="none" />
      </defs>

      {laurel && (
        <circle
          cx="100"
          cy="100"
          r={outerR + 5}
          fill="none"
          stroke={laurelColor}
          strokeWidth="0.5"
          opacity="0.5"
        />
      )}

      <circle
        cx="100"
        cy="100"
        r={outerR}
        fill="none"
        stroke={ringColor}
        strokeWidth="1"
        className={animate ? "seal-ring-draw" : undefined}
        pathLength={100}
      />
      <circle
        cx="100"
        cy="100"
        r={innerR}
        fill="none"
        stroke={ringColor}
        strokeWidth="0.75"
        className={animate ? "seal-ring-draw-reverse" : undefined}
        pathLength={100}
      />

      <text
        fill={textColor}
        fontFamily="var(--font-sans)"
        fontSize="9.5"
        letterSpacing="2.5"
        textAnchor="middle"
      >
        <textPath href="#seal-top-arc" startOffset="50%">
          EST. 1946 · BENGALURU
        </textPath>
      </text>

      <text
        x="100"
        y="112"
        fill={monogramColor}
        fontFamily="var(--font-display)"
        fontStyle="italic"
        fontSize="46"
        textAnchor="middle"
      >
        BMS
      </text>

      <line x1="76" y1="126" x2="124" y2="126" stroke={ringColor} strokeWidth="0.75" />

      <text
        x="100"
        y="140"
        fill={textColor}
        fontFamily="var(--font-sans)"
        fontSize="8"
        letterSpacing="3"
        textAnchor="middle"
      >
        ALUMNI
      </text>

      {laurel && (
        <>
          {leaves.map((p, i) => (
            <ellipse
              key={`l${i}`}
              cx={p.x}
              cy={p.y}
              rx="6.5"
              ry="2.9"
              fill={laurelColor}
              transform={`rotate(${p.rot} ${p.x} ${p.y})`}
              className={animate ? "seal-leaf" : undefined}
              style={animate ? { animationDelay: `${0.55 + p.t * 0.5}s` } : undefined}
            />
          ))}
          <g transform="translate(200,0) scale(-1,1)">
            {leaves.map((p, i) => (
              <ellipse
                key={`r${i}`}
                cx={p.x}
                cy={p.y}
                rx="6.5"
                ry="2.9"
                fill={laurelColor}
                transform={`rotate(${p.rot} ${p.x} ${p.y})`}
                className={animate ? "seal-leaf" : undefined}
                style={animate ? { animationDelay: `${0.55 + p.t * 0.5}s` } : undefined}
              />
            ))}
          </g>
          <rect x="93" y="190" width="14" height="5" rx="1" fill={laurelColor} opacity="0.9" />
        </>
      )}
    </svg>
  );
}
