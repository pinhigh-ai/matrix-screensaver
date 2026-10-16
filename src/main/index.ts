/**
 * Electron main process. Opens a single window showing the renderer and
 * answers its request for the clip list; idle detection, per-display
 * windows and dismissal arrive in step 6.
 */
import { app, BrowserWindow, ipcMain, screen } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { parseConfig, type Config } from "./config.js";
import { parseManifest } from "./manifest.js";
import { CHANNEL_GET_CLIPS, type ClipInfo } from "../shared/bridge.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(here, "..");

/** Set MATRIX_DEBUG=1 to relay renderer console output and the fps meter to stdout. */
const debug = process.env.MATRIX_DEBUG === "1";
/** Set MATRIX_SCENE_NOW=1 to play a scene within a couple of seconds of starting. */
const sceneNow = process.env.MATRIX_SCENE_NOW === "1";

async function readOptional(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

async function loadConfig(): Promise<Config> {
  return parseConfig(await readOptional(path.join(app.getPath("userData"), "config.json")));
}

function clipsDir(config: Config): string {
  return config.clipsDir !== "" ? config.clipsDir : path.join(app.getAppPath(), "clips");
}

async function listClips(config: Config): Promise<ClipInfo[]> {
  const dir = clipsDir(config);
  const files = parseManifest(await readOptional(path.join(dir, "manifest.json")));
  return files.map((file) => ({ name: file, url: pathToFileURL(path.join(dir, file)).href }));
}

function rendererQuery(config: Config): Record<string, string> {
  const [sceneMin, sceneMax] = sceneNow ? [1, 2] : config.sceneIntervalSeconds;
  return {
    cellSize: String(config.cellSize),
    sceneMin: String(sceneMin),
    sceneMax: String(sceneMax),
    sceneFade: String(config.sceneFadeSeconds),
    fps: debug ? "1" : "0",
  };
}

function createWindow(config: Config): BrowserWindow {
  // In debug the window takes the whole primary display so the frame rate
  // measured is the one a real fullscreen saver would get.
  const size = debug ? screen.getPrimaryDisplay().size : { width: 1280, height: 720 };
  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(distRoot, "preload", "index.cjs"),
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
  void win.loadFile(path.join(distRoot, "renderer", "index.html"), {
    query: rendererQuery(config),
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
  ipcMain.handle(CHANNEL_GET_CLIPS, () => listClips(config));
  createWindow(config);
});

app.on("window-all-closed", () => {
  app.quit();
});
