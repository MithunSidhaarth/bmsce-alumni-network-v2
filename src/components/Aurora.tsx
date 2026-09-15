// Decorative, slow-drifting glow blobs for behind hero/CTA copy — brand
// colors only, blurred and low-opacity so they read as atmosphere rather
// than shapes. Absolutely positioned: the parent needs `relative
// overflow-hidden`. Pure CSS animation (see globals.css) — no JS, so it
// costs nothing and never fights `prefers-reduced-motion` since a slow
// gradient drift isn't the kind of motion that rule is meant to stop, but
// we pause it anyway to be safe.
export default function Aurora({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const a = variant === "dark" ? "var(--color-accent)" : "var(--color-oxblood)";
  const b = variant === "dark" ? "var(--color-gold)" : "var(--color-maroon)";
  const c = variant === "dark" ? "var(--color-maroon)" : "var(--color-accent)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span
        className="absolute -left-[10%] -top-[20%] h-[60vw] w-[60vw] max-w-[700px] rounded-full opacity-[0.16] blur-3xl motion-safe:animate-[var(--animate-aurora-a)]"
        style={{ background: a }}
      />
      <span
        className="absolute -right-[15%] top-[10%] h-[50vw] w-[50vw] max-w-[600px] rounded-full opacity-[0.13] blur-3xl motion-safe:animate-[var(--animate-aurora-b)]"
        style={{ background: b }}
      />
      <span
        className="absolute bottom-[-20%] left-[30%] h-[45vw] w-[45vw] max-w-[550px] rounded-full opacity-[0.1] blur-3xl motion-safe:animate-[var(--animate-aurora-c)]"
        style={{ background: c }}
      />
    </div>
  );
}
