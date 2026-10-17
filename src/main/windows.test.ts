import { describe, expect, it } from "vitest";
import { saverBounds } from "./windows.js";

const main = { x: 0, y: 0, width: 1800, height: 1169 };
const second = { x: 1800, y: -300, width: 2560, height: 1440 };

describe("saverBounds", () => {
  it("returns one bounds per display, in order", () => {
    expect(saverBounds([{ bounds: main }, { bounds: second }])).toEqual([main, second]);
  });

  it("drops a mirrored display that has the same bounds as another", () => {
    expect(saverBounds([{ bounds: main }, { bounds: { ...main } }])).toEqual([main]);
  });

  it("returns nothing for no displays", () => {
    expect(saverBounds([])).toEqual([]);
  });
});
