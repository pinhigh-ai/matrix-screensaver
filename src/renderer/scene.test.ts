import { describe, expect, it } from "vitest";
import { Grid } from "./grid.js";
import { seededRandom } from "./random.js";
import { applyScene } from "./scene.js";

describe("applyScene", () => {
  it("raises dark cells to the scene value scaled by the envelope", () => {
    const grid = new Grid(2, 1);
    const lum = new Float32Array([1, 0.5]);
    applyScene(grid, lum, 0.5, 1, seededRandom(1));
    expect(grid.brightness[0]).toBeCloseTo(0.5, 5);
    expect(grid.brightness[1]).toBeCloseTo(0.25, 5);
  });

  it("never lowers rain that is already brighter than the scene", () => {
    const grid = new Grid(1, 1);
    grid.brightness[0] = 0.9;
    grid.glyph[0] = 7;
    applyScene(grid, new Float32Array([0.3]), 1, 1, seededRandom(1));
    expect(grid.brightness[0]).toBeCloseTo(0.9, 5);
    expect(grid.glyph[0]).toBe(7);
  });

  it("gives a raised dark cell a glyph and a fade so it decays after the scene", () => {
    const grid = new Grid(1, 1);
    applyScene(grid, new Float32Array([1]), 1, 2, seededRandom(3));
    expect(grid.fade[0]).toBeCloseTo(0.5, 5);
    expect(grid.brightness[0]).toBe(1);
  });

  it("leaves the grid untouched when the envelope is zero", () => {
    const grid = new Grid(3, 1);
    applyScene(grid, new Float32Array([1, 1, 1]), 0, 1, seededRandom(1));
    expect(Array.from(grid.brightness)).toEqual([0, 0, 0]);
  });
});
