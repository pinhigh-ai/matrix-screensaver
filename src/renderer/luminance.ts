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
