/**
 * User configuration: a JSON file in the per-user config directory.
 * Every key is optional; anything missing, malformed or of the wrong type
 * falls back to the default so a bad config never stops the saver.
 */
export interface Config {
  /** Idle time before the saver starts. */
  idleMinutes: number;
  /** Glyph cell size in CSS pixels. */
  cellSize: number;
  /** Random wait between movie scenes, [min, max] seconds. */
  sceneIntervalSeconds: [number, number];
  /** Fade in and fade out duration for each scene, seconds. */
  sceneFadeSeconds: number;
  /** Folder of prepared clips. Empty means the app's own clips/ folder. */
  clipsDir: string;
}

export const DEFAULT_CONFIG: Readonly<Config> = Object.freeze({
  idleMinutes: 5,
  cellSize: 18,
  sceneIntervalSeconds: [45, 120] as [number, number],
  sceneFadeSeconds: 2,
  clipsDir: "",
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);
}

/**
 * Parse the raw text of config.json. `undefined` means the file does not exist.
 */
export function parseConfig(text: string | undefined): Config {
  const result: Config = { ...DEFAULT_CONFIG };
  if (text === undefined) return result;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return result;
  }
  if (typeof raw !== "object" || raw === null) return result;
  const doc = raw as Record<string, unknown>;

  if (isFiniteNumber(doc.idleMinutes) && doc.idleMinutes > 0) result.idleMinutes = doc.idleMinutes;
  if (isFiniteNumber(doc.cellSize) && doc.cellSize > 0) result.cellSize = doc.cellSize;
  if (isFiniteNumber(doc.sceneFadeSeconds) && doc.sceneFadeSeconds >= 0) {
    result.sceneFadeSeconds = doc.sceneFadeSeconds;
  }
  if (isPair(doc.sceneIntervalSeconds)) {
    const [a, b] = doc.sceneIntervalSeconds;
    result.sceneIntervalSeconds = a <= b ? [a, b] : [b, a];
  }
  if (typeof doc.clipsDir === "string") result.clipsDir = doc.clipsDir;

  return result;
}
