type SealProps = {
  className?: string;
  ringColor?: string;
  textColor?: string;
  monogramColor?: string;
};

export default function Seal({
  className,
  ringColor = "var(--color-gold)",
  textColor = "var(--color-gold)",
  monogramColor = "var(--color-ink)",
}: SealProps) {
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

      <circle cx="100" cy="100" r="94" fill="none" stroke={ringColor} strokeWidth="1" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={ringColor} strokeWidth="0.75" />

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
    </svg>
  );
}
