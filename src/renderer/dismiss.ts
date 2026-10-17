/**
 * Watch for the user coming back. Keys, clicks and wheel dismiss at once;
 * the mouse has to travel a few pixels, and nothing counts during a short
 * grace period after the window appears, because showing a window under
 * the cursor can itself produce a mousemove.
 */
export interface DismissOptions {
  graceMs: number;
  movePx: number;
}

export const DEFAULT_DISMISS: Readonly<DismissOptions> = Object.freeze({
  graceMs: 700,
  movePx: 12,
});

export function watchForInput(
  target: Window,
  onDismiss: () => void,
  options: DismissOptions = DEFAULT_DISMISS,
): () => void {
  const start = performance.now();
  let origin: { x: number; y: number } | undefined;
  let fired = false;

  const fire = (): void => {
    if (fired) return;
    fired = true;
    onDismiss();
  };
  const inGrace = (): boolean => performance.now() - start < options.graceMs;
  const onKey = (): void => {
    if (!inGrace()) fire();
  };
  const onMove = (event: MouseEvent): void => {
    if (inGrace()) return;
    if (!origin) {
      origin = { x: event.screenX, y: event.screenY };
      return;
    }
    const dx = event.screenX - origin.x;
    const dy = event.screenY - origin.y;
    if (Math.hypot(dx, dy) >= options.movePx) fire();
  };

  target.addEventListener("keydown", onKey);
  target.addEventListener("mousedown", onKey);
  target.addEventListener("wheel", onKey);
  target.addEventListener("mousemove", onMove);
  return () => {
    target.removeEventListener("keydown", onKey);
    target.removeEventListener("mousedown", onKey);
    target.removeEventListener("wheel", onKey);
    target.removeEventListener("mousemove", onMove);
  };
}
