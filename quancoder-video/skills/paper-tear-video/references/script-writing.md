# Script writing for paper-tear videos

## Shape of `script.json`

```json
{
  "title": "Nếu ngày mai thế giới có thể tu tiên",
  "voice": "Thiện Minh",
  "chapterWord": "CHƯƠNG",
  "accentColor": "#b3261e",
  "titleCard": {"kicker": "NẾU NGÀY MAI", "lines": ["THẾ GIỚI", "CÓ THỂ"], "accent": "TU TIÊN"},
  "scenes": [
    {"id": "s01", "label": "Mở đầu", "text": "…", "queries": ["Huangshan clouds", "mountain sunrise fog"]}
  ]
}
```

- `titleCard` shows on scene 1 for ~6 s, then flies away. `kicker` is a small line (≤ 16 chars), `lines` are 1–2 big lines (≤ 10 chars each), `accent` is the red punch word (≤ 10 chars). Sizes auto-fit.
- `label` appears on the kraft paper strip as "<chapterWord> 02 / <label>" — 2–4 words, ≤ 18 chars.
- `queries`: exactly 2 per scene, 1–3 English words, concrete and photographable (e.g. "lightning storm", "Ha Long Bay", "stock exchange"). Avoid abstract words ("destiny", "power"), long phrases, and brand/character names. Query 1 fills the background (full-bleed), query 2 becomes the torn cutout pasted at mid-scene.

## Pacing

| Target | Scenes | Words total | Words/scene |
|---|---|---|---|
| 60 s | 4–5 | ≈ 230 | 50–60 |
| 3 min | 12 | ≈ 720 | 60 |
| 6 min | 24 | ≈ 1,500 | 60–65 |

Measured with VieNeu v3 Turbo "Thiện Minh": 3.97–4.32 words/s (mean 4.15). Each tear adds 0.8 s. Final length ≈ words / 4.15 + 0.8 × (scenes − 1) + 1.5 s.

## Narrative arc (works for any "what if" / explainer topic)

1. Hook in the first sentence — sensory, second person ("Hãy tưởng tượng…").
2. First reactions / the moment it starts.
3. The rule or mechanism that splits people or changes the game.
4. 10–16 scenes of consequences, each a different domain (economy, science, education, health, law, military, nature, travel, inequality, crime…). One domain per scene, one vivid concrete image per scene.
5. Climax (the most dramatic event).
6. Inner/moral turn (what it reveals about people).
7. Time-jump summary.
8. Direct question to the viewer + CTA ("hãy để lại bình luận: bạn sẽ chọn…").

## TTS-safe Vietnamese

- Write numbers as words ("hai trăm năm", "mười phút"); no digits, %, units, abbreviations (TP.HCM → Thành phố Hồ Chí Minh), no English words unless common.
- Sentences 6–20 words; use commas where a breath belongs — captions split on punctuation and snap to pauses, so punctuation also shapes subtitles.
- No quotes, brackets, emoji, or dashes as pauses; use commas/periods.
- Optional emotion tags work: `[cười]`, `[thở dài]` — use sparingly.

## Cloning a voice

1. Get the source from the user as a file (never download from TikTok/YouTube links); confirm it is their own voice or they have the speaker's consent.
2. `ffmpeg -i src.mp4 -vn -ac 1 -ar 48000 full.wav`; find 7 s windows that start/end in silence, are 70–90 % voiced, contain ≥ 2 pauses, have no music bed (gaps below −45 dB) and no clipping.
3. For each candidate: `tts.add_voice(name, clip)`, synthesize 2 test sentences, and score cosine similarity of `tts.engine.extract_speaker_emb(output)` against the mean embedding of 6 held-out real windows. Keep the best (≥ 0.85 is good; 8 s clips were not better than 7 s).
4. Save the winner to `voices/<slug>.wav`, set `voice` + `voiceRef` in script.json, and send the user a short demo to approve.

## Voices (VieNeu v3 Turbo presets)

Default is the cloned **Giọng Donghua** (voiceRef). Storytelling presets: **Thiện Minh** (nam, Bắc, kể chuyện), Thiền Tâm Đức (nam, Bắc, kể chuyện), Thanh Bình (nam, Bắc), Ngọc Linh (nữ, Bắc, kể chuyện), Thái Sơn (nam, Nam), Thục Đoan (nữ, Nam). Natural: Hải Đăng, Trúc Ly, Phạm Tuyên. News: Mai Anh, Minh Đức. Run `Vieneu().list_preset_voices()` to see all 25.
