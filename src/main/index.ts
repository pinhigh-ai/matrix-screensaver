/**
 * Electron main process.
 *
 * Runs as a menu-bar / tray app. Every second it reads the system idle
 * time; when it passes the configured threshold it opens one fullscreen,
 * always-on-top window per display, each running the renderer. Any key or
 * mouse movement in a window closes them all and watching resumes.
 *
 * Flags and environment:
 *   --now            show the saver on all displays immediately
 *   --preview        open one ordinary window instead (development)
 *   MATRIX_DEBUG=1   relay renderer console output and the fps meter
 *   MATRIX_SCENE_NOW=1  play a scene a couple of seconds after showing
 *   MATRIX_SNAPSHOT=/path.png  capture every window after 8 s and quit
 */
import { app, BrowserWindow, ipcMain, Menu, powerMonitor, screen, Tray } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { isAutostart, setAutostart } from "./autostart.js";
import { parseConfig, type Config } from "./config.js";
import { IdleMachine } from "./idle.js";
import { parseManifest } from "./manifest.js";
import { trayIcon } from "./tray-icon.js";
import { saverBounds, type Bounds } from "./windows.js";
import { CHANNEL_DISMISS, CHANNEL_GET_CLIPS, type ClipInfo } from "../shared/bridge.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(here, "..");

const debug = process.env.MATRIX_DEBUG === "1";
const sceneNow = process.env.MATRIX_SCENE_NOW === "1";
const showNow = process.argv.includes("--now");
const previewMode = process.argv.includes("--preview");

const log = (message: string): void => {
  if (debug) console.log(message);
};

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

/**
 * Where clips live: the configured folder, else clips/ in the checkout when
 * running from source, else clips/ under the per-user data folder for the
 * packaged app (the app bundle itself is read-only).
 */
function clipsDir(config: Config): string {
  if (config.clipsDir !== "") return config.clipsDir;
  return app.isPackaged
    ? path.join(app.getPath("userData"), "clips")
    : path.join(app.getAppPath(), "clips");
}

async function listClips(config: Config): Promise<ClipInfo[]> {
  const dir = clipsDir(config);
  const files = parseManifest(await readOptional(path.join(dir, "manifest.json")));
  return files.map((file) => ({ name: file, url: pathToFileURL(path.join(dir, file)).href }));
}

function rendererQuery(config: Config, seed: number): Record<string, string> {
  const [sceneMin, sceneMax] = sceneNow ? [1, 2] : config.sceneIntervalSeconds;
  return {
    cellSize: String(config.cellSize),
    sceneMin: String(sceneMin),
    sceneMax: String(sceneMax),
    sceneFade: String(config.sceneFadeSeconds),
    sceneFit: config.sceneFit,
    sceneLoop: config.sceneLoop ? "1" : "0",
    sceneInvert: config.sceneInvert ? "1" : "0",
    seed: String(seed),
    fps: debug ? "1" : "0",
  };
}

const saverWindows: BrowserWindow[] = [];

function openWindow(
  config: Config,
  bounds: Bounds,
  seed: number,
  fullscreen: boolean,
): BrowserWindow {
  const win = new BrowserWindow({
    ...bounds,
    frame: !fullscreen,
    alwaysOnTop: fullscreen,
    skipTaskbar: fullscreen,
    movable: !fullscreen,
    resizable: !fullscreen,
    fullscreenable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    backgroundColor: "#000000",
    show: false,
    webPreferences: {
      preload: path.join(distRoot, "preload", "index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (fullscreen) {
    // 'screen-saver' sits above the menu bar and dock on macOS.
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setBounds(bounds);
  }
  if (debug) {
    win.webContents.on("console-message", (event) => {
      console.log(`[renderer ${seed}] ${event.message}`);
    });
  }
  win.once("ready-to-show", () => win.show());
  void win.loadFile(path.join(distRoot, "renderer", "index.html"), {
    query: rendererQuery(config, seed),
  });
  return win;
}

function showSaver(config: Config): void {
  const bounds = saverBounds(screen.getAllDisplays());
  log(`showing saver on ${bounds.length} display(s)`);
  bounds.forEach((b, i) => saverWindows.push(openWindow(config, b, i + 1, true)));
  scheduleSnapshot(saverWindows);
}

function hideSaver(): void {
  log("hiding saver");
  for (const win of saverWindows.splice(0)) {
    if (!win.isDestroyed()) win.destroy();
  }
}

/**
 * Development aid: with MATRIX_SNAPSHOT=/path/to/file.png every window is
 * captured after a few seconds of rain (suffix -2, -3 for further displays)
 * and the app quits.
 */
function scheduleSnapshot(windows: readonly BrowserWindow[]): void {
  const target = process.env.MATRIX_SNAPSHOT;
  if (!target) return;
  setTimeout(async () => {
    try {
      await Promise.all(
        windows.map(async (win, i) => {
          const file = i === 0 ? target : target.replace(/(\.[^.]+)?$/, (ext) => `-${i + 1}${ext}`);
          const image = await win.webContents.capturePage();
          await writeFile(file, image.toPNG());
          console.log(`snapshot written to ${file}`);
        }),
      );
    } catch (error) {
      console.error("snapshot failed", error);
    } finally {
      app.quit();
    }
  }, 8000);
}

function startPreview(config: Config): void {
  // MATRIX_PREVIEW=full sizes the window to the display for frame-rate checks.
  const size =
    process.env.MATRIX_PREVIEW === "full"
      ? screen.getPrimaryDisplay().size
      : { width: 1280, height: 720 };
  const win = openWindow(config, { x: 80, y: 80, ...size }, 1, false);
  scheduleSnapshot([win]);
  win.on("closed", () => app.quit());
}

async function startSaver(config: Config): Promise<void> {
  const machine = new IdleMachine(config.idleMinutes * 60);
  const act = (action: "show" | "hide" | undefined): void => {
    if (action === "show") showSaver(config);
    if (action === "hide") hideSaver();
  };

  ipcMain.on(CHANNEL_DISMISS, () => act(machine.input()));
  setInterval(() => act(machine.observe(powerMonitor.getSystemIdleTime())), 1000);

  const tray = new Tray(trayIcon());
  tray.setToolTip("Matrix screensaver");
  const autostart = await isAutostart();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Preview now", click: () => act(machine.show()) },
      {
        label: "Start at login",
        type: "checkbox",
        checked: autostart,
        // From source the executable is Electron itself, so only offer it packaged.
        enabled: app.isPackaged,
        click: (item) => void setAutostart(item.checked, process.execPath),
      },
      { label: `Clips folder: ${clipsDir(config)}`, enabled: false },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
  // Keep a reference so the tray is not garbage collected.
  trays.push(tray);

  if (showNow) act(machine.show());
}

const trays: Tray[] = [];

app.whenReady().then(async () => {
  const config = await loadConfig();
  log(`matrix-screensaver config ${JSON.stringify(config)}`);
  ipcMain.handle(CHANNEL_GET_CLIPS, () => listClips(config));
  if (process.platform === "darwin") app.dock?.hide();
  if (previewMode) startPreview(config);
  else await startSaver(config);
});

// A tray app keeps running with no windows open; --preview quits on close.
app.on("window-all-closed", () => {
  if (previewMode) app.quit();
});
