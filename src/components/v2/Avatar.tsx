import MemberPhoto from "@/components/MemberPhoto";
import { initials, seeded } from "@/lib/format";

const TINTS = ["#c8f53c", "#ffd9c7", "#d9d0ff", "#bfeecf", "#f6e3a1"];

/** Member photo, or their initials on a tint that is stable per person. */
export default function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const tint = TINTS[Math.floor(seeded(name ?? "?") * TINTS.length)];
  return (
    <span
      className={`keep-day relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/15 font-display font-bold text-ink ${className}`}
      style={{ width: size, height: size, background: tint, fontSize: size * 0.38 }}
    >
      {src ? <MemberPhoto src={src} alt={name ?? ""} /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}
