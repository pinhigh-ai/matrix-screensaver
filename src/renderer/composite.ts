/**
 * Per-frame brightness seen by the draw loop. While a scene plays the rain
 * is dimmed in proportion to the scene envelope so the picture stands out,
 * and the scene's own luminance shows wherever it is brighter. The rain
 * grid itself is not modified, so the dimming does not compound.
 */
export function compositeBrightness(
  rain: Float32Array,
  lum: Float32Array,
  strength: number,
  dim: number,
  out: Float32Array,
): void {
  const n = out.length;
  if (strength <= 0) {
    out.set(rain.subarray(0, n));
    return;
  }
  const keep = 1 - dim * strength;
  for (let i = 0; i < n; i++) {
    const r = (rain[i] ?? 0) * keep;
    const s = (lum[i] ?? 0) * strength;
    out[i] = r > s ? r : s;
  }
}
