/**
 * The cell grid shared by the rain simulation, the scene layer and the
 * draw loop. Typed arrays in row-major order keep per-frame work cheap.
 */
export interface GridDimensions {
  cols: number;
  rows: number;
}

/** Columns and rows needed to cover a screen, rounding up so no edge is bare. */
export function gridSize(widthPx: number, heightPx: number, cellSize: number): GridDimensions {
  return {
    cols: Math.max(1, Math.ceil(widthPx / cellSize)),
    rows: Math.max(1, Math.ceil(heightPx / cellSize)),
  };
}

export class Grid {
  readonly cols: number;
  readonly rows: number;
  /** Index into GLYPHS for each cell. */
  readonly glyph: Uint16Array;
  /** 0..1 brightness of the rain at each cell; 0 means dark. */
  readonly brightness: Float32Array;
  /** Brightness lost per second at each cell, set when a stream head writes it. */
  readonly fade: Float32Array;
  /** 1 where a stream head currently sits (drawn brighter and whiter). */
  readonly isHead: Uint8Array;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.glyph = new Uint16Array(n);
    this.brightness = new Float32Array(n);
    this.fade = new Float32Array(n);
    this.isHead = new Uint8Array(n);
  }

  index(col: number, row: number): number {
    return row * this.cols + col;
  }
}
