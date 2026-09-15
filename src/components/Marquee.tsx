// Infinite horizontal ticker. The item list is rendered twice back-to-back
// and the CSS animation slides exactly 50% (one copy's width) — since both
// copies are identical, the loop point is seamless. Pauses on hover so it
// doesn't fight anyone trying to read it, and stays still entirely under
// prefers-reduced-motion (handled by the motion-safe: prefix).
export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div
      className={`group overflow-hidden ${className}`}
      role="list"
      aria-label={items.join(", ")}
    >
      <div className="flex w-max motion-safe:animate-[var(--animate-marquee)] group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            role="listitem"
            className="flex items-center px-8 font-display text-2xl italic text-current/70 md:text-3xl"
          >
            {item}
            <span aria-hidden="true" className="ml-8 h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}
