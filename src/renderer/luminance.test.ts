import { describe, expect, it } from "vitest";
import { autoLevels, luminanceFromRgba, shapeLuminance } from "./luminance.js";

function rgba(...pixels: [number, number, number][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  });
  return out;
}

describe("luminanceFromRgba", () => {
  it("maps black to 0 and white to 1", () => {
    const out = new Float32Array(2);
    luminanceFromRgba(rgba([0, 0, 0], [255, 255, 255]), out);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[1]).toBeCloseTo(1, 5);
  });

  it("weights green more than red and red more than blue", () => {
    const out = new Float32Array(3);
    luminanceFromRgba(rgba([255, 0, 0], [0, 255, 0], [0, 0, 255]), out);
    const [r, g, b] = out;
    expect(g).toBeGreaterThan(r ?? 0);
    expect(r).toBeGreaterThan(b ?? 0);
  });

  it("writes exactly one value per pixel", () => {
    const out = new Float32Array(3);
    luminanceFromRgba(rgba([10, 10, 10], [20, 20, 20], [30, 30, 30]), out);
    expect(Array.from(out).every((v) => v > 0 && v < 0.2)).toBe(true);
  });
});

describe("shapeLuminance", () => {
  it("drops values below the floor to zero so dark footage stays dark", () => {
    expect(shapeLuminance(0.05, { floor: 0.1, gamma: 1 })).toBe(0);
  });

  it("keeps 1 at 1 and is monotonic", () => {
    expect(shapeLuminance(1, { floor: 0.1, gamma: 0.8 })).toBeCloseTo(1, 5);
    let previous = 0;
    for (let v = 0; v <= 1; v += 0.05) {
      const shaped = shapeLuminance(v, { floor: 0.1, gamma: 0.8 });
      expect(shaped).toBeGreaterThanOrEqual(previous);
      previous = shaped;
    }
  });
});

describe("autoLevels", () => {
  it("stretches a low-contrast frame to the full range", () => {
    const values = new Float32Array([0.4, 0.45, 0.5, 0.55, 0.6]);
    autoLevels(values, 0, 1);
    expect(values[0]).toBeCloseTo(0, 5);
    expect(values[4]).toBeCloseTo(1, 5);
    expect(values[2]).toBeCloseTo(0.5, 5);
  });

  it("clips outliers beyond the chosen percentiles", () => {
    const values = new Float32Array(100);
    for (let i = 0; i < 100; i++) values[i] = 0.3 + (i / 99) * 0.2; // 0.3..0.5
    values[0] = 0; // one dark outlier
    values[99] = 1; // one bright outlier
    autoLevels(values, 0.05, 0.95);
    const sorted = Array.from(values).sort((a, b) => a - b);
    expect(sorted[5]).toBeCloseTo(0, 1);
    expect(sorted[94]).toBeCloseTo(1, 1);
    expect(values[0]).toBe(0);
    expect(values[99]).toBe(1);
  });

  it("leaves a flat frame alone instead of dividing by zero", () => {
    const values = new Float32Array([0.3, 0.3, 0.3]);
    autoLevels(values, 0.05, 0.95);
    expect(Array.from(values).every((v) => Number.isFinite(v))).toBe(true);
    expect(values[0]).toBeCloseTo(0.3, 5);
  });

  it("keeps every value within 0..1", () => {
    const values = new Float32Array([0, 0.1, 0.9, 1]);
    autoLevels(values, 0.2, 0.8);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
