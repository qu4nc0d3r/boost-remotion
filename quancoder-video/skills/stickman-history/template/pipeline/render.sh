#!/usr/bin/env bash
# Render master + delivery MP4 with the settings in config.json.
# Usage: bash pipeline/render.sh <slug>   (run from the project root, in the background with nohup)
set -eu
SLUG=${1:?slug}
c() { python3 pipeline/config.py get "$1"; }
CONC=$(c render.concurrency); CRF=$(c render.masterCrf); MPRE=$(c render.masterPreset); DCRF=$(c render.deliveryCrf); PRE=$(c render.x264Preset)
AB=$(c render.audioBitrate); LIM=$(c audio.limiter); RES=$(c video.resolution); NTH=$(c render.everyNthFrame); FPS=$(c video.fps)
# exact ratios: Remotion rejects --scale values that give a fractional frame size (0.6667 -> 720.036 px)
case "$RES" in 720p) SCALE=0.6666666666666666;; 1440p) SCALE=1.3333333333333333;; 2160p|4k) SCALE=2;; *) SCALE=1;; esac
CH=$(c channel.name); TITLE=$(python3 -c "import json;print(json.load(open('script.json'))['title'])")
if [ "$NTH" -gt 1 ]; then
  # on twos: Remotion only collects audio on the frames it renders, so render muted and mix the soundtrack with ffmpeg
  npx remotion render Main out/master.mp4 --concurrency="$CONC" --crf="$CRF" --x264-preset="$MPRE" --scale="$SCALE" --every-nth-frame="$NTH" --muted
  python3 pipeline/mix_audio.py out/audio.wav
  AIN="-i out/audio.wav -map 0:v -map 1:a"
else
  npx remotion render Main out/master.mp4 --concurrency="$CONC" --crf="$CRF" --x264-preset="$MPRE" --scale="$SCALE" --audio-codec=aac --audio-bitrate=192k
  AIN=""
fi
# -r restores the full frame rate when every Nth frame was rendered (each drawing is shown N times)
ffmpeg -v error -y -i out/master.mp4 $AIN -r "$FPS" -c:v libx264 -crf "$DCRF" -preset "$PRE" -tune animation -pix_fmt yuv420p \
  -af "alimiter=limit=$LIM" -c:a aac -b:a "$AB" -movflags +faststart \
  -metadata artist="$CH" -metadata title="$TITLE" -metadata comment="$(c channel.noReupLine)" "out/$SLUG-16x9.mp4"
ls -la "out/$SLUG-16x9.mp4"
echo RENDER_DONE
