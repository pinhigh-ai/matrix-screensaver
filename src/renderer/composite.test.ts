import { describe, expect, it } from "vitest";
import { compositeBrightness } from "./composite.js";

describe("compositeBrightness", () => {
  it("passes rain through untouched when no scene is playing", () => {
    const rain = new Float32Array([0, 0.4, 1]);
    const out = new Float32Array(3);
    compositeBrightness(rain, new Float32Array([1, 1, 1]), 0, 0.7, out);
    expect(out[0]).toBe(0);
    expect(out[1]).toBeCloseTo(0.4, 5);
    expect(out[2]).toBe(1);
  });

  it("dims the rain by the envelope and shows the scene on top", () => {
    const rain = new Float32Array([1, 0.2, 0]);
    const lum = new Float32Array([0, 0.9, 0.5]);
    const out = new Float32Array(3);
    compositeBrightness(rain, lum, 1, 0.7, out);
    expect(out[0]).toBeCloseTo(0.3, 5); // rain only, dimmed to 30 %
    expect(out[1]).toBeCloseTo(0.9, 5); // scene wins over dim rain
    expect(out[2]).toBeCloseTo(0.5, 5); // scene on a dark cell
  });

  it("scales both effects at half envelope", () => {
    const out = new Float32Array(1);
    compositeBrightness(new Float32Array([1]), new Float32Array([0]), 0.5, 0.8, out);
    expect(out[0]).toBeCloseTo(0.6, 5);
  });
});
