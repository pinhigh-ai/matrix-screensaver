/**
 * Draw planner: walks the grid and blits one atlas rect per lit cell.
 * The blit itself is injected so the planner is testable without a canvas.
 */
import { HEAD_LEVEL, levelFor, type AtlasLayout, type Rect } from "./atlas.js";
import type { Grid } from "./grid.js";

export type Blit = (src: Rect, dx: number, dy: number) => void;

/**
 * Blit every lit cell. Returns the number of draw calls issued.
 * `brightness` defaults to the grid's own; the renderer passes a composited
 * buffer while a scene plays.
 */
export function drawGrid(
  grid: Grid,
  layout: AtlasLayout,
  cell: number,
  blit: Blit,
  brightness: Float32Array = grid.brightness,
): number {
  const { cols, rows, glyph, isHead } = grid;
  let calls = 0;
  let i = 0;
  for (let row = 0; row < rows; row++) {
    const dy = row * cell;
    for (let col = 0; col < cols; col++, i++) {
      const level = isHead[i] ? HEAD_LEVEL : levelFor(brightness[i] ?? 0);
      if (level < 0) continue;
      blit(layout.rect(glyph[i] ?? 0, level), col * cell, dy);
      calls++;
    }
  }
  return calls;
}
