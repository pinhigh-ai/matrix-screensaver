/**
 * Blend a scene's per-cell luminance into the rain grid. Bright parts of
 * the frame raise cell brightness, so the picture is made of the rain's own
 * glyphs; rain that is already brighter is left alone. Raised cells get a
 * fade so they die away on their own once the scene has gone.
 */
import type { Grid } from "./grid.js";
import { randomGlyphIndex } from "./glyphs.js";
import type { Rng } from "./random.js";

/**
 * @param lum one shaped luminance value per cell, 0..1
 * @param strength scene envelope, 0..1
 * @param fadeSeconds how long a raised cell takes to decay after the scene
 */
export function applyScene(
  grid: Grid,
  lum: Float32Array,
  strength: number,
  fadeSeconds: number,
  rng: Rng,
): void {
  if (strength <= 0) return;
  const { brightness, fade, glyph } = grid;
  const decay = fadeSeconds > 0 ? 1 / fadeSeconds : 1;
  const n = Math.min(brightness.length, lum.length);
  for (let i = 0; i < n; i++) {
    const target = (lum[i] ?? 0) * strength;
    const current = brightness[i] ?? 0;
    if (target <= current) continue;
    if (current <= 0) glyph[i] = randomGlyphIndex(rng);
    brightness[i] = target;
    fade[i] = Math.max(fade[i] ?? 0, decay);
  }
}
