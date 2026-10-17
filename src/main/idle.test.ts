import { describe, expect, it } from "vitest";
import { IdleMachine } from "./idle.js";

describe("IdleMachine", () => {
  const threshold = 300; // seconds

  it("starts watching and shows once idle reaches the threshold", () => {
    const m = new IdleMachine(threshold);
    expect(m.state).toBe("watching");
    expect(m.observe(299)).toBeUndefined();
    expect(m.observe(300)).toBe("show");
    expect(m.state).toBe("showing");
  });

  it("never re-triggers while showing, whatever the idle time does", () => {
    const m = new IdleMachine(threshold);
    m.observe(1000);
    expect(m.observe(0)).toBeUndefined();
    expect(m.observe(5000)).toBeUndefined();
    expect(m.state).toBe("showing");
  });

  it("returns to watching on input and reports hide", () => {
    const m = new IdleMachine(threshold);
    m.observe(1000);
    expect(m.input()).toBe("hide");
    expect(m.state).toBe("watching");
  });

  it("ignores input while already watching", () => {
    const m = new IdleMachine(threshold);
    expect(m.input()).toBeUndefined();
    expect(m.state).toBe("watching");
  });

  it("re-arms only after idle time has dropped below the threshold", () => {
    const m = new IdleMachine(threshold);
    m.observe(1000);
    m.input();
    // A stale reading above the threshold must not immediately show again.
    expect(m.observe(1000)).toBeUndefined();
    expect(m.observe(3)).toBeUndefined();
    expect(m.observe(300)).toBe("show");
  });

  it("can be shown on demand and then dismissed like any other showing", () => {
    const m = new IdleMachine(threshold);
    expect(m.show()).toBe("show");
    expect(m.show()).toBeUndefined();
    expect(m.input()).toBe("hide");
  });
});
