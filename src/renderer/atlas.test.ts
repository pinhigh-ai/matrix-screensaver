import { describe, expect, it } from "vitest";
import { atlasLayout, HEAD_LEVEL, LEVELS, levelFor, trailColor } from "./atlas.js";
import { GLYPHS } from "./glyphs.js";

describe("levelFor", () => {
  it("returns -1 for dark cells so they are skipped", () => {
    expect(levelFor(0)).toBe(-1);
    expect(levelFor(-0.5)).toBe(-1);
  });

  it("maps full brightness to the top level and never beyond", () => {
    expect(levelFor(1)).toBe(LEVELS - 1);
    expect(levelFor(1.5)).toBe(LEVELS - 1);
  });

  it("is monotonic in brightness", () => {
    let previous = -1;
    for (let b = 0.001; b <= 1; b += 0.01) {
      const level = levelFor(b);
      expect(level).toBeGreaterThanOrEqual(previous);
      expect(level).toBeGreaterThanOrEqual(0);
      previous = level;
    }
  });
});

describe("atlasLayout", () => {
  const cell = 20;
  const layout = atlasLayout(GLYPHS.length, cell);

  it("has a source rect for every glyph at every level including the head", () => {
    for (let g = 0; g < GLYPHS.length; g++) {
      for (let level = 0; level <= HEAD_LEVEL; level++) {
        const r = layout.rect(g, level);
        expect(r.w).toBe(cell);
        expect(r.h).toBe(cell);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(layout.width);
        expect(r.y + r.h).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("never gives two glyph/level pairs the same rect", () => {
    const seen = new Set<string>();
    for (let g = 0; g < GLYPHS.length; g++) {
      for (let level = 0; level <= HEAD_LEVEL; level++) {
        const r = layout.rect(g, level);
        const key = `${r.x},${r.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe("trailColor", () => {
  it("is darker at low levels and brightest at the top level", () => {
    const low = trailColor(0);
    const high = trailColor(LEVELS - 1);
    expect(low.g).toBeLessThan(high.g);
    expect(high.g).toBe(255);
  });

  it("stays within byte range", () => {
    for (let level = 0; level < LEVELS; level++) {
      const c = trailColor(level);
      for (const v of [c.r, c.g, c.b]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
  });
});
