/**
 * Preload: the only code with both a bridge to the main process and access
 * to the page. Exposes a minimal, typed API; the renderer stays sandboxed.
 */
import { contextBridge, ipcRenderer } from "electron";
import { CHANNEL_GET_CLIPS, type ClipInfo, type MatrixBridge } from "../shared/bridge.js";

const bridge: MatrixBridge = {
  getClips: (): Promise<ClipInfo[]> => ipcRenderer.invoke(CHANNEL_GET_CLIPS),
};

contextBridge.exposeInMainWorld("matrix", bridge);
