/**
 * Renderer entry point: builds the grid and atlas for the window size, runs
 * the rain simulation, blends in the current movie scene if one is playing,
 * and blits the result every animation frame.
 *
 * Settings arrive on the query string from the main process
 * (`?cellSize=18&sceneMin=45&sceneMax=120&sceneFade=2&fps=1`) because the
 * renderer is sandboxed with no Node access. The clip list comes through
 * the preload bridge on `window.matrix`.
 */
import { atlasLayout, renderAtlas, type AtlasLayout } from "./atlas.js";
import { ClipPlayer } from "./clip-player.js";
import { watchForInput } from "./dismiss.js";
import { compositeBrightness } from "./composite.js";
import { drawGrid } from "./draw.js";
import { GLYPHS } from "./glyphs.js";
import { Grid, gridSize } from "./grid.js";
import { Rain } from "./rain.js";
import { seededRandom } from "./random.js";
import { applyScene } from "./scene.js";
import { SceneScheduler } from "./scheduler.js";

const params = new URLSearchParams(window.location.search);
const num = (key: string, fallback: number): number => {
  const value = Number(params.get(key));
  return Number.isFinite(value) && params.has(key) ? value : fallback;
};
const cellSize = Math.max(6, num("cellSize", 18));
const sceneMin = Math.max(0, num("sceneMin", 45));
const sceneMax = Math.max(sceneMin, num("sceneMax", 120));
const sceneFade = Math.max(0, num("sceneFade", 2));
const reportFps = params.get("fps") === "1";
const sceneFit = params.get("sceneFit") === "contain" ? "contain" : "cover";
const sceneLoop = params.get("sceneLoop") === "1";
const sceneInvert = params.get("sceneInvert") === "1";
/** A looping scene is the whole show, so it starts almost at once. */
const sceneInterval: [number, number] = sceneLoop ? [1, 2] : [sceneMin, sceneMax];
const seed = num("seed", 1);
/** How much the rain dims while a scene is fully in: 0 none, 1 black. */
const SCENE_DIM = 0.75;

const canvas = document.getElementById("rain") as HTMLCanvasElement | null;
if (!canvas) throw new Error("renderer: #rain canvas missing from index.html");
const ctx = canvas.getContext("2d", { alpha: false });
if (!ctx) throw new Error("renderer: 2D context unavailable");

interface View {
  grid: Grid;
  rain: Rain;
  atlas: HTMLCanvasElement;
  layout: AtlasLayout;
  dpr: number;
  lum: Float32Array;
  shown: Float32Array;
}

const rng = seededRandom((Date.now() ^ (seed * 0x9e3779b1)) >>> 0);
const player = new ClipPlayer({ fit: sceneFit, loop: sceneLoop, invert: sceneInvert });
let scheduler = new SceneScheduler([], rng, {
  intervalSeconds: sceneInterval,
  fadeSeconds: sceneFade,
});
let view: View | undefined;

function setup(): View {
  if (!canvas || !ctx) throw new Error("renderer: canvas lost");
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const { cols, rows } = gridSize(width, height, cellSize);
  const grid = new Grid(cols, rows);
  const rain = new Rain(grid, rng);
  player.resize(cols, rows);

  const layout = atlasLayout(GLYPHS.length, cellSize);
  const atlas = document.createElement("canvas");
  atlas.width = Math.ceil(layout.width * dpr);
  atlas.height = Math.ceil(layout.height * dpr);
  const atlasCtx = atlas.getContext("2d");
  if (!atlasCtx) throw new Error("renderer: atlas context unavailable");
  renderAtlas(atlasCtx, layout, dpr);

  const n = cols * rows;
  return { grid, rain, atlas, layout, dpr, lum: new Float32Array(n), shown: new Float32Array(n) };
}

async function loadClips(): Promise<void> {
  const clips = (await window.matrix?.getClips()) ?? [];
  console.log(`clips: ${clips.length} available`);
  scheduler = new SceneScheduler(
    clips.map((c) => c.url),
    rng,
    { intervalSeconds: sceneInterval, fadeSeconds: sceneFade },
  );
}

function startScene(url: string): void {
  player
    .play(url)
    .then((duration) => {
      console.log(
        `scene: playing ${url} ${sceneLoop ? "on a loop" : `for ${duration.toFixed(1)} s`}`,
      );
      scheduler.begin(sceneLoop ? Infinity : duration);
    })
    .catch((error: unknown) => {
      console.error(String(error));
      scheduler.abort();
    });
}

let last = performance.now();
let frames = 0;
let fpsWindowStart = last;
let wasPlaying = false;

function frame(now: number): void {
  if (!view || !ctx) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  view.rain.tick(dt);

  const request = scheduler.tick(dt);
  if (request !== undefined) startScene(request);
  const playing = scheduler.phase() === "playing";
  const strength = scheduler.envelope();
  if (playing) {
    player.sample(view.lum);
    applyScene(view.grid, view.lum, strength, sceneFade, rng);
  } else if (wasPlaying) {
    player.stop();
  }
  wasPlaying = playing;
  compositeBrightness(view.grid.brightness, view.lum, strength, SCENE_DIM, view.shown);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  const { atlas, dpr, layout, grid } = view;
  drawGrid(
    grid,
    layout,
    cellSize,
    (src, dx, dy) => {
      ctx.drawImage(
        atlas,
        src.x * dpr,
        src.y * dpr,
        src.w * dpr,
        src.h * dpr,
        dx,
        dy,
        src.w,
        src.h,
      );
    },
    view.shown,
  );

  if (reportFps) {
    frames++;
    if (now - fpsWindowStart >= 2000) {
      const fps = (frames * 1000) / (now - fpsWindowStart);
      console.log(
        `fps ${fps.toFixed(1)} grid ${grid.cols}x${grid.rows} scene ${scheduler.phase()}`,
      );
      frames = 0;
      fpsWindowStart = now;
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  view = setup();
});

view = setup();
void loadClips();
watchForInput(window, () => window.matrix?.dismiss());
requestAnimationFrame(frame);
