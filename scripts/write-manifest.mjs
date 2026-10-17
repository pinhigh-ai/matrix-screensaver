#!/usr/bin/env node
// Rewrite clips/manifest.json from the video files in the clips folder.
// Usage: node scripts/write-manifest.mjs [clipsDir]
// Needs `npm run build:main` first; the logic lives in src/main/manifest.ts
// so it is unit-tested with the rest of the app.
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest } from "../dist/main/manifest.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.resolve(process.argv[2] ?? path.join(root, "clips"));
const files = await readdir(dir);
const text = buildManifest(files);
await writeFile(path.join(dir, "manifest.json"), text);
console.log(`manifest: ${JSON.parse(text).clips.length} clip(s) in ${dir}`);
