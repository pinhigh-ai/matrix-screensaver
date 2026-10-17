#!/usr/bin/env bash
# Download scene sections listed in clips/sources.txt with yt-dlp into
# clips/raw/, then run prepare-clips.sh. You run this yourself: the footage
# is copyrighted and downloading it is against YouTube's terms, so the
# repository only ships the tooling and never any clip.
#
# clips/sources.txt, one scene per line, '#' starts a comment:
#
#   <url> <start> <duration> <name>
#   https://www.youtube.com/watch?v=XXXX 0:42 20 lobby
#
# start is seconds or m:ss; duration is seconds. yt-dlp cuts at keyframes
# so the section may begin a moment early. Edit the file until the scenes
# look right, then re-run; existing raw files are skipped unless FORCE=1.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
clips="$root/clips"
raw="$clips/raw"
sources="${1:-$clips/sources.txt}"

command -v yt-dlp >/dev/null || { echo "yt-dlp not found: brew install yt-dlp / sudo dnf install yt-dlp" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found; install it first" >&2; exit 1; }
[ -f "$sources" ] || { echo "no $sources; copy clips/sources.example.txt and edit it" >&2; exit 1; }

mkdir -p "$raw"

to_seconds() {
  case "$1" in
    *:*) IFS=: read -r m s <<< "$1"; echo "$((10#$m * 60 + 10#$s))" ;;
    *) echo "$1" ;;
  esac
}

while read -r url start duration name _; do
  [ -z "$url" ] && continue
  case "$url" in \#*) continue ;; esac
  if [ -z "${name:-}" ]; then
    echo "skipping line without a name: $url" >&2
    continue
  fi
  if [ "${FORCE:-0}" != "1" ] && ls "$raw/$name".* >/dev/null 2>&1; then
    echo "have $name, skipping (FORCE=1 to refetch)"
    continue
  fi
  s="$(to_seconds "$start")"
  e="$((s + duration))"
  echo "fetching $name: $url [$s-$e s]"
  yt-dlp --quiet --no-warnings \
    --download-sections "*${s}-${e}" --force-keyframes-at-cuts \
    -f "bv*[height<=480][ext=mp4]/bv*[height<=480]/b[height<=480]" \
    -o "$raw/$name.%(ext)s" "$url"
done < "$sources"

"$root/scripts/prepare-clips.sh"
