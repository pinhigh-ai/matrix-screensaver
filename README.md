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

Under construction. Steps 1 and 2 of the plan are done: project scaffold, config
loader, hello-world window, and the rain simulation as tested pure logic.

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
clips locally; they stay in the gitignored `clips/` folder. Scripts for this
arrive in a later step.

## License

MIT. See [LICENSE](LICENSE).
