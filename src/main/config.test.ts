import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, parseConfig } from "./config.js";

describe("parseConfig", () => {
  it("returns the defaults for an empty document", () => {
    expect(parseConfig("{}")).toEqual(DEFAULT_CONFIG);
  });

  it("returns the defaults when the file is missing", () => {
    expect(parseConfig(undefined)).toEqual(DEFAULT_CONFIG);
  });

  it("overrides only the keys that are present", () => {
    const config = parseConfig(JSON.stringify({ idleMinutes: 2 }));
    expect(config.idleMinutes).toBe(2);
    expect(config.cellSize).toBe(DEFAULT_CONFIG.cellSize);
  });

  it("ignores values of the wrong type", () => {
    const config = parseConfig(JSON.stringify({ idleMinutes: "soon", cellSize: null }));
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("falls back to the defaults on malformed JSON", () => {
    expect(parseConfig("{ not json")).toEqual(DEFAULT_CONFIG);
  });

  it("accepts the scene fit and loop options and rejects bad values", () => {
    expect(
      parseConfig(JSON.stringify({ sceneFit: "contain", sceneLoop: true, sceneInvert: true })),
    ).toMatchObject({ sceneFit: "contain", sceneLoop: true, sceneInvert: true });
    expect(parseConfig(JSON.stringify({ sceneFit: "stretch", sceneLoop: "yes" }))).toMatchObject({
      sceneFit: "cover",
      sceneLoop: false,
    });
  });

  it("keeps the scene interval ordered", () => {
    const config = parseConfig(JSON.stringify({ sceneIntervalSeconds: [120, 30] }));
    expect(config.sceneIntervalSeconds).toEqual([30, 120]);
  });
});
