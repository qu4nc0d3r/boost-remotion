---
name: paper-tear-video
description: "This skill should be used when the user runs '/paper-tear-video [chủ đề]' or '/quancoder-video:paper-tear-video [chủ đề]', or asks to 'tạo video 9:16', 'làm video paper tear', 'video xé giấy', 'video dọc có lồng tiếng', 'video Shorts/Reels/TikTok về chủ đề X', 'làm video giống video tu tiên', or wants an end-to-end narrated vertical video built with Remotion, VieNeu-TTS voiceover and Creative Commons photos from the internet in the paper-tear collage style, including donghua/anime character analyses that use official stills of the work."
metadata:
  version: "0.1.0"
  author: "Quan"
---

# Paper-Tear Video (9:16, end-to-end)

Produce a finished vertical MP4 (1080×1920, 30 fps) from a topic: Vietnamese script → VieNeu-TTS voiceover → CC photos (Openverse/Flickr/Wikimedia) → Remotion render with torn-paper transitions, torn-paper photo cutouts, chapter labels and torn-note captions → compressed deliverable, credits, optional ≤3-min parts, a FOMO cover image cut from a frame, then upload metadata.

Style rules that define this format (never break them): no slides, no abstract geometric shapes, real photos only, every transition is a paper tear, captions sit on torn paper notes, grain overlay on everything, and every video carries the owner's anti-reupload branding.

## Default voice (cloned)

Use the channel owner's cloned voice by default:

```json
"voice": "Giọng Donghua", "voiceRef": "voices/giong-donghua.wav"
```

`voices/giong-donghua.wav` (7 s, taken from the owner's own video) ships in the template; `tts.py` enrolls it with `add_voice` on every run. Speaker similarity vs. the owner's real voice measured 0.87 (preset Thiện Minh: 0.33). If the user asks for a preset voice, remove `voiceRef` and set `voice` to a preset name. To clone a new voice, see "Cloning a voice" in `references/script-writing.md` — only from the user's own voice or with the speaker's consent.

## Default branding (anti-reupload)

Unless the user names another channel, use:

```json
"branding": {"channel": "Thế Giới Donghua", "sub": "TIKTOK · FB BAN CÔNG THỐ", "tiktok": "Thế Giới Donghua", "fanpage": "Ban Công Thố", "endKicker": "CẢM ƠN BẠN ĐÃ XEM"}
```

It renders five layers, all driven by `script.json` → `branding` (see `src/Brand.tsx`):
1. Moving watermark — channel name + `sub` line, ~62 % opacity, hops between 4 safe spots every 7 s in a pseudo-random order (defeats a single static crop/blur box; avoids the chapter label, caption band and TikTok's right-side buttons). Hidden on the end card.
2. Signature on every caption note (bottom-right, small) — cropping it out removes the subtitles.
3. "— channel —" line on the opening title card.
4. Outro scene (`"kind": "outro"`, no queries): torn-paper end card with channel, TikTok name and fanpage, plus a spoken line naming the channel (audio branding survives re-encoding and cropping).
5. MP4 metadata (artist, copyright, comment "Bản gốc thuộc … Không reup.") written by `finalize.py`.

Always append the outro scene as the last scene:

```json
{"id": "outro", "kind": "outro", "label": "Theo dõi", "text": "Video được thực hiện bởi kênh Thế Giới Donghua. Hãy theo dõi kênh trên TikTok, và ghé fanpage Ban Công Thố để xem thêm những câu chuyện mới nhé.", "queries": []}
```

## Arguments

`/paper-tear-video [chủ đề] [thời lượng, mặc định 6 phút] [giọng, mặc định "Giọng Donghua" (giọng nhân bản của chủ kênh)]`

If the topic is missing, ask for it. If length or voice is missing, use the defaults without asking. Ask at most one AskUserQuestion round (only for genuinely open choices such as tone or angle), then work.

## Files

- `template/pipeline/franchise_media.py` – official stills/key art of a specific work (Fandom wiki API + AniList).
- `template/pipeline/user_media.py` – scan/still/clip helper for user-supplied donghua footage.
- `template/pipeline/cover.py` – cover/thumbnail from a video frame with FOMO text on torn paper.

- `${CLAUDE_PLUGIN_ROOT}/skills/paper-tear-video/template/` – complete Remotion project + pipeline (copy it, never edit in place).
- `references/script-writing.md` – script structure, pacing math, TTS-safe writing.
- `references/images.md` – candidate search, contact-sheet review, picking rules.
- `references/troubleshooting.md` – blocked registries, offline bundle via the linked computer, known bugs and fixes, delivery limits. Read it as soon as anything fails.
- `references/example-script.json` – a complete 24-scene script (6.4 min) to imitate.

## Workflow

Create a task list with these steps and work through them. Run long jobs (TTS, render) with `nohup … &` and poll with `sleep` ≤ 580 s per call.

### 1. Set up the project

```bash
cp -r ${CLAUDE_PLUGIN_ROOT}/skills/paper-tear-video/template ./<slug> && cd ./<slug>
bash pipeline/setup_env.sh
```

`setup_env.sh` prints `READY` or `BLOCKED: …` (exit 2). On any BLOCKED line, follow the "Network blocked" section of `references/troubleshooting.md` (ask the user to allow the domains, or build the offline bundle on the linked computer). Do not start writing code workarounds for blocked registries.

### 2. Write the script (`script.json`)

Follow `references/script-writing.md`. Key numbers: VieNeu "Thiện Minh" reads ≈ 4.1 words/s; target words = seconds × 4.1 (6 min ≈ 1,500 words); ~15 s per scene (≈ 60 words) → 24 scenes for 6 min. Each scene: `id` (s01…), `label` (2–4 words), `text` (TTS-safe Vietnamese), `queries` (exactly 2 short English photo queries). Also fill `title`, `voice`, `chapterWord`, `titleCard {kicker, lines[], accent}`, `accentColor`, `branding` and the outro scene (see Default branding).

Show the user a compact outline (scene labels + one line each) via SendUserMessage, then continue without waiting unless they asked to approve first.

### 3. Assets, voiceover, images (run TTS in the background while picking images)

```bash
nohup python3 pipeline/tts.py > pipeline/tts.log 2>&1 &     # writes public/audio/*.wav + pipeline/durations.json
python3 pipeline/make_assets.py <seconds = target length + 20>  # paper textures, grain, rip SFX, music bed
python3 pipeline/candidates.py                               # 8 candidates per query + contact sheets
```

Run `python3 pipeline/review.py pages <tmpdir>` and Read every page, choose per `references/images.md`, write `pipeline/picks.json`, then `python3 pipeline/fetch_picks.py`. Run `python3 pipeline/review.py picks <tmp>/picks.jpg` (prints DUPLICATE lines) and Read the overview before moving on.

After TTS finishes, sanity-check words/second per scene (all within ±10 % of each other; an outlier means garbled audio → delete that wav and its entry in durations.json, rerun tts.py).

### 3b. Images of the work itself (character analyses, donghua/novel topics)

When the topic is about a specific donghua, anime or novel adaptation (e.g. "phân tích nhân vật Trần Bình An trong Kiếm Lai"), most scenes should show that work, not generic CC photos. Aim for ≈ 60–80 % of slots from the work, CC photos for abstract beats.

**A. Official stills and key art (automatic).**
1. Identify the work's official titles (Vietnamese / Chinese / English, e.g. Kiếm Lai = 剑来 = Sword of Coming = Jian Lai) and character romanizations (Trần Bình An = 陈平安 = Chen Ping'an) with WebSearch.
2. Find its Fandom wiki subdomain with WebSearch ("<english title> fandom wiki"; Kiếm Lai → `sword-of-coming`).
3. `python3 pipeline/franchise_media.py wiki <subdomain> <tmp> "<Character 1>" "<Character 2>" "<place/event>" …` and `python3 pipeline/franchise_media.py anilist "<title>" <tmp>`; Read the sheets (tiles: `id WxH name`).
4. Pick only official material: episode screenshots, posters and key art carrying the show's logo or platform branding. Skip fan art, edits, memes, cosplay, AI images, and anything with another channel's watermark. Images under ~1000 px on the long side go in slot 2 (the cutout); large ones can be backgrounds.
5. `python3 pipeline/franchise_media.py fetch <id> …` → `user/fr_<id>.jpg`; credits go to `pipeline/franchise_credits.json` and finalize.py lists the ones used.

Never download episodes or clips from video platforms (TikTok, YouTube, Bilibili, Tencent Video, Dailymotion…) or pirate sites.

**B. User footage (optional).** For moving shots, ask the user to drop their own screenshots/screen recordings into a `donghua/` subfolder of the connected folder. Stage them into `media_in/`, run `python3 pipeline/user_media.py scan media_in <tmp> --every 3`, Read the sheets, then `user_media.py still <id>` or `user_media.py clip <file> <sec> <dur>` (4–8 s, muted, loops if short).

**Wiring.** In script.json set per scene `"media": [slot1, slot2]` with paths relative to `public/` (e.g. `["user/fr_12.jpg", "user/fr_1.jpg"]`); use `null` to keep the CC photo in a slot. Keep `queries` too, as fallback. Add `"mediaCredits": ["Kiếm Lai (剑来) © <studio/nhà phát hành>"]` after verifying the rights holder with WebSearch.

Check the preview stills: wide 16:9 stills are centre-cropped to 9:16 as backgrounds, so make sure the character's face survives the crop (otherwise use it as the cutout). Say once to the user: official stills used for analysis/commentary are common practice, but TikTok/YouTube/Facebook can still mute, limit or remove videos; narration, short shots and the collage treatment lower that risk without removing it.

### 4. Build timing and preview

```bash
python3 pipeline/build_data.py                  # src/data.json: scene durations, caption phrases aligned to pauses
python3 pipeline/review.py stills <tmp>/stills.jpg   # 16 stills: 4 scenes × (content, content, mid-tear, late-tear)
```

Read the grid (red = platform UI zones). Check: no text inside red zones, title card fits, watermark visible but not covering label/captions, labels not clipped, cutout visible, captions readable, torn halves flying apart during transitions (not a static white line).

### 5. Render

```bash
nohup npx remotion render Main out/master.mp4 --concurrency=2 --crf=20 --audio-codec=aac --audio-bitrate=192k > out/render.log 2>&1 &
```

Expect ≈ 3.8 frames/s on 2 cores (6 min ≈ 50 min). Poll `tr '\r' '\n' < out/render.log | grep -v -i memory | tail -1`. For a small fix after rendering, re-render only the affected frame range (`--frames=a-b --muted`) and splice with ffmpeg trim/concat instead of re-rendering everything.

### 6. Verify and finalize

Run `python3 pipeline/review.py video out/master.mp4 <tmp>/video.jpg` and Read it; check audio with `volumedetect` (mean around −19 dB, max below 0 dB). Then:

```bash
python3 pipeline/finalize.py --slug <slug> [--split] [--chunks]
```

Use `--split` when the video is longer than 3 min (YouTube Shorts and Instagram Reels cap at 3 min; TikTok accepts long uploads). Use `--chunks` when the deliverable must reach the user's computer.

### 7. Deliver

- A connected folder exists → commit the `.gz.part.*` chunks (≤ 5 per call, 100 MB/call cap) into a `_build` subfolder, then on the device run `cat <name>.gz.part.* | gunzip > <name>` and compare md5 with the cloud copy. Never commit raw MP4 parts (they arrive corrupted); always gzip first.
- SendUserFile only files ≤ 30 MB (credits.txt, parts if small). Tell the user in one sentence which file lives only in their folder and why.
- Afterwards ask once for delete permission to clean up `_build`.
- Save a short note (topic, voice, length, issues) to the project with `project_write` when a Project is attached.

### 8. Cover image (always)

Every video ends with a cover/thumbnail cut from one of its own frames, with FOMO text on torn paper.

```bash
python3 pipeline/cover.py frames out/<slug>-9x16.mp4 <tmp>/cover_frames.jpg   # 2 frames per scene: <id>a (background only), <id>b (cutout pasted)
python3 pipeline/cover.py make out/<slug>-9x16.mp4 --at s03a \
    --kicker "Đấu Phá Thương Khung" --headline "DỊ HỎA HẠNG 2|NUỐT CẢ *KHÔNG GIAN*" --sub "…vậy mà bị chính chủ nhân nuốt chửng?"
```

Read the frames sheet and pick the frame with the strongest single subject: a character face or the key creature, large, sharp, in the upper half (the headline note covers the lower third). Avoid `s01a` (title card already has text), mid-tear frames, dark or blurry shots. `--at` also accepts seconds.

FOMO copy rules (Vietnamese with diacritics, all true to the video — curiosity, never a lie):
- `--kicker` (≤ 22 chars): the work or a context tag ("Đấu Phá Thương Khung", "ÍT AI BIẾT").
- `--headline` (2 lines, ≤ 16 chars each, `|` = line break, `*word*` = accent colour): a number, rank or superlative plus the most shocking claim ("DỊ HỎA HẠNG 2|NUỐT CẢ *KHÔNG GIAN*", "SỐNG 1 NGÀY|BẰNG *100 NĂM*").
- `--sub` (≤ 40 chars, handwritten): an open loop the video pays off ("…vậy mà bị chính chủ nhân nuốt chửng?"). Never reveal the ending.

The script hides the chapter label under the kicker strip and the caption under the headline note, keeps all text inside the centre 3:4 area (TikTok profile grid crop) and adds the channel line. Read `out/cover-check.jpg` (full | 3:4 grid crop | feed-size thumbnail): headline readable at thumbnail size, face not covered, no leftover subtitle or chapter text visible. Adjust `--at` or shorten the text and rerun if not.

Deliver `out/cover.jpg` with the video (commit it next to the MP4 as `<slug>-cover.jpg`; it is small, so also Write/SendUserFile it into the chat). Tell the user the frame time too (YouTube Shorts on mobile only lets you pick a frame from the video).

### 9. Upload metadata

Invoke the `video-meta` skill (or follow it) to produce TikTok / Shorts / Reels titles, captions, hashtags and the pinned comment, including the per-part titles when `--split` was used. Reuse the cover headline as the TikTok cover text.

## Tuning knobs (edit in the copied project, not the template)

- Safe area: every foreground layer (labels, cutouts, captions, title/end cards, watermark) is shrunk by `safeArea` in script.json (default `{"scale": 0.86, "offsetX": -24, "offsetY": -30}`) so nothing is hidden under TikTok/Reels/Shorts UI or cut off on taller phones; backgrounds and tears stay full-bleed. Lower `scale` (e.g. 0.82) if the user still sees clipping.

- `pipeline/build_data.py`: `T` (tear length, frames, default 24), caption max words per phrase (8).
- `src/Video.tsx`: tear axis/tilt pattern, SFX volume 0.55, music volume 0.13.
- `src/Scene.tsx`: cutout appears at 48 % of narration; label/caption positions; `ACCENT` from `accentColor`.
- Fonts are local (Be Vietnam Pro, Patrick Hand, Playfair Display, OFL) – no Google Fonts request needed.
