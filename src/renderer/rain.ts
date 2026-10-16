/**
 * Digital rain simulation over a Grid. Pure logic: no DOM, no timers.
 *
 * Each column owns a few streams. A stream has a head that falls at a
 * constant speed; every cell the head crosses gets a fresh glyph at full
 * brightness and a per-cell fade rate, so the trail behind the head decays on
 * its own and its length is speed divided by fade. Lit glyphs also mutate in
 * place now and then, which is the flicker the film's rain has.
 */
import { Grid } from "./grid.js";
import { GLYPHS, randomGlyphIndex } from "./glyphs.js";
import type { Rng } from "./random.js";

export interface RainOptions {
  /** Chance per column per second that a new stream starts when there is room. */
  spawnRate: number;
  /** Expected glyph changes per lit cell per second. */
  mutationRate: number;
  /** Head speed range in cells per second. */
  minSpeed: number;
  maxSpeed: number;
  /** Trail length range in cells. */
  minTrail: number;
  maxTrail: number;
  /** Streams allowed in one column at once. */
  maxStreamsPerColumn: number;
  /** Rows a stream must have fallen before another may start above it. */
  spawnGap: number;
}

export const DEFAULT_RAIN_OPTIONS: Readonly<RainOptions> = Object.freeze({
  spawnRate: 0.6,
  mutationRate: 0.3,
  minSpeed: 6,
  maxSpeed: 18,
  minTrail: 8,
  maxTrail: 32,
  maxStreamsPerColumn: 2,
  spawnGap: 6,
});

export interface StreamSpec {
  /** Row the head starts on. */
  row: number;
  /** Cells per second. */
  speed: number;
  /** Trail length in cells. */
  trail: number;
}

interface Stream {
  col: number;
  /** Continuous head position in rows. */
  pos: number;
  /** Last integer row the head wrote. */
  lastRow: number;
  speed: number;
  /** Brightness lost per second by cells this stream writes. */
  fade: number;
  trail: number;
}

export class Rain {
  private readonly grid: Grid;
  private readonly rng: Rng;
  private readonly options: RainOptions;
  private readonly columns: Stream[][];
  private readonly headCells: number[] = [];

  constructor(grid: Grid, rng: Rng, options: Partial<RainOptions> = {}) {
    this.grid = grid;
    this.rng = rng;
    this.options = { ...DEFAULT_RAIN_OPTIONS, ...options };
    this.columns = Array.from({ length: grid.cols }, () => []);
  }

  /** Start a stream by hand. The head cell is written immediately. */
  addStream(col: number, spec: StreamSpec): void {
    const fade = spec.trail > 0 ? spec.speed / spec.trail : 0;
    const stream: Stream = {
      col,
      pos: spec.row,
      lastRow: spec.row - 1,
      speed: spec.speed,
      fade,
      trail: spec.trail,
    };
    this.columns[col]?.push(stream);
    this.writeHead(stream, spec.row);
  }

  streamCount(): number {
    let n = 0;
    for (const column of this.columns) n += column.length;
    return n;
  }

  /** Advance the simulation by dt seconds. */
  tick(dt: number): void {
    this.decay(dt);
    this.clearHeads();
    this.advance(dt);
    this.spawn(dt);
    this.mutate(dt);
  }

  private decay(dt: number): void {
    const { brightness, fade } = this.grid;
    for (let i = 0; i < brightness.length; i++) {
      const b = brightness[i] ?? 0;
      if (b > 0) {
        const next = b - (fade[i] ?? 0) * dt;
        brightness[i] = next > 0 ? next : 0;
      }
    }
  }

  private clearHeads(): void {
    for (const cell of this.headCells) this.grid.isHead[cell] = 0;
    this.headCells.length = 0;
  }

  private advance(dt: number): void {
    const { rows } = this.grid;
    for (const column of this.columns) {
      for (let s = column.length - 1; s >= 0; s--) {
        const stream = column[s];
        if (!stream) continue;
        stream.pos += stream.speed * dt;
        const target = Math.floor(stream.pos);
        if (target >= rows) {
          column.splice(s, 1);
          continue;
        }
        for (let row = stream.lastRow + 1; row < target; row++) {
          if (row >= 0) this.writeCell(stream, row);
        }
        if (target >= 0) {
          if (target > stream.lastRow) this.writeCell(stream, target);
          this.markHead(stream, target);
        }
        stream.lastRow = Math.max(stream.lastRow, target);
      }
    }
  }

  private writeHead(stream: Stream, row: number): void {
    if (row < 0 || row >= this.grid.rows) return;
    this.writeCell(stream, row);
    this.markHead(stream, row);
  }

  private writeCell(stream: Stream, row: number): void {
    const cell = this.grid.index(stream.col, row);
    this.grid.glyph[cell] = randomGlyphIndex(this.rng);
    this.grid.brightness[cell] = 1;
    this.grid.fade[cell] = stream.fade;
  }

  private markHead(stream: Stream, row: number): void {
    const cell = this.grid.index(stream.col, row);
    this.grid.isHead[cell] = 1;
    this.headCells.push(cell);
  }

  private spawn(dt: number): void {
    const o = this.options;
    if (o.spawnRate <= 0) return;
    const chance = o.spawnRate * dt;
    for (let col = 0; col < this.columns.length; col++) {
      const column = this.columns[col];
      if (!column || column.length >= o.maxStreamsPerColumn) continue;
      const newest = column[column.length - 1];
      if (newest && newest.pos < o.spawnGap) continue;
      if (this.rng.next() < chance) {
        this.addStream(col, {
          row: 0,
          speed: this.rng.range(o.minSpeed, o.maxSpeed),
          trail: this.rng.int(o.minTrail, o.maxTrail + 1),
        });
      }
    }
  }

  /**
   * Change the glyph of a few lit cells. Rather than rolling a die per cell,
   * draw the expected number of mutations and pick cells at random; dark
   * cells picked by chance are skipped.
   */
  private mutate(dt: number): void {
    const rate = this.options.mutationRate;
    if (rate <= 0) return;
    const { brightness, glyph } = this.grid;
    const n = brightness.length;
    const expected = n * rate * dt;
    let count = Math.floor(expected);
    if (this.rng.next() < expected - count) count++;
    for (let i = 0; i < count; i++) {
      const cell = this.rng.int(0, n);
      if ((brightness[cell] ?? 0) <= 0) continue;
      const current = glyph[cell] ?? 0;
      let next = randomGlyphIndex(this.rng);
      if (next === current) next = (next + 1) % GLYPHS.length;
      glyph[cell] = next;
    }
  }
}
