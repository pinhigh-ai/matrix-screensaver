import { describe, expect, it } from "vitest";
import { seededRandom } from "./random.js";
import { envelope, SceneScheduler } from "./scheduler.js";

describe("envelope", () => {
  const fade = 2;
  const duration = 10;

  it("is 0 at the start and end and 1 in the middle", () => {
    expect(envelope(0, duration, fade)).toBe(0);
    expect(envelope(duration, duration, fade)).toBe(0);
    expect(envelope(5, duration, fade)).toBe(1);
  });

  it("ramps linearly through the fades", () => {
    expect(envelope(1, duration, fade)).toBeCloseTo(0.5, 5);
    expect(envelope(9, duration, fade)).toBeCloseTo(0.5, 5);
  });

  it("fades in and then stays at 1 for an endless scene", () => {
    expect(envelope(1, Infinity, fade)).toBeCloseTo(0.5, 5);
    expect(envelope(5000, Infinity, fade)).toBe(1);
  });

  it("never exceeds 1 even when the clip is shorter than two fades", () => {
    for (let t = 0; t <= 3; t += 0.25) {
      const e = envelope(t, 3, fade);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });
});

describe("SceneScheduler", () => {
  const clips = ["a", "b", "c"];

  function make(seed = 1): SceneScheduler {
    return new SceneScheduler(clips, seededRandom(seed), {
      intervalSeconds: [30, 60],
      fadeSeconds: 2,
    });
  }

  it("starts waiting and asks for a clip only after the interval", () => {
    const s = make();
    expect(s.phase()).toBe("waiting");
    expect(s.tick(29)).toBeUndefined();
    const request = s.tick(31);
    expect(request).toBeDefined();
    expect(clips).toContain(request);
  });

  it("waits between the configured min and max", () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = make(seed);
      let elapsed = 0;
      while (s.tick(0.5) === undefined) {
        elapsed += 0.5;
        if (elapsed > 61) break;
      }
      expect(elapsed).toBeGreaterThanOrEqual(29.5);
      expect(elapsed).toBeLessThanOrEqual(60.5);
    }
  });

  it("never picks the same clip twice in a row", () => {
    const s = make(5);
    let previous: string | undefined;
    for (let i = 0; i < 40; i++) {
      let request: string | undefined;
      while ((request = s.tick(1)) === undefined) {
        // keep waiting
      }
      expect(request).not.toBe(previous);
      previous = request;
      s.begin(10);
      for (let t = 0; t < 10; t += 1) s.tick(1);
      expect(s.phase()).toBe("waiting");
    }
  });

  it("reports the envelope while playing and returns to waiting afterwards", () => {
    const s = make();
    while (s.tick(1) === undefined) {
      // wait for the request
    }
    expect(s.phase()).toBe("requested");
    s.begin(10);
    expect(s.phase()).toBe("playing");
    expect(s.envelope()).toBe(0);
    s.tick(5);
    expect(s.envelope()).toBe(1);
    s.tick(5);
    expect(s.phase()).toBe("waiting");
    expect(s.envelope()).toBe(0);
  });

  it("keeps playing an endless scene", () => {
    const s = make();
    while (s.tick(1) === undefined) {
      // wait
    }
    s.begin(Infinity);
    for (let i = 0; i < 10000; i++) s.tick(1);
    expect(s.phase()).toBe("playing");
    expect(s.envelope()).toBe(1);
  });

  it("goes back to waiting when a requested clip fails to load", () => {
    const s = make();
    while (s.tick(1) === undefined) {
      // wait
    }
    s.abort();
    expect(s.phase()).toBe("waiting");
  });

  it("does nothing with no clips", () => {
    const s = new SceneScheduler([], seededRandom(1), {
      intervalSeconds: [1, 2],
      fadeSeconds: 1,
    });
    for (let i = 0; i < 100; i++) expect(s.tick(1)).toBeUndefined();
    expect(s.phase()).toBe("waiting");
  });
});
