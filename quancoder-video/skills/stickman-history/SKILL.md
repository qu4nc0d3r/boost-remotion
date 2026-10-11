---
name: stickman-history
description: This skill should be used when the user runs '/stickman-history [chủ đề]' or '/quancoder-video:stickman-history …', or asks for a 'video lịch sử người que', 'kể chuyện lịch sử bằng người que', 'video người que chuyển động', 'video Remotion minh hoạ người que', a narrated 16:9 history story drawn with animated stick figures on old paper, or wants to change its channel names, voice, colours or render settings ('đổi tên kênh', 'sửa config stickman').
metadata:
  version: "0.3.0"
  author: "Quan"
---

# Stickman History Video (16:9, end-to-end)

Turn a historical topic into a finished 1920×1080 MP4 plus thumbnails and upload metadata: researched Vietnamese script → VieNeu-TTS voice → hand-drawn stick figures on aged paper (line-boil wobble, draw-on strokes, ink-wipe transitions, chapter stamps, paper-strip captions, war-drum SFX, pentatonic music) → delivery encode → YouTube thumbnail + TikTok cover → TikTok/YouTube metadata.

Style rules (never break): everything is drawn — no photos; ink on parchment with one accent colour (config `style.accent`) and a second colour for the opposing side (`style.enemy`); every scene contains moving figures or props and changes visibly at least twice; captions sit on the paper strip at the bottom; facts are sourced and disputed details are omitted or flagged.

## Config (channel names, voice, colours, render…)

All tunable values live in `config.json` (skill default at `${CLAUDE_PLUGIN_ROOT}/skills/stickman-history/config.json`; field guide in `references/config.md`). Resolve it in this order, later wins:

1. Skill default `config.json`.
2. Project override: if a claude.ai Project is attached and has the doc `stickman-history/config.json`, `project_read` it and save it to a temp file.
3. Per-video values the user states in the request (e.g. "giọng Thiện Minh", "màu xanh") → write a small JSON override file.

`init_project.sh` deep-merges these into the project's own `config.json`; every script reads that file. `{channel}`, `{tiktok}`, `{youtube}`, `{fanpage}` placeholders are filled everywhere (script text, outro, watermark, thumbnails, metadata).

When the user asks to change a setting permanently ("đổi tên kênh TikTok thành …", "đổi màu nhấn", "render 720p"), write only the changed keys into the Project doc `stickman-history/config.json` (read it first, merge, `project_write` the full JSON) and confirm which keys changed. If no Project is attached, give them the override JSON and mention that editing the plugin's `config.json` (via the plugin customizer) makes it the default everywhere.

## Arguments

`/stickman-history [chủ đề] [thời lượng, mặc định config video.targetMinutes] [giọng, mặc định config voice.name]`
Missing topic → ask. Otherwise use defaults; at most one AskUserQuestion round for genuinely open choices (angle, audience).

## Workflow

Create a task list with these steps. Run TTS and render with `nohup … &` and poll with `sleep` ≤ 115 s per call.

### 1. Project
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/stickman-history/template/pipeline/init_project.sh <slug> [/tmp/override.json …]
cd <slug> && bash pipeline/setup_env.sh      # READY, or see paper-tear-video/references/troubleshooting.md
```
The base (fonts, cloned voice, `tts.py`, `setup_env.sh`, package.json) is shared with the sibling `paper-tear-video` template.

### 2. Research
WebSearch/WebFetch the topic (vi.wikipedia is cache-only → use en.wikipedia and reputable Vietnamese sources; for Vietnamese history prefer Đại Việt sử ký toàn thư). Collect dates, names, cause → events → result, one or two quotable lines. Keep a source list for the YouTube description.

### 3. Script → `script.json`
Follow `references/script-schema.md` and imitate `references/example-script.json` (Bạch Đằng 938, 21 scenes). Use the v2 visuals deliberately: a `map` scene for every march or fleet movement, `camera.keys` close-ups at emotional beats, a `sky` per mood (dawn/dusk/night/storm), `fog`/`smoke`/`fire` for atmosphere, `moods` on key characters, and vary `transition` (scroll for explainers, page/fade for time jumps). Words = minutes × 60 × `voice.wordsPerSecond` (≈ 1,100 for 4 min); scenes of 40–70 words; chapter stamps every 3–4 scenes; TTS-safe text (numbers as words, no quotes/brackets/dashes); digits for captions via `capReplace`. The last scene is `{"kind": "outro", "items": []}` with text ending in the config `channel.outroLine` — `apply_config.py` fills its card. Then:
```bash
python3 pipeline/apply_config.py          # injects voice, voiceRef, branding, music volume, outro card
```
Send the outline (scene labels, one line each) via SendUserMessage and continue.

### 4. Voice, assets, layout previews (in parallel)
```bash
nohup python3 pipeline/tts.py > pipeline/tts.log 2>&1 &
python3 pipeline/make_assets_h.py <seconds + 20>
python3 pipeline/build_story.py --fake
F=$(python3 pipeline/sheet.py frames "0.3,0.75" s01,s02,s03) && node stills.mjs $F /tmp/st && python3 pipeline/sheet.py make /tmp/st /tmp/st.jpg 3
```
Read every sheet. Check: main characters scale ≈ 1.3–1.5, labels clear of titles and the top-left chapter stamp, nothing important below y 940 (captions), figures stand on ground/bank not in water, boats/stakes/tide behave as intended. Fix `script.json` and re-preview.
After TTS finishes, compare words/s per scene; an outlier (±15 %) means garbled audio → delete that wav and its key in `pipeline/durations.json`, rerun `tts.py`.

### 5. Render
```bash
python3 pipeline/build_story.py
nohup bash pipeline/render.sh <slug> > out/render.log 2>&1 &
```
`render.sh` uses `render.*`, `video.resolution`, `audio.limiter` and writes `out/master.mp4` then `out/<slug>-16x9.mp4` with channel metadata. ≈ 3.5 fps at 1080p on 2 cores (4 min ≈ 35 min + 1 min encode); `video.resolution: "720p"` ≈ 2.3× faster. Poll `tr '\r' '\n' < out/render.log | grep -v -i memory | tail -1` until `RENDER_DONE`.

### 6. Verify
Extract ~16 frames (`ffmpeg -ss <t> -i out/<slug>-16x9.mp4 -frames:v 1 -vf scale=640:-1 out/fr/tNNN.jpeg`), `python3 pipeline/sheet.py make out/fr /tmp/video.jpg 4`, Read it. `ffmpeg -i … -af volumedetect -f null -` → mean ≈ −18 dB.

### 7. Thumbnails (always)
Edit `src/thumb.json` into the video's most dramatic moment (same item schema; `frame` 150 with `audioFrames` 150, stuck boats / climax pose, empty sky in the top third for text), then:
```bash
npx remotion still Thumb /tmp/thumb_art.png --frame=0
python3 pipeline/thumbs.py /tmp/thumb_art.png out/thumbs "<KICKER · NĂM>" "<DÒNG 1>" "<DÒNG 2 có *chữ nhấn*>" "<câu gợi tò mò>"
```
Read `out/thumbs/thumb-check.jpg` (TikTok full | 3:4 profile crop | YouTube at feed sizes). Rules: ≤ 6 big words, headline must not cover the main character's head, the Vietnamese diacritics must be intact, everything true to the video. Adjust `thumb.json` or text and rerun.

### 8. Deliver
- Files ≤ 30 MB → copy to `/mnt/user-data/outputs/` and SendUserFile (video, `youtube-thumbnail.jpg`, `tiktok-cover.jpg`).
- Linked folder → `device_commit_files` into `<folder>/<slug>/`. Files > 20 MB: `gzip -c` then `split -b 15m`, commit the parts into `<slug>/_build/`, on the device `cat parts | gunzip > <file>`, compare md5, then ask once for delete permission and remove `_build`.

### 9. Metadata
Write TikTok + YouTube metadata in the reply following `references/meta.md` (uses `config.meta` and `config.channel`; YouTube chapters from the scene start times printed by the snippet there).

### 10. Wrap-up
Append a short note (topic, length, voice, issues) to the Project doc `claude/stickman-history-notes.md` when a Project is attached. If the engine was extended, say so and offer to repackage the plugin.

## References
- `references/config.md` – every config key, defaults, what it affects.
- `references/script-schema.md` – scene/item schema, poses, hats, weapons, layout rules, extending the engine.
- `references/meta.md` – TikTok/YouTube metadata template and rules.
- `references/example-script.json` – complete 4-minute example.
