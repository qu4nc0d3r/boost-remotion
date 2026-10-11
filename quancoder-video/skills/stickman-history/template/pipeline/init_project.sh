#!/usr/bin/env bash
# Create a stickman-history project.
# Usage: bash init_project.sh <slug> [override-config.json ...]
# Copies the shared base (fonts, voice, tts.py, setup_env.sh, package.json) from the sibling
# paper-tear-video template, the stickman engine, and writes config.json = skill default + overrides.
set -eu
SLUG=${1:?slug}; shift || true
HERE=$(cd "$(dirname "$0")/.." && pwd)                 # .../stickman-history/template
SKILL=$(cd "$HERE/.." && pwd)                          # .../stickman-history
BASE=$(cd "$SKILL/../paper-tear-video/template" && pwd)
mkdir -p "$SLUG/src" "$SLUG/out"
cp -r "$BASE/public" "$BASE/voices" "$BASE/tsconfig.json" "$BASE/remotion.config.ts" "$BASE/package.json" "$SLUG/"
mkdir -p "$SLUG/pipeline"
cp "$BASE/pipeline/tts.py" "$BASE/pipeline/setup_env.sh" "$SLUG/pipeline/"
cp "$BASE/src/fonts.ts" "$SLUG/src/"
cp "$HERE"/src/* "$SLUG/src/"
cp "$HERE"/pipeline/*.py "$HERE"/pipeline/*.sh "$SLUG/pipeline/"
cp "$HERE/stills.mjs" "$SLUG/"
# placeholder data so Remotion can bundle before build_story runs
echo '{"fps":30,"tear":18,"total":30,"title":"","scenes":[],"branding":{},"style":{}}' > "$SLUG/src/data.json"
python3 "$SLUG/pipeline/merge_config.py" "$SKILL/config.json" "$SLUG/config.json" "$@"
echo "project ready: $SLUG"
