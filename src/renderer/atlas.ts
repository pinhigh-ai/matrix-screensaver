/**
 * Glyph atlas: every glyph pre-rendered once at each brightness level, plus
 * a head row in the near-white the film uses for the leading character.
 * Per frame the draw loop then only blits cells from this sheet.
 *
 * The layout maths is pure and tested; `renderAtlas` is the one function
 * that touches a canvas.
 */
import { GLYPHS } from "./glyphs.js";

/** Brightness levels in the trail. The head is one extra row above these. */
export const LEVELS = 16;
export const HEAD_LEVEL = LEVELS;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasLayout {
  width: number;
  height: number;
  cell: number;
  rect(glyphIndex: number, level: number): Rect;
}

/** Quantise brightness 0..1 to a level, or -1 for a dark cell that is not drawn. */
export function levelFor(brightness: number): number {
  if (brightness <= 0) return -1;
  if (brightness >= 1) return LEVELS - 1;
  return Math.floor(brightness * LEVELS);
}

/** One row per level, one column per glyph. */
export function atlasLayout(glyphCount: number, cell: number): AtlasLayout {
  return {
    width: glyphCount * cell,
    height: (LEVELS + 1) * cell,
    cell,
    rect: (glyphIndex, level) => ({ x: glyphIndex * cell, y: level * cell, w: cell, h: cell }),
  };
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Trail colour per level: dim green at the tail up to the film's bright green. */
export function trailColor(level: number): Rgb {
  const t = (level + 1) / LEVELS;
  const eased = Math.pow(t, 1.4);
  return {
    r: Math.round(12 * eased),
    g: Math.round(60 + 195 * eased),
    b: Math.round(20 + 45 * eased),
  };
}

export const HEAD_COLOR: Rgb = { r: 220, g: 255, b: 230 };

const FONT_STACK =
  '"Osaka-Mono", "Osaka", "Hiragino Kaku Gothic ProN", "MS Gothic", "Noto Sans Mono CJK JP", "Noto Sans CJK JP", monospace';

/**
 * Draw every glyph into `ctx` following `layout`. Glyphs are mirrored
 * horizontally as in the film. `scale` is the device pixel ratio.
 */
export function renderAtlas(
  ctx: CanvasRenderingContext2D,
  layout: AtlasLayout,
  scale: number,
): void {
  const cell = layout.cell;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.font = `${Math.round(cell * 0.85)}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let level = 0; level <= HEAD_LEVEL; level++) {
    const c = level === HEAD_LEVEL ? HEAD_COLOR : trailColor(level);
    ctx.fillStyle = `rgb(${c.r} ${c.g} ${c.b})`;
    if (level === HEAD_LEVEL) {
      ctx.shadowColor = "rgba(180, 255, 200, 0.9)";
      ctx.shadowBlur = cell * 0.35;
    } else {
      ctx.shadowBlur = 0;
    }
    for (let g = 0; g < GLYPHS.length; g++) {
      const r = layout.rect(g, level);
      ctx.save();
      // Mirror: translate to the cell's right edge and flip x.
      ctx.translate(r.x + r.w, r.y);
      ctx.scale(-1, 1);
      ctx.fillText(GLYPHS[g] ?? "", r.w / 2, r.h / 2 + 1);
      ctx.restore();
    }
  }
  ctx.restore();
}
