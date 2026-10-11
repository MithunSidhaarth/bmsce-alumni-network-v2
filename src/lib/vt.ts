/**
 * Marks the element on a destination page that a clicked card grows into.
 * Pair it with <TransitionLink vtName={...}> on the page you came from.
 * Names must be valid CSS identifiers, e.g. "post-<id>" or "chapter-<slug>".
 */
export function vt(name: string) {
  return { "data-vt": name, style: { viewTransitionName: name } } as const;
}
