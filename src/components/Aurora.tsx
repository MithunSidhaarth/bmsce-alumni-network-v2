// Decorative, slow-drifting glow blobs for behind hero/CTA copy — brand
// colors only, blurred and low-opacity so they read as atmosphere rather
// than shapes. Absolutely positioned: the parent needs `relative
// overflow-hidden`. Pure CSS animation (see globals.css) — no JS, so it
// costs nothing and never fights `prefers-reduced-motion` since a slow
// gradient drift isn't the kind of motion that rule is meant to stop, but
// we pause it anyway to be safe.
export default function Aurora({
  variant = "light",
  strength = 1,
}: {
  variant?: "light" | "dark";
  // Extra multiplier on top of the (already toned-down) base opacities —
  // the global ambient instance in the root layout uses a lower value so
  // it reads as atmosphere on every page without competing with content.
  strength?: number;
}) {
  const a = variant === "dark" ? "var(--color-accent)" : "var(--color-oxblood)";
  const b = variant === "dark" ? "var(--color-gold)" : "var(--color-maroon)";
  const c = variant === "dark" ? "var(--color-maroon)" : "var(--color-accent)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: strength }}
    >
      <span
        className="absolute -left-[10%] -top-[20%] h-[60vw] w-[60vw] max-w-[700px] rounded-full opacity-[0.08] blur-3xl motion-ok:animate-[var(--animate-aurora-a)]"
        style={{ background: a }}
      />
      <span
        className="absolute -right-[15%] top-[10%] h-[50vw] w-[50vw] max-w-[600px] rounded-full opacity-[0.065] blur-3xl motion-ok:animate-[var(--animate-aurora-b)]"
        style={{ background: b }}
      />
      <span
        className="absolute bottom-[-20%] left-[30%] h-[45vw] w-[45vw] max-w-[550px] rounded-full opacity-[0.05] blur-3xl motion-ok:animate-[var(--animate-aurora-c)]"
        style={{ background: c }}
      />
    </div>
  );
}
