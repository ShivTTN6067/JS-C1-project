#!/usr/bin/env bash
# Generates tiny playable 9:16 MP4s + posters for the Micro Drama seed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/media"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
mkdir -p "$OUT"

make_clip() {
  local file="$1"
  local title="$2"
  local color="$3"
  local freq="$4"
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=${color}:s=540x960:d=5:r=24" \
    -f lavfi -i "sine=frequency=${freq}:duration=5" \
    -vf "drawtext=fontfile=${FONT}:text='${title}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=18" \
    -c:v libx264 -pix_fmt yuv420p -crf 32 -preset veryfast \
    -c:a aac -b:a 64k -shortest -movflags +faststart \
    "$OUT/$file"
}

make_clip "clip-01.mp4" "Midnight Alley" "0x3b0d2a" 220
make_clip "clip-02.mp4" "Rain Meeting" "0x1b2430" 260
make_clip "clip-03.mp4" "Cliffhanger" "0x5c1a1a" 300
make_clip "clip-04.mp4" "Last Contract" "0x102a43" 340
make_clip "clip-05.mp4" "Safe House" "0x123524" 380
make_clip "clip-06.mp4" "Office Secrets" "0x3d2b1f" 420
make_clip "clip-07.mp4" "Ocean Worlds" "0x0b3d5c" 180
make_clip "clip-08.mp4" "Classic Cinema" "0x2b2b2b" 200

ffmpeg -y -hide_banner -loglevel error -i "$OUT/clip-01.mp4" -vframes 1 -vf "scale=400:600" "$OUT/poster-midnight.jpg"
ffmpeg -y -hide_banner -loglevel error -i "$OUT/clip-04.mp4" -vframes 1 -vf "scale=400:600" "$OUT/poster-contract.jpg"
ffmpeg -y -hide_banner -loglevel error -i "$OUT/clip-06.mp4" -vframes 1 -vf "scale=400:600" "$OUT/poster-office.jpg"
ffmpeg -y -hide_banner -loglevel error -i "$OUT/clip-07.mp4" -vframes 1 -vf "scale=400:600" "$OUT/poster-ocean.jpg"
ffmpeg -y -hide_banner -loglevel error -i "$OUT/clip-08.mp4" -vframes 1 -vf "scale=400:600" "$OUT/poster-classic.jpg"

ls -lh "$OUT"
