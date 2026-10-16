/**
 * Electron main process. Step 1 opens a single window showing the renderer;
 * idle detection, per-display windows and dismissal arrive in step 6.
 */
import { app, BrowserWindow } from "electron";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfig, type Config } from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));

async function loadConfig(): Promise<Config> {
  const file = path.join(app.getPath("userData"), "config.json");
  try {
    return parseConfig(await readFile(file, "utf8"));
  } catch {
    return parseConfig(undefined);
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: "#000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void win.loadFile(path.join(here, "..", "renderer", "index.html"));
  return win;
}

app.whenReady().then(async () => {
  const config = await loadConfig();
  console.log("matrix-screensaver config", config);
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
