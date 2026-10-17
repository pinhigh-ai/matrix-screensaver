#!/usr/bin/env bash
# Transcode every video in clips/raw/ into a small silent WebM in clips/ and
# rewrite clips/manifest.json. One video pixel becomes one rain cell, so
# 384x216 is plenty; anything larger only costs decode time.
#
#   scripts/prepare-clips.sh            # process clips/raw/*
#   scripts/prepare-clips.sh a.mp4 b.mkv   # process the given files instead
#
# Output name is the input's base name with a .webm extension. Existing
# outputs are overwritten. Needs ffmpeg and a prior `npm run build:main`.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
clips="$root/clips"
raw="$clips/raw"
width="${CLIP_WIDTH:-384}"
height="${CLIP_HEIGHT:-216}"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found; install it first" >&2; exit 1; }
[ -f "$root/dist/main/manifest.js" ] || (cd "$root" && npm run --silent build:main)

mkdir -p "$clips" "$raw"
if [ "$#" -gt 0 ]; then
  inputs=("$@")
else
  shopt -s nullglob
  inputs=("$raw"/*)
  shopt -u nullglob
fi

if [ "${#inputs[@]}" -eq 0 ]; then
  echo "nothing to prepare: put videos in $raw or pass files as arguments" >&2
fi

for input in "${inputs[@]}"; do
  name="$(basename "${input%.*}")"
  out="$clips/$name.webm"
  echo "preparing $name"
  ffmpeg -y -loglevel error -i "$input" \
    -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p" \
    -r 24 -c:v libvpx-vp9 -b:v 400k -an "$out"
done

node "$root/scripts/write-manifest.mjs" "$clips"
