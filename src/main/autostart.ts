/**
 * Start at login.
 *
 * macOS: a LaunchAgent plist in ~/Library/LaunchAgents, which works for an
 * unsigned app where the Login Items API does not.
 * Linux: an XDG autostart entry in ~/.config/autostart, which GNOME honours.
 *
 * The text builders are pure and tested; `setAutostart` / `isAutostart`
 * touch the filesystem.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const APP_ID = "ai.pinhigh.matrix-screensaver";

export function desktopEntry(execPath: string): string {
  return [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Matrix Screensaver",
    "Comment=Digital rain screensaver with movie scenes inside the rain",
    `Exec="${execPath}"`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "",
  ].join("\n");
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function launchAgentPlist(execPath: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>Label</key>",
    `  <string>${APP_ID}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    `    <string>${escapeXml(execPath)}</string>`,
    "  </array>",
    "  <key>RunAtLoad</key>",
    "  <true/>",
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

/** Where the autostart file lives on this platform, or undefined if unsupported. */
export function autostartFile(platform: NodeJS.Platform = process.platform): string | undefined {
  const home = os.homedir();
  if (platform === "darwin") return path.join(home, "Library", "LaunchAgents", `${APP_ID}.plist`);
  if (platform === "linux") {
    const configHome = process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
    return path.join(configHome, "autostart", "matrix-screensaver.desktop");
  }
  return undefined;
}

export async function isAutostart(): Promise<boolean> {
  const file = autostartFile();
  if (!file) return false;
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

export async function setAutostart(enabled: boolean, execPath: string): Promise<void> {
  const file = autostartFile();
  if (!file) return;
  if (!enabled) {
    await rm(file, { force: true });
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const text = process.platform === "darwin" ? launchAgentPlist(execPath) : desktopEntry(execPath);
  await writeFile(file, text);
}
