/**
 * Renderer entry point. Step 1 only proves the window and canvas wiring;
 * the rain simulation and scene layer arrive in later steps.
 */
const canvas = document.getElementById("rain") as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error("renderer: #rain canvas missing from index.html");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("renderer: 2D context unavailable");
}

function fit(): void {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "#00ff41";
  ctx.font = "16px monospace";
  ctx.fillText("matrix-screensaver: renderer online", 24, 40);
}

window.addEventListener("resize", fit);
fit();
