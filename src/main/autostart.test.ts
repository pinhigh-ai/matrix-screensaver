import { describe, expect, it } from "vitest";
import { desktopEntry, launchAgentPlist } from "./autostart.js";

describe("desktopEntry", () => {
  const text = desktopEntry("/opt/Matrix Screensaver/matrix-screensaver");

  it("is a valid XDG autostart entry that runs the executable", () => {
    expect(text.startsWith("[Desktop Entry]\n")).toBe(true);
    expect(text).toContain("Type=Application\n");
    expect(text).toContain('Exec="/opt/Matrix Screensaver/matrix-screensaver"\n');
    expect(text).toContain("X-GNOME-Autostart-enabled=true\n");
    expect(text.endsWith("\n")).toBe(true);
  });
});

describe("launchAgentPlist", () => {
  const text = launchAgentPlist(
    "/Applications/Matrix Screensaver.app/Contents/MacOS/Matrix Screensaver",
  );

  it("runs the executable at load and names the app id", () => {
    expect(text).toContain("<key>Label</key>");
    expect(text).toContain("<string>ai.pinhigh.matrix-screensaver</string>");
    expect(text).toContain("<key>RunAtLoad</key>");
    expect(text).toContain(
      "<string>/Applications/Matrix Screensaver.app/Contents/MacOS/Matrix Screensaver</string>",
    );
  });

  it("escapes XML special characters in the path", () => {
    expect(launchAgentPlist("/tmp/a&b")).toContain("<string>/tmp/a&amp;b</string>");
  });
});
