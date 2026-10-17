/**
 * Where to draw a video frame of vw x vh inside a cols x rows surface.
 * "cover" scales until the frame fills the surface and crops the rest;
 * "contain" scales until the whole frame fits and leaves bars.
 */
export type FitMode = "cover" | "contain";

export interface FitResult {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function fitRect(
  vw: number,
  vh: number,
  cols: number,
  rows: number,
  mode: FitMode,
): FitResult {
  const sx = cols / vw;
  const sy = rows / vh;
  const scale = mode === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
  const w = vw * scale;
  const h = vh * scale;
  return { x: (cols - w) / 2, y: (rows - h) / 2, w, h };
}
