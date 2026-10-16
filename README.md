# matrix-screensaver

A screensaver in the style of _The Matrix_: cascading glyph rain across every
display, with movie scenes that fade in and out rendered as the brightness of
the rain's own characters. One code base for macOS and Linux.

It is a standalone app rather than a `.saver` bundle or XScreenSaver hack,
because Apple's third-party screensaver engine is unreliable on recent macOS
(in particular it stops second monitors from showing anything). The app watches
system idle time itself and covers each display with a fullscreen window when
the threshold passes. Any key or mouse movement dismisses it.

## Status

Under construction. Steps 1 to 4 of the plan are done: project scaffold, config
loader, the rain simulation as tested pure logic, the glyph-atlas draw loop
that renders it at full frame rate, and the scene layer that plays clips as
glyph brightness inside the rain. Still to come: clip fetch and preparation
scripts, idle detection with one window per display, packaging.

## Development

Requires Node 24.

```bash
npm install
npm start          # build and open the app
npm test           # unit tests (Vitest)
npm run lint       # ESLint and Prettier
npm run typecheck  # tsc --noEmit
```

## Configuration

A JSON file in the per-user config directory
(`~/Library/Application Support/matrix-screensaver/config.json` on macOS,
`~/.config/matrix-screensaver/config.json` on Linux). Every key is optional.

| Key                    | Default     | Meaning                                                   |
| ---------------------- | ----------- | --------------------------------------------------------- |
| `idleMinutes`          | `5`         | Idle time before the saver starts                         |
| `cellSize`             | `18`        | Glyph cell size in CSS pixels                             |
| `sceneIntervalSeconds` | `[45, 120]` | Random wait between movie scenes, min and max             |
| `sceneFadeSeconds`     | `2`         | Fade in and fade out duration for each scene              |
| `clipsDir`             | `""`        | Folder of prepared clips; empty means `clips/` in the app |

## Movie clips

Film footage is copyrighted and is not part of this repository. You prepare
clips locally; they stay in the gitignored `clips/` folder, listed in
`clips/manifest.json`:

```json
{ "clips": [{ "file": "neo-wakes.webm" }, { "file": "lobby.webm" }] }
```

Every so often the saver picks a clip at random (never the same one twice in a
row), fades it in over a couple of seconds, and renders each frame as the
brightness of the rain's own glyphs while the rain itself dims to a quarter.
Clips should be small and silent; 384x216 WebM is plenty, since one video pixel
maps to one cell.

To try the scene layer without any footage, generate a synthetic test clip
(needs ffmpeg):

```bash
npm run test-clip
MATRIX_DEBUG=1 MATRIX_SCENE_NOW=1 npm start   # plays a scene a second after launch
```

## License

MIT. See [LICENSE](LICENSE).

## Debugging

```bash
MATRIX_DEBUG=1 npm start                          # full-display window, fps log on stdout
MATRIX_DEBUG=1 MATRIX_SNAPSHOT=/tmp/rain.png npm start   # also save a screenshot after 8 s and quit
```

The glyphs need a font with half-width katakana. macOS ships one; on Fedora
install `google-noto-sans-cjk-fonts`.
