import { describe, expect, it } from "vitest";
import { atlasLayout, HEAD_LEVEL, LEVELS } from "./atlas.js";
import { type Blit, drawGrid } from "./draw.js";
import { Grid } from "./grid.js";

interface Call {
  sx: number;
  sy: number;
  dx: number;
  dy: number;
}

function recorder(): { blit: Blit; calls: Call[] } {
  const calls: Call[] = [];
  const blit: Blit = (src, dx, dy) => {
    calls.push({ sx: src.x, sy: src.y, dx, dy });
  };
  return { blit, calls };
}

describe("drawGrid", () => {
  const cell = 10;
  const layout = atlasLayout(4, cell);

  it("issues no draw call for a dark grid", () => {
    const grid = new Grid(5, 5);
    const { blit, calls } = recorder();
    expect(drawGrid(grid, layout, cell, blit)).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("draws a lit cell at its pixel position with the atlas rect for its level", () => {
    const grid = new Grid(5, 5);
    const cellIndex = grid.index(3, 2);
    grid.glyph[cellIndex] = 1;
    grid.brightness[cellIndex] = 1;
    const { blit, calls } = recorder();
    expect(drawGrid(grid, layout, cell, blit)).toBe(1);
    const expected = layout.rect(1, LEVELS - 1);
    expect(calls).toEqual([{ sx: expected.x, sy: expected.y, dx: 30, dy: 20 }]);
  });

  it("uses the head level for head cells regardless of brightness", () => {
    const grid = new Grid(2, 2);
    const cellIndex = grid.index(1, 1);
    grid.glyph[cellIndex] = 2;
    grid.brightness[cellIndex] = 0.3;
    grid.isHead[cellIndex] = 1;
    const { blit, calls } = recorder();
    drawGrid(grid, layout, cell, blit);
    const expected = layout.rect(2, HEAD_LEVEL);
    expect(calls).toEqual([{ sx: expected.x, sy: expected.y, dx: 10, dy: 10 }]);
  });
});
