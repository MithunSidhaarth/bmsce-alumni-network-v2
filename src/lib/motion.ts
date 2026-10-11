// Whether animation should run for this visitor.
//
// The device's "reduce motion" setting is respected by default. The site also
// has its own switch (the Motion control in the footer), stored in a cookie
// and reflected as data-motion on <html>: an explicit choice there wins in
// either direction.
export type MotionChoice = "full" | "calm";

export const MOTION_COOKIE = "motion";

export function motionOK(): boolean {
  if (typeof window === "undefined") return false;
  const choice = document.documentElement.dataset.motion;
  if (choice === "full") return true;
  if (choice === "calm") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setMotion(choice: MotionChoice) {
  document.cookie = `${MOTION_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.motion = choice;
}
