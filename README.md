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

Under construction. All seven steps of the plan are done: project scaffold, config
loader, the rain simulation as tested pure logic, the glyph-atlas draw loop
that renders it at full frame rate, and the scene layer that plays clips as
glyph brightness inside the rain, the clip fetch and preparation scripts, and
the idle-triggered shell that covers every display, and packaging with
start-at-login. All plan steps are implemented; see Known limits below.

## Install

Download the build for your machine from the
[releases page](https://github.com/pinhigh-ai/matrix-screensaver/releases),
or build it yourself (see Packaging below).

- **macOS (Apple silicon):** open the `.dmg` and drag Matrix Screensaver to
  Applications. The app is not signed or notarized, so the first launch is
  right-click > Open, then Open in the dialog. It runs as a menu-bar app with
  no Dock icon.
- **Fedora:** `sudo dnf install ./matrix-screensaver-<version>-x86_64.rpm`, or
  make the `.AppImage` executable and run it. It runs under XWayland on GNOME
  Wayland so it can place a window on every display.

Then use the tray menu: "Preview now" shows the saver at once, "Start at
login" installs a LaunchAgent (macOS) or an XDG autostart entry (Linux), and
"Clips folder" shows where the packaged app looks for clips:
`~/Library/Application Support/matrix-screensaver/clips` on macOS,
`~/.config/matrix-screensaver/clips` on Linux. Prepare clips straight into it
with `CLIPS_DIR=<that folder> scripts/prepare-clips.sh`, or set `clipsDir` in
the config file to point anywhere else.

## Running from source

```bash
npm start            # sits in the menu bar / tray and watches idle time
npm start -- --now   # show the saver on every display right away
```

After `idleMinutes` of no input the saver opens one always-on-top window per
display. Press any key, click, scroll, or move the mouse a little and it goes
away. The tray icon offers "Preview now" and "Quit".

Set the system's own screensaver and screen lock to a longer timeout than
`idleMinutes` (or off), otherwise the two fight over the screen. Display sleep
is unaffected and still happens on the system's schedule.

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

| Key                    | Default     | Meaning                                                                |
| ---------------------- | ----------- | ---------------------------------------------------------------------- |
| `idleMinutes`          | `5`         | Idle time before the saver starts                                      |
| `cellSize`             | `18`        | Glyph cell size in CSS pixels                                          |
| `sceneIntervalSeconds` | `[45, 120]` | Random wait between movie scenes, min and max                          |
| `sceneFadeSeconds`     | `2`         | Fade in and fade out duration for each scene                           |
| `clipsDir`             | `""`        | Folder of prepared clips; empty means `clips/` in the app              |
| `sceneFit`             | `"cover"`   | `cover` crops the clip to fill the screen; `contain` fits it with bars |
| `sceneLoop`            | `false`     | Start the clip right away and loop it for as long as the saver is up   |
| `sceneInvert`          | `false`     | Swap dark and light, for a dark subject on a bright background         |

## Movie clips

Film footage is copyrighted and is not part of this repository. You fetch and
prepare clips locally; they stay in the gitignored `clips/` folder and only
the tooling is committed.

1. Install the tools: `brew install ffmpeg yt-dlp` on macOS,
   `sudo dnf install ffmpeg yt-dlp` on Fedora.
2. Copy `clips/sources.example.txt` to `clips/sources.txt`. Each line is a
   YouTube URL, a start time (`m:ss` or seconds), a duration in seconds and a
   name. The example lists the lobby, red pill, dojo, subway and rooftop
   scenes with guessed offsets; check them against the videos.
3. Run the fetch yourself (downloading is against YouTube's terms, so the app
   never does it for you):

   ```bash
   scripts/fetch-clips.sh
   ```

   It downloads just the requested section of each video into `clips/raw/`
   and then runs `scripts/prepare-clips.sh`, which transcodes everything in
   `clips/raw/` to silent 384x216 WebM in `clips/` and rewrites
   `clips/manifest.json`. You can also drop your own files into `clips/raw/`
   and run the prepare script alone.

`clips/manifest.json` is plain JSON and can be edited by hand:

```json
{ "clips": [{ "file": "lobby.webm" }, { "file": "subway.webm" }] }
```

Every so often the saver picks a clip at random (never the same one twice in a
row), fades it in over a couple of seconds, and renders each frame as the
brightness of the rain's own glyphs while the rain itself dims to a quarter.
One video pixel maps to one cell, so 384x216 is plenty. Each frame gets
auto-levels and a steep tone curve so only the subject lights up; footage with
a dark subject on a bright floor or sky looks best with `sceneInvert` on.

To try the scene layer without any footage, generate a synthetic test clip:

```bash
npm run test-clip
MATRIX_DEBUG=1 MATRIX_SCENE_NOW=1 npm start -- --preview   # plays a scene a second after launch
```

## Packaging

```bash
npm run dist:mac     # release/Matrix Screensaver-<version>-arm64.dmg
npm run dist:linux   # release/matrix-screensaver-<version>-x86_64.AppImage and .rpm (run on Linux)
```

Pushing a tag like `v0.1.0` runs the Release workflow, which builds the
macOS and Linux artefacts on GitHub's runners and attaches them to a GitHub
release.

## Known limits

- Unsigned macOS build; Gatekeeper needs the right-click > Open dance once.
- Not a System Settings screensaver. Apple's third-party screensaver engine
  is unreliable on recent macOS (second displays stay black), so this app
  watches idle time itself. Set the system screensaver longer than
  `idleMinutes`.
- On GNOME Wayland the app runs under XWayland. GNOME's own screen blank and
  lock still apply; set their timeouts above `idleMinutes` too.
- Film clips are never shipped; you fetch your own with `scripts/fetch-clips.sh`.

## Debugging

```bash
npm start -- --preview                                       # one ordinary window, no idle watching
MATRIX_DEBUG=1 npm start -- --preview                        # window the size of the display, fps log on stdout
MATRIX_DEBUG=1 MATRIX_SNAPSHOT=/tmp/rain.png npm start -- --now   # capture every display after 8 s and quit
```

The glyphs need a font with half-width katakana. macOS ships one; on Fedora
install `google-noto-sans-cjk-fonts`.
