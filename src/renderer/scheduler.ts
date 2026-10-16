/**
 * Decides when a movie scene plays and how strongly it shows.
 *
 *   waiting  --interval elapsed-->  requested  --begin(duration)-->  playing
 *      ^                                |                               |
 *      +-------- abort() ---------------+                               |
 *      +------------------------ clip finished ------------------------+
 *
 * The scheduler never touches the video element; the caller asks `tick`
 * for a clip to load, calls `begin` once the clip's duration is known, and
 * reads `envelope` every frame to scale the scene into the rain.
 */
import type { Rng } from "./random.js";

export type Phase = "waiting" | "requested" | "playing";

export interface SchedulerOptions {
  /** Random wait between scenes, [min, max] seconds. */
  intervalSeconds: [number, number];
  /** Fade in and fade out length in seconds. */
  fadeSeconds: number;
}

/** 0 at the start and end of a clip, 1 in between, linear through the fades. */
export function envelope(t: number, duration: number, fade: number): number {
  if (t <= 0 || t >= duration) return 0;
  const safeFade = Math.max(1e-6, Math.min(fade, duration / 2));
  const rise = t / safeFade;
  const fall = (duration - t) / safeFade;
  return Math.max(0, Math.min(1, rise, fall));
}

export class SceneScheduler {
  private readonly clips: readonly string[];
  private readonly rng: Rng;
  private readonly options: SchedulerOptions;
  private state: Phase = "waiting";
  private remaining: number;
  private elapsed = 0;
  private duration = 0;
  private lastIndex = -1;

  constructor(clips: readonly string[], rng: Rng, options: SchedulerOptions) {
    this.clips = clips;
    this.rng = rng;
    this.options = options;
    this.remaining = this.nextInterval();
  }

  phase(): Phase {
    return this.state;
  }

  /** Current scene strength, 0..1. */
  envelope(): number {
    if (this.state !== "playing") return 0;
    return envelope(this.elapsed, this.duration, this.options.fadeSeconds);
  }

  /**
   * Advance by dt seconds. Returns the clip to load when the wait is over,
   * otherwise undefined.
   */
  tick(dt: number): string | undefined {
    switch (this.state) {
      case "waiting": {
        if (this.clips.length === 0) return undefined;
        this.remaining -= dt;
        if (this.remaining > 0) return undefined;
        this.state = "requested";
        return this.pick();
      }
      case "playing": {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) this.reset();
        return undefined;
      }
      default:
        return undefined;
    }
  }

  /** The requested clip is ready and runs for `duration` seconds. */
  begin(duration: number): void {
    if (this.state !== "requested") return;
    this.state = "playing";
    this.elapsed = 0;
    this.duration = Math.max(0, duration);
  }

  /** The requested clip could not be loaded; wait again. */
  abort(): void {
    this.reset();
  }

  private reset(): void {
    this.state = "waiting";
    this.elapsed = 0;
    this.duration = 0;
    this.remaining = this.nextInterval();
  }

  private nextInterval(): number {
    const [min, max] = this.options.intervalSeconds;
    return this.rng.range(min, max);
  }

  private pick(): string {
    const n = this.clips.length;
    let index = this.rng.int(0, n);
    if (n > 1 && index === this.lastIndex) index = (index + 1 + this.rng.int(0, n - 1)) % n;
    this.lastIndex = index;
    return this.clips[index] ?? "";
  }
}
