import { describe, expect, it } from "vitest";
import { Grid, gridSize } from "./grid.js";

describe("gridSize", () => {
  it("rounds up so the grid covers the whole screen", () => {
    expect(gridSize(1920, 1080, 18)).toEqual({ cols: 107, rows: 60 });
    expect(gridSize(2560, 1440, 20)).toEqual({ cols: 128, rows: 72 });
  });

  it("never returns fewer than one column or row", () => {
    expect(gridSize(0, 0, 18)).toEqual({ cols: 1, rows: 1 });
  });
});

describe("Grid", () => {
  it("starts dark with every cell at brightness zero", () => {
    const grid = new Grid(4, 3);
    expect(grid.cols).toBe(4);
    expect(grid.rows).toBe(3);
    expect(Array.from(grid.brightness)).toEqual(new Array(12).fill(0));
  });

  it("maps column and row to a row-major index", () => {
    const grid = new Grid(4, 3);
    expect(grid.index(0, 0)).toBe(0);
    expect(grid.index(3, 0)).toBe(3);
    expect(grid.index(0, 1)).toBe(4);
    expect(grid.index(3, 2)).toBe(11);
  });
});
