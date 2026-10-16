/**
 * Shape of the API the preload script exposes to the sandboxed renderer as
 * `window.matrix`. Shared between main, preload and renderer so the three
 * agree on it at compile time.
 */
export interface ClipInfo {
  /** file:// URL the renderer can give a <video>. */
  url: string;
  /** Display name, for logs. */
  name: string;
}

export interface MatrixBridge {
  /** Prepared clips from the manifest; empty when there are none. */
  getClips(): Promise<ClipInfo[]>;
}

export const CHANNEL_GET_CLIPS = "matrix:get-clips";

declare global {
  interface Window {
    matrix?: MatrixBridge;
  }
}
