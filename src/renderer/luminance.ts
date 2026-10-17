/**
 * Turn a frame of pixels into one brightness value per grid cell.
 * The caller draws the video frame into a canvas the size of the grid, so
 * one pixel is one cell and this is just a weighted sum per pixel.
 */

/** Rec. 601 luma from an RGBA buffer, normalised to 0..1, one value per pixel. */
export function luminanceFromRgba(data: Uint8ClampedArray, out: Float32Array): void {
  const n = Math.min(out.length, data.length >> 2);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = data[p] ?? 0;
    const g = data[p + 1] ?? 0;
    const b = data[p + 2] ?? 0;
    out[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
}

export interface Shape {
  /** Luminance at or below this is treated as black. */
  floor: number;
  /** Gamma applied above the floor; below 1 lifts midtones. */
  gamma: number;
}

export const DEFAULT_SHAPE: Readonly<Shape> = Object.freeze({ floor: 0.08, gamma: 0.8 });

/** Re-map a luminance value so dark footage stays dark and faces read clearly. */
export function shapeLuminance(value: number, shape: Shape): number {
  if (value <= shape.floor) return 0;
  const t = (value - shape.floor) / (1 - shape.floor);
  return Math.pow(Math.min(1, t), shape.gamma);
}

const BINS = 256;
const histogram = new Uint32Array(BINS);

/**
 * Stretch a frame's luminance so the `low` percentile becomes 0 and the
 * `high` percentile becomes 1, in place. Real footage rarely spans the whole
 * range, and without this a lit floor or sky reads as a flat block. A flat
 * frame (no spread) is left as it is.
 */
export function autoLevels(values: Float32Array, low: number, high: number): void {
  const n = values.length;
  if (n === 0) return;
  histogram.fill(0);
  for (let i = 0; i < n; i++) {
    const v = values[i] ?? 0;
    const bin = v <= 0 ? 0 : v >= 1 ? BINS - 1 : (v * (BINS - 1)) | 0;
    histogram[bin] = (histogram[bin] ?? 0) + 1;
  }
  const lowCount = low * n;
  const highCount = high * n;
  let lo = 0;
  let hi = BINS - 1;
  let seen = 0;
  for (let b = 0; b < BINS; b++) {
    seen += histogram[b] ?? 0;
    if (seen > lowCount) {
      lo = b;
      break;
    }
  }
  seen = 0;
  for (let b = 0; b < BINS; b++) {
    seen += histogram[b] ?? 0;
    if (seen >= highCount) {
      hi = b;
      break;
    }
  }
  if (hi <= lo) return;
  const min = lo / (BINS - 1);
  const range = (hi - lo) / (BINS - 1);
  for (let i = 0; i < n; i++) {
    const t = ((values[i] ?? 0) - min) / range;
    values[i] = t <= 0 ? 0 : t >= 1 ? 1 : t;
  }
}
