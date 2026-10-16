/**
 * The glyph set. The film's rain is mostly half-width katakana with digits
 * and a few Latin symbols mixed in; the renderer mirrors them horizontally
 * at draw time as the film did. Each entry is one code point so it fits a
 * single grid cell.
 */
import type { Rng } from "./random.js";

const HALF_WIDTH_KATAKANA = Array.from({ length: 0xff9d - 0xff66 + 1 }, (_, i) =>
  String.fromCodePoint(0xff66 + i),
);

const DIGITS = Array.from("0123456789");

const SYMBOLS = Array.from(':."=*+-<>|¦_Z');

export const GLYPHS: readonly string[] = Object.freeze([
  ...HALF_WIDTH_KATAKANA,
  ...DIGITS,
  ...SYMBOLS,
]);

/** Index of a uniformly random glyph. Katakana dominate because there are more of them. */
export function randomGlyphIndex(rng: Rng): number {
  return rng.int(0, GLYPHS.length);
}
