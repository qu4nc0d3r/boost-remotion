#!/usr/bin/env bash
# Bootstrap the paper-tear-video project in the current directory.
# Exit codes: 0 ok, 2 = registry blocked (use the offline-bundle path in references/troubleshooting.md)
set -u
code() { curl -s -o /dev/null -w '%{http_code}' -m 10 "$1"; }
NPM=$(code https://registry.npmjs.org/remotion); PYPI=$(code https://pypi.org/simple/vieneu/)
HF=$(code https://huggingface.co/api/models/pnnbao-ump/VieNeu-TTS-v3-Turbo); OV=$(code "https://api.openverse.org/v1/images/?q=test&page_size=1")
echo "npm=$NPM pypi=$PYPI hf=$HF openverse=$OV"
BLOCKED=0
if [ ! -d node_modules/remotion ]; then
  if [ "$NPM" = "200" ]; then npm i --no-audit --no-fund >/dev/null 2>&1 && echo "npm deps installed"; else echo "BLOCKED: npm"; BLOCKED=1; fi
fi
if ! python3 -c "import vieneu" 2>/dev/null; then
  if [ "$PYPI" = "200" ]; then pip install -q vieneu --break-system-packages 2>&1 | tail -1; else echo "BLOCKED: pypi"; BLOCKED=1; fi
fi
python3 -c "import soundfile, PIL, scipy" 2>/dev/null || echo "WARN: need soundfile, pillow, scipy"
which ffmpeg >/dev/null || echo "WARN: ffmpeg missing"
if [ -d node_modules/remotion ] && ! find node_modules/.remotion -name chrome-headless-shell -type f 2>/dev/null | grep -q .; then
  npx remotion browser ensure >/dev/null 2>&1 && echo "chrome-headless-shell ready" || echo "WARN: chrome download failed (try --browser-executable)"
fi
[ "$HF" = "200" ] || { echo "BLOCKED: huggingface"; BLOCKED=1; }
[ "$OV" = "200" ] || { echo "BLOCKED: openverse"; BLOCKED=1; }
[ $BLOCKED = 0 ] && echo READY || exit 2
