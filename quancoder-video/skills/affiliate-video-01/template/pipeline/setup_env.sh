#!/usr/bin/env bash
# Bootstrap: npm deps, VieNeu-TTS, chrome-headless-shell. Prints READY or BLOCKED: … (exit 2)
set -u
code() { curl -s -o /dev/null -w '%{http_code}' -m 10 "$1"; }
NPM=$(code https://registry.npmjs.org/remotion); PYPI=$(code https://pypi.org/simple/vieneu/)
HF=$(code https://huggingface.co/api/models/pnnbao-ump/VieNeu-TTS-v3-Turbo)
echo "npm=$NPM pypi=$PYPI hf=$HF"
B=0
if [ ! -d node_modules/remotion ]; then
  if [ "$NPM" = "200" ]; then npm i --no-audit --no-fund >/dev/null 2>&1 && echo "npm deps installed"; else echo "BLOCKED: npm"; B=1; fi
fi
if ! python3 -c "import vieneu" 2>/dev/null; then
  if [ "$PYPI" = "200" ]; then pip install -q vieneu --break-system-packages 2>&1 | tail -1; else echo "BLOCKED: pypi"; B=1; fi
fi
python3 -c "import soundfile, PIL, scipy" 2>/dev/null || pip install -q soundfile pillow scipy --break-system-packages
which ffmpeg >/dev/null || echo "WARN: ffmpeg missing"
if [ -d node_modules/remotion ] && ! find node_modules/.remotion -name chrome-headless-shell -type f 2>/dev/null | grep -q .; then
  npx remotion browser ensure >/dev/null 2>&1 && echo "chrome-headless-shell ready" || echo "WARN: chrome download failed"
fi
[ "$HF" = "200" ] || { echo "BLOCKED: huggingface"; B=1; }
[ $B = 0 ] && echo READY || exit 2
