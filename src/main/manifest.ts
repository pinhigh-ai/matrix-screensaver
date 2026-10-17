/**
 * clips/manifest.json lists the prepared clips:
 *
 *   { "clips": [ { "file": "neo-wakes.webm" }, ... ] }
 *
 * Written by scripts/prepare-clips.sh; read here on startup.
 */
import path from "node:path";

/** File names from the manifest text, or an empty list when unusable. */
export function parseManifest(text: string | undefined): string[] {
  if (text === undefined) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return [];
  }
  if (typeof raw !== "object" || raw === null) return [];
  const clips = (raw as { clips?: unknown }).clips;
  if (!Array.isArray(clips)) return [];
  const files: string[] = [];
  for (const entry of clips) {
    const file = (entry as { file?: unknown } | null)?.file;
    if (typeof file !== "string" || file === "") continue;
    if (path.isAbsolute(file) || file.split(/[\\/]/).includes("..")) continue;
    files.push(file);
  }
  return files;
}

const VIDEO_EXTENSIONS = new Set([".webm", ".mp4", ".mkv", ".mov", ".m4v"]);

/**
 * Manifest JSON for the given file names: video files only, sorted, so the
 * output is stable between runs. Used by scripts/write-manifest.mjs.
 */
export function buildManifest(files: readonly string[]): string {
  const clips = files
    .filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort()
    .map((file) => ({ file }));
  return `${JSON.stringify({ clips }, null, 2)}\n`;
}
