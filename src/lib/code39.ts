// Code 39, the barcode printed on college ID cards. Each character is nine
// elements (bar, space, bar, ... bar), three of them wide; "*" starts and ends
// every code. In the patterns below 0 is a narrow element and 1 a wide one.
const PATTERNS: Record<string, string> = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000", "4": "000110001",
  "5": "100110000", "6": "001110000", "7": "000100101", "8": "100100100", "9": "001100100",
  A: "100001001", B: "001001001", C: "101001000", D: "000011001", E: "100011000",
  F: "001011000", G: "000001101", H: "100001100", I: "001001100", J: "000011100",
  K: "100000011", L: "001000011", M: "101000010", N: "000010011", O: "100010010",
  P: "001010010", Q: "000000111", R: "100000110", S: "001000110", T: "000010110",
  U: "110000001", V: "011000001", W: "111000000", X: "010010001", Y: "110010000",
  Z: "011010000", "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
};

const WIDE = 3;

/** Characters Code 39 can carry, upper-cased; anything else is dropped. */
export function code39Text(raw: string): string {
  return [...raw.toUpperCase()].filter((ch) => ch !== "*" && PATTERNS[ch]).join("");
}

/**
 * The bars of a Code 39 barcode as rectangles on a unit grid:
 * [{ x, w }] for each black bar, and the total width.
 */
export function code39(raw: string): { bars: { x: number; w: number }[]; width: number } {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of `*${code39Text(raw)}*`) {
    [...PATTERNS[ch]].forEach((bit, i) => {
      const w = bit === "1" ? WIDE : 1;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    });
    x += 1; // the narrow gap between characters
  }
  return { bars, width: x - 1 };
}

/** Reads bars back into text. Used by the self-check in scripts/verify.mjs. */
export function decode39(bars: { x: number; w: number }[]): string {
  const byPattern = Object.fromEntries(Object.entries(PATTERNS).map(([ch, p]) => [p, ch]));
  let out = "";
  for (let i = 0; i + 5 <= bars.length; i += 5) {
    const five = bars.slice(i, i + 5);
    let pattern = "";
    five.forEach((bar, n) => {
      pattern += bar.w === WIDE ? "1" : "0";
      if (n < 4) pattern += five[n + 1].x - (bar.x + bar.w) === WIDE ? "1" : "0";
    });
    out += byPattern[pattern] ?? "?";
  }
  return out.replace(/^\*|\*$/g, "");
}
