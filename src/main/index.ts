/**
 * Electron main process. Step 1 opens a single window showing the renderer;
 * idle detection, per-display windows and dismissal arrive in step 6.
 */
import { app, BrowserWindow, screen } from "electron";
import { readFile, writeFile } from "node:fs/promises";
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

/** Set MATRIX_DEBUG=1 to relay renderer console output and the fps meter to stdout. */
const debug = process.env.MATRIX_DEBUG === "1";

function createWindow(config: Config): BrowserWindow {
  // In debug the window takes the whole primary display so the frame rate
  // measured is the one a real fullscreen saver would get.
  const size = debug ? screen.getPrimaryDisplay().size : { width: 1280, height: 720 };
  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    backgroundColor: "#000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (debug) {
    win.webContents.on("console-message", (event) => {
      console.log(`[renderer] ${event.message}`);
    });
  }
  void win.loadFile(path.join(here, "..", "renderer", "index.html"), {
    query: { cellSize: String(config.cellSize), fps: debug ? "1" : "0" },
  });
  scheduleSnapshot(win);
  return win;
}

/**
 * Development aid: with MATRIX_SNAPSHOT=/path/to/file.png the window is
 * captured after a few seconds of rain, written to that path, and the app
 * quits. Lets the renderer be checked without a person at the screen.
 */
function scheduleSnapshot(win: BrowserWindow): void {
  const target = process.env.MATRIX_SNAPSHOT;
  if (!target) return;
  setTimeout(async () => {
    try {
      const image = await win.webContents.capturePage();
      await writeFile(target, image.toPNG());
      console.log(`snapshot written to ${target}`);
    } catch (error) {
      console.error("snapshot failed", error);
    } finally {
      app.quit();
    }
  }, 8000);
}

app.whenReady().then(async () => {
  const config = await loadConfig();
  if (debug) console.log("matrix-screensaver config", config);
  createWindow(config);
});

app.on("window-all-closed", () => {
  app.quit();
});
