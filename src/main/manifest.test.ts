import { describe, expect, it } from "vitest";
import { parseManifest } from "./manifest.js";

describe("parseManifest", () => {
  it("returns the listed clip files", () => {
    const text = JSON.stringify({ clips: [{ file: "neo.webm" }, { file: "trinity.webm" }] });
    expect(parseManifest(text)).toEqual(["neo.webm", "trinity.webm"]);
  });

  it("returns nothing for a missing or malformed manifest", () => {
    expect(parseManifest(undefined)).toEqual([]);
    expect(parseManifest("nope")).toEqual([]);
    expect(parseManifest(JSON.stringify({ clips: "neo.webm" }))).toEqual([]);
  });

  it("skips entries without a string file name and any path that escapes the folder", () => {
    const text = JSON.stringify({
      clips: [{ file: 1 }, { file: "../etc/passwd" }, { file: "/abs.webm" }, { file: "ok.webm" }],
    });
    expect(parseManifest(text)).toEqual(["ok.webm"]);
  });
});
