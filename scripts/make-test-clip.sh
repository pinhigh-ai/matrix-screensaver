#!/usr/bin/env bash
# Generate a synthetic test clip with ffmpeg so the scene layer can be
# exercised without any film footage. Writes clips/test-pattern.webm and a
# manifest listing it. Safe to commit nothing: clips/ is gitignored.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="$root/clips"
out="$dir/test-pattern.webm"
mkdir -p "$dir"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found; install it first" >&2; exit 1; }

# Bright moving shapes on black, evaluated per frame with geq (T is time):
# a white disc orbiting the centre and a vertical bar sweeping left to right,
# so the picture is obvious when rendered as rain brightness.
disc='lt(hypot(X-(192+120*cos(T*1.5)),Y-(108+60*sin(T*1.5))),30)'
bar='0.8*between(X,40+T*36,80+T*36)'
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=black:size=384x216:rate=24:duration=8" \
  -vf "format=yuv420p,geq=lum='255*min(1,${disc}+${bar})':cb=128:cr=128" \
  -c:v libvpx-vp9 -b:v 400k -an "$out"

printf '{ "clips": [ { "file": "test-pattern.webm" } ] }\n' > "$dir/manifest.json"
echo "wrote $out and $dir/manifest.json"
