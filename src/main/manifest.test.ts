import { describe, expect, it } from "vitest";
import { buildManifest, parseManifest } from "./manifest.js";

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

describe("buildManifest", () => {
  it("lists only video files, sorted, as manifest JSON", () => {
    const text = buildManifest(["z.webm", "notes.txt", "a.webm", "b.mp4", ".DS_Store", "raw"]);
    expect(JSON.parse(text)).toEqual({
      clips: [{ file: "a.webm" }, { file: "b.mp4" }, { file: "z.webm" }],
    });
  });

  it("round-trips through parseManifest", () => {
    expect(parseManifest(buildManifest(["one.webm", "two.webm"]))).toEqual(["one.webm", "two.webm"]);
  });

  it("produces an empty list for no files", () => {
    expect(JSON.parse(buildManifest([]))).toEqual({ clips: [] });
  });
});
