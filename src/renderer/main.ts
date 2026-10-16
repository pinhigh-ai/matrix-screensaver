/**
 * Renderer entry point: builds the grid and atlas for the window size, runs
 * the rain simulation and blits it every animation frame.
 *
 * Settings arrive on the query string from the main process
 * (`?cellSize=18&fps=1`) because the renderer is sandboxed with no Node access.
 */
import { atlasLayout, renderAtlas, type AtlasLayout } from "./atlas.js";
import { drawGrid } from "./draw.js";
import { GLYPHS } from "./glyphs.js";
import { Grid, gridSize } from "./grid.js";
import { Rain } from "./rain.js";
import { seededRandom } from "./random.js";

const params = new URLSearchParams(window.location.search);
const cellSize = Math.max(6, Number(params.get("cellSize")) || 18);
const reportFps = params.get("fps") === "1";

const canvas = document.getElementById("rain") as HTMLCanvasElement | null;
if (!canvas) throw new Error("renderer: #rain canvas missing from index.html");
const ctx = canvas.getContext("2d", { alpha: false });
if (!ctx) throw new Error("renderer: 2D context unavailable");

interface Scene {
  grid: Grid;
  rain: Rain;
  atlas: HTMLCanvasElement;
  layout: AtlasLayout;
  dpr: number;
}

let scene: Scene | undefined;

function setup(): Scene {
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
  const rain = new Rain(grid, seededRandom(Date.now() >>> 0));

  const layout = atlasLayout(GLYPHS.length, cellSize);
  const atlas = document.createElement("canvas");
  atlas.width = Math.ceil(layout.width * dpr);
  atlas.height = Math.ceil(layout.height * dpr);
  const atlasCtx = atlas.getContext("2d");
  if (!atlasCtx) throw new Error("renderer: atlas context unavailable");
  renderAtlas(atlasCtx, layout, dpr);

  return { grid, rain, atlas, layout, dpr };
}

let last = performance.now();
let frames = 0;
let fpsWindowStart = last;

function frame(now: number): void {
  if (!scene || !ctx) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  scene.rain.tick(dt);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  const { atlas, dpr, layout, grid } = scene;
  drawGrid(grid, layout, cellSize, (src, dx, dy) => {
    ctx.drawImage(atlas, src.x * dpr, src.y * dpr, src.w * dpr, src.h * dpr, dx, dy, src.w, src.h);
  });

  if (reportFps) {
    frames++;
    if (now - fpsWindowStart >= 2000) {
      const fps = (frames * 1000) / (now - fpsWindowStart);
      console.log(`fps ${fps.toFixed(1)} grid ${grid.cols}x${grid.rows}`);
      frames = 0;
      fpsWindowStart = now;
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  scene = setup();
});

scene = setup();
requestAnimationFrame(frame);
