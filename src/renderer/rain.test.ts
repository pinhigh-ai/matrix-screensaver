import { describe, expect, it } from "vitest";
import { Grid } from "./grid.js";
import { Rain } from "./rain.js";
import { seededRandom } from "./random.js";

/** A rain with spawning switched off so tests can place streams by hand. */
function quietRain(cols: number, rows: number, seed = 1): { grid: Grid; rain: Rain } {
  const grid = new Grid(cols, rows);
  const rain = new Rain(grid, seededRandom(seed), {
    spawnRate: 0,
    mutationRate: 0,
    minSpeed: 1,
    maxSpeed: 1,
    minTrail: 4,
    maxTrail: 4,
  });
  return { grid, rain };
}

describe("Rain", () => {
  it("places the head on add and advances it one cell per tick at speed 1", () => {
    const { grid, rain } = quietRain(1, 10);
    rain.addStream(0, { row: 0, speed: 1, trail: 4 });
    expect(grid.brightness[grid.index(0, 0)]).toBe(1);
    expect(grid.isHead[grid.index(0, 0)]).toBe(1);
    rain.tick(1);
    expect(grid.isHead[grid.index(0, 1)]).toBe(1);
    expect(grid.isHead[grid.index(0, 0)]).toBe(0);
    rain.tick(1);
    expect(grid.isHead[grid.index(0, 2)]).toBe(1);
    expect(grid.isHead[grid.index(0, 1)]).toBe(0);
  });

  it("writes every cell the head crosses in one large tick", () => {
    const { grid, rain } = quietRain(1, 10);
    rain.addStream(0, { row: 0, speed: 1, trail: 10 });
    rain.tick(3);
    for (let row = 0; row <= 3; row++) {
      expect(grid.brightness[grid.index(0, row)]).toBeGreaterThan(0);
    }
    expect(grid.isHead[grid.index(0, 3)]).toBe(1);
  });

  it("lights the head cell with a glyph from the set", () => {
    const { grid, rain } = quietRain(1, 10);
    rain.addStream(0, { row: 0, speed: 1, trail: 4 });
    expect(grid.glyph[grid.index(0, 0)]).toBeGreaterThanOrEqual(0);
  });

  it("fades the trail monotonically behind the head", () => {
    const { grid, rain } = quietRain(1, 20);
    rain.addStream(0, { row: 0, speed: 1, trail: 4 });
    const cell = grid.index(0, 0);
    let previous = grid.brightness[cell] ?? 0;
    expect(previous).toBe(1);
    for (let i = 0; i < 8; i++) {
      rain.tick(1);
      const current = grid.brightness[cell] ?? 0;
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
    expect(previous).toBe(0);
  });

  it("keeps a trail roughly as long as requested", () => {
    const { grid, rain } = quietRain(1, 40);
    rain.addStream(0, { row: 0, speed: 1, trail: 6 });
    for (let i = 0; i < 20; i++) rain.tick(1);
    const lit = Array.from(grid.brightness).filter((b) => b > 0).length;
    expect(lit).toBeGreaterThanOrEqual(5);
    expect(lit).toBeLessThanOrEqual(7);
  });

  it("removes a stream once it has fallen off the bottom", () => {
    const { rain } = quietRain(1, 5);
    rain.addStream(0, { row: 0, speed: 1, trail: 2 });
    for (let i = 0; i < 20; i++) rain.tick(1);
    expect(rain.streamCount()).toBe(0);
  });

  it("never writes outside the grid, even with fast streams and fractional ticks", () => {
    const grid = new Grid(7, 9);
    const rain = new Rain(grid, seededRandom(5), { minSpeed: 30, maxSpeed: 60 });
    for (let i = 0; i < 2000; i++) rain.tick(1 / 60 + (i % 3) * 0.01);
    for (let i = 0; i < grid.brightness.length; i++) {
      const b = grid.brightness[i] ?? NaN;
      expect(Number.isFinite(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });

  it("spawns streams on its own so every column eventually rains", () => {
    const grid = new Grid(12, 30);
    const rain = new Rain(grid, seededRandom(11));
    const litColumns = new Set<number>();
    for (let i = 0; i < 600; i++) {
      rain.tick(1 / 60);
      for (let col = 0; col < grid.cols; col++) {
        if ((grid.brightness[grid.index(col, 0)] ?? 0) > 0) litColumns.add(col);
      }
    }
    expect(rain.streamCount()).toBeGreaterThan(0);
    expect(litColumns.size).toBe(grid.cols);
  });

  it("mutates glyphs in place without moving them", () => {
    const grid = new Grid(1, 30);
    const rain = new Rain(grid, seededRandom(2), {
      spawnRate: 0,
      mutationRate: 50,
      minSpeed: 1,
      maxSpeed: 1,
    });
    rain.addStream(0, { row: 0, speed: 0, trail: 30 });
    const cell = grid.index(0, 0);
    const before = grid.glyph[cell];
    let changed = false;
    for (let i = 0; i < 60 && !changed; i++) {
      rain.tick(1 / 60);
      changed = grid.glyph[cell] !== before;
    }
    expect(changed).toBe(true);
    expect(grid.isHead[cell]).toBe(1);
  });

  it("is deterministic for the same seed", () => {
    const a = new Grid(20, 20);
    const b = new Grid(20, 20);
    const rainA = new Rain(a, seededRandom(99));
    const rainB = new Rain(b, seededRandom(99));
    for (let i = 0; i < 300; i++) {
      rainA.tick(1 / 60);
      rainB.tick(1 / 60);
    }
    expect(Array.from(a.brightness)).toEqual(Array.from(b.brightness));
    expect(Array.from(a.glyph)).toEqual(Array.from(b.glyph));
  });

  it("ticks a 240x135 grid 60 times quickly", () => {
    const grid = new Grid(240, 135);
    const rain = new Rain(grid, seededRandom(1));
    for (let i = 0; i < 120; i++) rain.tick(1 / 60); // warm up
    const start = performance.now();
    for (let i = 0; i < 60; i++) rain.tick(1 / 60);
    const elapsed = performance.now() - start;
    console.log(`rain: 60 ticks of 240x135 in ${elapsed.toFixed(2)} ms`);
    expect(elapsed).toBeLessThan(50);
  });
});
