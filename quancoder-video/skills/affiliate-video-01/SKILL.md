---
name: affiliate-video-01
description: "This skill should be used when the user runs '/affiliate-video-01 [url sản phẩm] [thời lượng] [giọng] [style giọng]' or '/quancoder-video:affiliate-video-01 …', or asks to 'làm video affiliate', 'video tiếp thị liên kết', 'video bán hàng cho link Shopee/TikTok Shop/Lazada', 'video review sản phẩm có FOMO', or wants a short 9:16 product video with hook, zoom-punch product shots, social proof, struck-through price, countdown-free FOMO and a 'bấm giỏ hàng' CTA, narrated with VieNeu-TTS in a chosen voice style (hài hước, nhí nhảnh, nghiêm túc, nhẹ nhàng, kịch tính, hào hứng)."
metadata:
  version: "0.1.0"
  author: "Quan"
---

# Affiliate Video 01 — FOMO motion (9:16)

Turn a product link into a finished 1080×1920 MP4 (15–60 s): product data from the page → Vietnamese script in the requested voice style → VieNeu-TTS voiceover → Remotion motion graphics (kinetic word-by-word captions, zoom-punch product card, pop-up chips, step cards, counting "đã bán" + filling stars + real review bubbles, struck price → new price slam + discount badge + flash, before/after wipe, bouncing arrow to the cart) → procedural beat + SFX matched to the style → cover frame.

## Arguments

`/affiliate-video-01 [url sản phẩm] [thời lượng, mặc định 25 s] [giọng, mặc định "Giọng Donghua"] [style giọng, mặc định "hào hứng"]`

- URL is required; ask for it if missing. Accept Shopee (incl. `s.shopee.vn` short links), TikTok Shop, Lazada, Tiki or any product page.
- Duration: parse "20s", "30 giây", "1 phút". Clamp to 15–60 s (say so if clamped).
- Voice: "Giọng Donghua" = the owner's cloned voice (`voiceRef: "voices/giong-donghua.wav"`). A preset name (e.g. "Trúc Ly", "Ngọc Huyền", "Thiện Minh", "Hải Đăng") → remove `voiceRef`, set `voice` to the preset. A clip the user supplies → clone it only if it is their own voice or they state the speaker consents.
- Style: free text, resolved by `pipeline/styles.py` (hài hước, nhí nhảnh, nghiêm túc, nhẹ nhàng, kịch tính, hào hứng + aliases like funny, cute, chill, drama). Unknown text → closest preset, tell the user which one was used. Read `references/voice-styles.md` before writing the script — the wording carries most of the style.

Missing optional arguments → use defaults without asking. Ask at most one AskUserQuestion round, only for something genuinely open (e.g. which variant/combo to feature when prices differ a lot).

## Files

- `template/` — Remotion 4.0.529 project (`src/Aff.tsx` scene kinds, composition id `Aff`) + pipeline: `setup_env.sh`, `styles.py`, `tts.py`, `check_audio.py`, `aff_assets.py`, `prep_images.py`, `aff_build.py`, `review.py`, `finalize.py`, `stills.mjs`. Fonts (OFL) and the cloned voice ship inside. Copy it, never edit in place.
- `references/product-data.md` — getting name, prices, sold, rating, reviews and images from Shopee/TikTok Shop/Lazada (login walls, anti-bot).
- `references/scene-kinds.md` — JSON fields of every scene kind, structure per duration, word budget.
- `references/voice-styles.md` — style presets, wording rules and example lines per style.
- `references/compliance.md` — claims, prices, reviews, FOMO and disclosure rules. Always follow it.
- `references/example-script.json` — a complete 7-scene script (style hài hước).

## Workflow

Create a task list with these steps. Run long jobs with `nohup … &` and poll.

### 1. Product data (research first)

Follow `references/product-data.md`. Record in `script.json` → `product`: name, url, variant used for the price, price, oldPrice, discount, sold, rating, ratingCount, 2–4 real review snippets (shorten, keep meaning, mask usernames like `aml***`), key specs/ingredients/usage from the description, and the seller's claims you must NOT repeat (health/medical, "số 1", etc.). Collect every gallery image id/URL.

### 2. Project + images

```bash
cp -r ${CLAUDE_PLUGIN_ROOT}/skills/affiliate-video-01/template ./<slug> && cd ./<slug>
bash pipeline/setup_env.sh                       # READY or BLOCKED (offline bundles: ${CLAUDE_PLUGIN_ROOT}/skills/paper-tear-video/references/troubleshooting.md)
python3 pipeline/prep_images.py fetch <id-or-url> …   # → public/img/p01.jpg … + out/images.jpg
```

Read `out/images.jpg`. Note which image is the hero pack shot, lifestyle, hand-held, ingredients/specs, how-to, combo. Crop away seller text that carries forbidden claims or clutter: `prep_images.py crop p06 0 0.29 1 1 p06c` (fractions). Square images fill 9:16 by cropping the sides, so keep the product centred. If the page gives fewer than 3 usable images, ask the user for photos/screenshots (`prep_images.py local <files>`).

### 3. Script (`script.json`)

Follow `references/scene-kinds.md` + `references/voice-styles.md` + `references/compliance.md`. Word budget = (duration − 1.5 s CTA hold) × style `wps`. Every number in `text` is written out in words for TTS ("chín mươi tư nghìn đồng", "bốn chấm tám sao"); on-screen fields use digits ("94.400đ", "4.8"). Set `voiceStyle`, `voice`/`voiceRef`, and a `palette` taken from the packaging (primary = brand colour, dark = a very dark shade of it, accent = red/pink for price, highlight = yellow unless the brand is yellow, light = cream/white).

Show the user a compact outline (scene kind + narration line) via SendUserMessage, then continue without waiting unless they asked to approve first.

### 4. Voice, music, timing

```bash
nohup python3 pipeline/tts.py > pipeline/tts.log 2>&1 &     # style temperature + tempo/pitch applied
python3 pipeline/aff_assets.py <duration + 10>               # beat + SFX for the style
python3 pipeline/check_audio.py                              # after TTS: faster-whisper transcript per scene
```

`check_audio.py` needs `pip install faster-whisper --break-system-packages` once. It spells digits back into Vietnamese words before matching. For every CHECK line, compare script vs heard: if a price, number, discount or the product name is missing or wrong, rephrase slightly (e.g. add "đồng", "chỉ còn"), delete that scene's wav + its key in `pipeline/durations.json`, rerun tts.py and check again. Ordinary mishearings of other words are fine. Total narration should land within ±15 % of the target; otherwise trim/extend text and regenerate.

```bash
python3 pipeline/aff_build.py                # → src/aff.json (timing, element beats, SFX cues, palette, energy)
node stills.mjs out/stills.jpg               # 2 stills per scene; red = platform UI zones
```

Read the stills. Check: big text not clipped at the edges, nothing important inside red zones, captions readable, no forbidden seller claim visible in any image, price and badge correct, chips not overlapping each other. Fix via script fields (`bigSize`, shorter text, `\n` line breaks, another image/crop) and rebuild.

### 5. Render, verify, finalize

```bash
npx remotion render Aff out/master.mp4 --concurrency=2 --crf=20 --audio-codec=aac --audio-bitrate=192k
python3 pipeline/review.py video out/master.mp4 out/video.jpg      # 1 fps sheet + loudness (mean ≈ −19 dB, max < 0 dB)
python3 pipeline/finalize.py --slug <slug> [--cover-at <sec>]      # out/<slug>-9x16.mp4 + out/<slug>-cover.jpg
```

Rendering is fast (≈ 30 s video in 1–2 min). Read the sheet before delivering.

### 6. Deliver

- Connected folder → copy the MP4 and cover to `/mnt/user-data/outputs/`, SendUserFile them, and commit both next to the user's other videos (MP4s here are usually 8–15 MB, under the 20 MB commit cap; if larger, re-encode with `-crf 26` first).
- Reply in Vietnamese: one line on what was made (style, length, voice), what product facts were used, and anything deliberately left out per `references/compliance.md`.
- Save a short note (product, style, length, issues) to the project with `project_write` (append to `claude/affiliate-video-notes.md` if it exists).
- Offer `/quancoder-video:video-meta` for captions/hashtags; for affiliate posts it must add an affiliate disclosure (e.g. "#tiepthilienket / Video có gắn link tiếp thị liên kết") and remind the user to attach the product via the platform's own product/cart tool.

## Tuning knobs (in the copied project)

- `script.json`: `musicVolume` (default 0.16), `ctaHoldSec` (1.5), `ctaArrow` ("bottom-left" for TikTok Shop / Shopee Video product anchor, "bottom-center"), per-scene `caption: false`, `bigSize`, `pos` (object-position for `chips` images), `chipX`.
- `pipeline/styles.py`: add or adjust presets (temperature, tempo, semitones, bpm, mood, sfx, energy, wps).
- `src/Aff.tsx`: add a scene kind → also add its beats in `aff_build.py` → document it in `references/scene-kinds.md`.
