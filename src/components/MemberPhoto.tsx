"use client";

/**
 * Renders a member's profile photo as a CSS background-image on a <div> rather
 * than an <img>, with the right-click context menu and drag-to-save disabled.
 *
 * This is a DETERRENT against casual saving (the average person right-clicking
 * or dragging the image out) — it is NOT real protection. The image URL is
 * still reachable via dev tools / the network tab, a screenshot always works,
 * and browser extensions can bypass these handlers. Use only for member photos
 * (Directory, profiles, etc.) — not the founder photo, logo, or Instagram feed,
 * which stay ordinary downloadable <img> elements.
 *
 * Fills its parent (the parent supplies size, shape, and overflow), matching
 * the `h-full w-full object-cover` <img> pattern it replaces.
 */
export default function MemberPhoto({
  src,
  alt = "",
  className = "h-full w-full",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const labelled = alt.trim().length > 0;
  return (
    <div
      {...(labelled
        ? { role: "img", "aria-label": alt }
        : { "aria-hidden": true })}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={`${className} bg-cover bg-center bg-no-repeat`}
      style={{ backgroundImage: `url("${src}")` }}
    />
  );
}
