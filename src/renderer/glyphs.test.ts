import { describe, expect, it } from "vitest";
import { GLYPHS, randomGlyphIndex } from "./glyphs.js";
import { seededRandom } from "./random.js";

describe("GLYPHS", () => {
  it("contains half-width katakana, digits and symbols with no duplicates", () => {
    expect(GLYPHS).toContain("ﾊ");
    expect(GLYPHS).toContain("ﾂ");
    expect(GLYPHS).toContain("0");
    expect(GLYPHS).toContain("9");
    expect(GLYPHS).toContain("=");
    expect(new Set(GLYPHS).size).toBe(GLYPHS.length);
  });

  it("is made of single code points so every glyph fits one cell", () => {
    for (const glyph of GLYPHS) {
      expect(Array.from(glyph)).toHaveLength(1);
    }
  });
});

describe("randomGlyphIndex", () => {
  it("always returns an index inside the glyph set", () => {
    const rng = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const index = randomGlyphIndex(rng);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(GLYPHS.length);
      expect(Number.isInteger(index)).toBe(true);
    }
  });
});
