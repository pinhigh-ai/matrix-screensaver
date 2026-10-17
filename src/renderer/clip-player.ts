/**
 * Plays a clip in a hidden <video> and samples each frame down to one
 * luminance value per grid cell. The only DOM-dependent part of the scene
 * layer; everything it feeds is pure and tested elsewhere.
 */
import { fitRect, type FitMode } from "./fit.js";
import { autoLevels, luminanceFromRgba, shapeLuminance, type Shape } from "./luminance.js";

export interface ClipPlayerOptions {
  fit: FitMode;
  loop: boolean;
  /** Swap dark and light so a dark subject on a bright background shows as rain. */
  invert: boolean;
  /** Percentiles mapped to black and white by auto-levels. */
  levels: [number, number];
  shape: Shape;
}

export const DEFAULT_PLAYER: Readonly<ClipPlayerOptions> = Object.freeze({
  fit: "cover" as const,
  loop: false,
  invert: false,
  levels: [0.03, 0.97] as [number, number],
  // Floor and gamma chosen on real footage: crush the midtones so only the
  // subject lights up, otherwise a textured floor fills every cell.
  shape: { floor: 0.25, gamma: 2.0 },
});

export class ClipPlayer {
  private readonly video: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: ClipPlayerOptions;
  private cols = 0;
  private rows = 0;

  constructor(options: Partial<ClipPlayerOptions> = {}) {
    this.options = { ...DEFAULT_PLAYER, ...options };
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = "auto";
    this.video.loop = this.options.loop;
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("clip-player: 2D context unavailable");
    this.ctx = ctx;
  }

  /** Size the sampling surface to the grid. */
  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.canvas.width = cols;
    this.canvas.height = rows;
  }

  /** Load and start a clip. Resolves with its duration in seconds. */
  async play(url: string): Promise<number> {
    const video = this.video;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const onReady = (): void => {
        cleanup();
        resolve();
      };
      const onError = (): void => {
        cleanup();
        reject(new Error(`clip-player: cannot load ${url}`));
      };
      const cleanup = (): void => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("error", onError);
      video.load();
    });
    await video.play();
    return Number.isFinite(video.duration) ? video.duration : 0;
  }

  stop(): void {
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
  }

  /**
   * Sample the current frame into `out` (one value per cell, row-major):
   * fit the frame to the grid (cells are square, so the grid's aspect is
   * cols:rows), take luminance, stretch the levels, then shape.
   */
  sample(out: Float32Array): void {
    const { cols, rows, video, ctx } = this;
    if (cols === 0 || rows === 0 || video.readyState < 2) return;
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const r = fitRect(vw, vh, cols, rows, this.options.fit);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cols, rows);
    ctx.drawImage(video, r.x, r.y, r.w, r.h);
    const data = ctx.getImageData(0, 0, cols, rows).data;
    luminanceFromRgba(data, out);
    const [low, high] = this.options.levels;
    autoLevels(out, low, high);
    const shape = this.options.shape;
    const invert = this.options.invert;
    for (let i = 0; i < out.length; i++) {
      const v = out[i] ?? 0;
      out[i] = shapeLuminance(invert ? 1 - v : v, shape);
    }
  }
}
