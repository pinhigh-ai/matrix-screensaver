import { describe, expect, it } from "vitest";
import { fitRect } from "./fit.js";

describe("fitRect", () => {
  it("cover scales a portrait video up to fill a landscape grid and crops the sides", () => {
    const r = fitRect(1080, 1920, 100, 56, "cover");
    expect(r.h).toBeCloseTo(177.8, 1); // taller than the grid
    expect(r.w).toBe(100);
    expect(r.x).toBe(0);
    expect(r.y).toBeCloseTo((56 - 177.8) / 2, 1);
  });

  it("cover scales a wide video to fill the height and crops left and right", () => {
    const r = fitRect(3840, 1080, 100, 56, "cover");
    expect(r.h).toBe(56);
    expect(r.w).toBeCloseTo(199.1, 1);
    expect(r.x).toBeLessThan(0);
  });

  it("contain keeps the whole frame inside the grid, centred", () => {
    const r = fitRect(1080, 1920, 100, 56, "contain");
    expect(r.h).toBe(56);
    expect(r.w).toBeCloseTo(31.5, 1);
    expect(r.x).toBeCloseTo((100 - 31.5) / 2, 1);
    expect(r.y).toBe(0);
  });

  it("is exact when the aspect ratios already match", () => {
    expect(fitRect(1920, 1080, 192, 108, "cover")).toEqual({ x: 0, y: 0, w: 192, h: 108 });
  });
});
