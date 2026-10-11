// Archive thumbnails that are empty frames (a blank sheet of paper, an
// all-black still from a video). Found by measuring how much detail each
// picture holds; these are shown as text cards instead of empty photographs.
export const BLANK_SHOTS = new Set(["DDoMJoMKMhI", "DDPd804Si9A"]);

export function isBlankShot(src: string | null | undefined): boolean {
  const code = src?.match(/^\/instagram\/(.+)\.jpg$/)?.[1];
  return Boolean(code && BLANK_SHOTS.has(code));
}
