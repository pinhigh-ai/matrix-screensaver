/**
 * Plays a clip in a hidden <video> and samples each frame down to one
 * luminance value per grid cell. The only DOM-dependent part of the scene
 * layer; everything it feeds is pure and tested elsewhere.
 */
import { DEFAULT_SHAPE, luminanceFromRgba, shapeLuminance, type Shape } from "./luminance.js";

export class ClipPlayer {
  private readonly video: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly shape: Shape;
  private cols = 0;
  private rows = 0;

  constructor(shape: Shape = DEFAULT_SHAPE) {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = "auto";
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("clip-player: 2D context unavailable");
    this.ctx = ctx;
    this.shape = shape;
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
   * Sample the current frame into `out` (one value per cell, row-major).
   * The frame is letterboxed to keep its aspect ratio; bars sample as black.
   */
  sample(out: Float32Array): void {
    const { cols, rows, video, ctx } = this;
    if (cols === 0 || rows === 0 || video.readyState < 2) return;
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    // Cells are square on screen, so the grid's aspect is cols:rows.
    const scale = Math.min(cols / vw, rows / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cols, rows);
    ctx.drawImage(video, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
    const data = ctx.getImageData(0, 0, cols, rows).data;
    luminanceFromRgba(data, out);
    for (let i = 0; i < out.length; i++) out[i] = shapeLuminance(out[i] ?? 0, this.shape);
  }
}
