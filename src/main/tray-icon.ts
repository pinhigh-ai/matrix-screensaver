/**
 * A tiny menu-bar icon drawn in code so the app needs no image asset:
 * three short columns of dots, like falling glyphs. On macOS it is a
 * template image, so the system tints it for light and dark menu bars.
 */
import { nativeImage, type NativeImage } from "electron";

const SIZE = 16;

export function trayIcon(): NativeImage {
  const scale = 2;
  const px = SIZE * scale;
  const buffer = Buffer.alloc(px * px * 4, 0);
  const columns = [3, 8, 13];
  const starts = [1, 5, 3];
  const lengths = [9, 10, 7];
  columns.forEach((cx, i) => {
    for (let k = 0; k < lengths[i]!; k++) {
      const y = starts[i]! + k;
      if (y % 2 === 1 || y >= SIZE - 1) continue;
      const alpha = k === lengths[i]! - 1 ? 255 : 150;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const offset = ((y * scale + sy) * px + (cx * scale + sx)) * 4;
          buffer[offset] = 0; // B
          buffer[offset + 1] = 0; // G
          buffer[offset + 2] = 0; // R
          buffer[offset + 3] = alpha;
        }
      }
    }
  });
  const image = nativeImage.createFromBitmap(buffer, { width: px, height: px, scaleFactor: scale });
  image.setTemplateImage(true);
  return image;
}
