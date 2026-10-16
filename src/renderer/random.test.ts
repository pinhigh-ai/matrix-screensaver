import { describe, expect, it } from "vitest";
import { seededRandom } from "./random.js";

describe("seededRandom", () => {
  it("is deterministic for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("differs between seeds", () => {
    expect(seededRandom(1).next()).not.toBe(seededRandom(2).next());
  });

  it("stays in [0, 1)", () => {
    const rng = seededRandom(3);
    for (let i = 0; i < 10000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("offers an integer helper in [min, max)", () => {
    const rng = seededRandom(9);
    for (let i = 0; i < 1000; i++) {
      const n = rng.int(2, 5);
      expect([2, 3, 4]).toContain(n);
    }
  });
});
