type EyebrowProps = {
  children: React.ReactNode;
  tone?: "ink" | "ivory";
  align?: "left" | "center";
};

export default function Eyebrow({
  children,
  tone = "ink",
  align = "left",
}: EyebrowProps) {
  const toneClass = tone === "ivory" ? "text-ivory/80" : "text-oxblood/80";
  const alignClass = align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`flex items-center gap-3 ${alignClass}`}>
      <span className="h-px w-8 bg-gold" aria-hidden="true" />
      <span
        className={`font-sans text-[11px] font-medium uppercase tracking-[0.28em] ${toneClass}`}
      >
        {children}
      </span>
      {align === "center" && <span className="h-px w-8 bg-gold" aria-hidden="true" />}
    </div>
  );
}
