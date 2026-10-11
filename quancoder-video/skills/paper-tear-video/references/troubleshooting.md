# Troubleshooting & environment notes

## Network blocked (setup_env.sh prints BLOCKED)

Needed hosts: `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, `huggingface.co`, `cdn-lfs.hf.co`, `*.hf.co` (incl. `cas-bridge.xethub.hf.co`), `api.openverse.org`, `live.staticflickr.com`, `upload.wikimedia.org`, `commons.wikimedia.org`, `storage.googleapis.com` (Chrome headless for Remotion). A 403 with header `x-deny-reason: host_not_allowed` means the organization egress allowlist blocks it.

1. Ask the user (AskUserQuestion) to allow the domains in claude.ai → Admin settings → Capabilities (or "All domains"). Changes can take effect in the cloud container only partly or only for new sessions; re-probe with `setup_env.sh`.
2. If npm/PyPI are still blocked but a computer is linked (`mcp__remote-devices__device_bash` works and has network), build an **offline bundle** there — its network is separate from the cloud container's:
   - npm: in `$HOME/b/npm` run `npm i remotion@4.0.529 @remotion/cli@4.0.529 @remotion/transitions@4.0.529 @remotion/media@4.0.529 react@19 react-dom@19 typescript`, then `npx remotion browser ensure` (puts chrome-headless-shell under `node_modules/.remotion`). `tar czf` node_modules into `<connected folder>/_build/`, `split -b 40m`, stage the parts (2 per call), then `cat parts | tar xzf -` in the project. The laptop VM is linux-x64-gnu, same as the cloud, so native binaries (@remotion/compositor-linux-x64-gnu) match.
   - pip (cloud is Python 3.11): `pip download vieneu --no-deps --python-version 3.11 --platform manylinux2014_x86_64 --only-binary=:all: -d .` plus `pip download sea-g2p soundfile soxr kaldi-native-fbank tokenizers huggingface_hub pyyaml requests tqdm --python-version 3.11 --platform manylinux2014_x86_64 --platform manylinux_2_17_x86_64 --platform manylinux_2_28_x86_64 --only-binary=:all: -d .`. Skip gradio/librosa (not needed for preset voices). Run each download in the foreground with `timeout 170` (background `nohup` jobs die when the device shell exits). Tar (exclude numpy if present in the cloud), stage, `pip install --no-index --find-links . --no-deps *.whl --break-system-packages`.
   - The model weights still come from Hugging Face in the cloud; if HF is blocked too, download `pnnbao-ump/VieNeu-TTS-v3-Turbo` and `OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX` snapshots on the device the same way.
3. Fonts never need the network (bundled in `public/fonts`). Google Fonts repo on GitHub is an alternative source if other fonts are wanted (`git clone --filter=blob:none --sparse https://github.com/google/fonts`).

## VieNeu

- `ONNXRuntimeError … External data path validation failed … escapes model directory` → onnxruntime ≥ 1.23 rejects external data behind HF cache symlinks. `tts.py` auto-fixes by copying blobs over the symlinks in `~/.cache/huggingface/hub/models--*/snapshots` and retrying (needed once per model repo).
- Speed on 2 CPU cores: RTF ≈ 1 (a 15 s scene takes ~15 s). 6 min of narration ≈ 6–7 min.
- `tts.py` is resumable: it skips scenes already in `pipeline/durations.json`. To redo a scene, delete its wav and its key.

## Remotion

- Version 4.0.529. Composition id is `Main`, 1080×1920 @ 30 fps; duration comes from `src/data.json`.
- Custom `TransitionPresentation` components stay mounted for the whole scene with progress 0 — `PaperTear.tsx` returns plain children when `p <= 0 || p >= 1`. Without that guard every frame shows a static white tear line.
- The exiting scene must sit above the entering one (zIndex on the torn pieces), otherwise the tear is hidden behind the next scene.
- Never define a React component inside render (causes remounts each frame); `piece()` is a plain function for this reason.
- Narration, SFX and music live outside `TransitionSeries` (the exiting scene is rendered twice during a tear, which would double audio).
- CSS transitions/animations do not render; drive everything with `useCurrentFrame()` + `interpolate()`.
- Render speed ≈ 3.8 fps at concurrency 2; master ≈ 5.7 Mbps (≈ 275 MB for 6 min). `finalize.py` re-encodes to ≈ 2.2 Mbps (≈ 105 MB for 6 min).

## Delivery limits

- `SendUserFile`: 30 MB per file.
- `device_commit_files`: 20 MB per file, 100 MB per call, ≤ 50 files. Raw MP4 chunks have arrived altered (first chunk grew by ~6 KB) — always gzip before splitting (`finalize.py --chunks` does this), reassemble with `cat … | gunzip`, and verify md5.
- Deleting in the connected folder needs `device_request_delete_permission`; ask once at the end to remove `_build`.

## Platform length limits (checked Sept 2026)

YouTube Shorts ≤ 3 min, Instagram Reels ≤ 3 min (boosting ≤ 90 s), Facebook Reels ≤ 90 s, TikTok uploads up to 60 min. Use `finalize.py --split` (parts ≤ 175 s, cut right after a tear).
