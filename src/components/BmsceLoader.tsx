// Branded loader for route-level Suspense boundaries (loading.tsx) — the
// same official college crest used in SitePreloader, with a thin brass ring
// spinning around it, small enough to sit inline between page loads.
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
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg
          viewBox="0 0 80 80"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full motion-safe:animate-spin"
          style={{ animationDuration: "2.2s" }}
        >
          <circle
            cx="40"
            cy="40"
            r="37"
            fill="none"
            stroke="var(--color-brass)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="5 9"
            opacity="0.6"
          />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bmsce-crest.png"
          alt=""
          width={62}
          height={62}
          className="relative h-[62px] w-[62px] object-contain"
        />
      </div>
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-ink/45">
        {label}
      </p>
    </div>
  );
}
