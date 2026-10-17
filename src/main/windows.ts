/**
 * Which rectangles the saver should cover: one per display, skipping any
 * display that mirrors another (same bounds), since one window serves both.
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayLike {
  bounds: Bounds;
}

export function saverBounds(displays: readonly DisplayLike[]): Bounds[] {
  const seen = new Set<string>();
  const out: Bounds[] = [];
  for (const { bounds } of displays) {
    const key = `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...bounds });
  }
  return out;
}
