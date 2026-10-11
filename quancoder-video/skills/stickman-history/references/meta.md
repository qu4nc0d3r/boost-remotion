# Upload metadata (TikTok + YouTube long-form)

Inputs: `script.json` (title, chapters, scene texts), `config.json` (`channel`, `meta`), research source list, `src/data.json` for timing.

YouTube chapter times (first must be 0:00, each ≥ 10 s, ≥ 3 chapters):
```bash
python3 -c "
import json;d=json.load(open('src/data.json'));cur=0
for i,s in enumerate(d['scenes']):
  st=0 if i==0 else cur-d['tear'];t=(st+s['lead'])/d['fps']
  print('%d:%02d'%(t//60,t%60),s['label'],s.get('chapter') or '');cur=st+s['duration']"
```
Use chapter-stamp scenes plus the hook, climax and ending (7–10 entries), with readable names.

## Rules
- Hook first: every caption/description opens with a curiosity question or "what if", never a summary.
- True to the video; no claims the video avoided; no exaggerated numbers.
- Hashtags lowercase, no diacritics: `meta.hashtagsBroad.<platform>` + 3–5 topic tags + `meta.hashtagsFixed`.
- Every text mentions `channel.tiktok` and `channel.fanpage`; YouTube description also has `channel.noReupLine`, `meta.aiDisclosure`, `meta.artCredit` and the source list.
- Limits: YouTube title ≤ 100 (aim ≤ 60), description ≤ 5,000, tags ≤ 500 chars; TikTok caption ≤ 4,000 (first ~100 chars visible).
- Remind: TikTok "AI-generated content" toggle (AI voice); YouTube "Altered or synthetic content" is usually "No" for obvious cartoons, but keep the AI-voice line in the description.

## Output (in the reply)
**TikTok** – cover text (≤ 6 words, reuse the thumbnail headline), caption, hashtags; upload `tiktok-cover.jpg` (Chọn ảnh bìa → Tải lên). A 16:9 video shows letterboxed on TikTok — offer a 9:16 cut-down.
**YouTube** – 3 title options, description (hook, 2–3 sentence story, ⏱ chapters, 📚 sources, 🎨 art credit, 🎙 AI voice, 👉 channels, no-reup line, 3 hashtags), tags; upload `youtube-thumbnail.jpg`.
**Pinned comment** – one question with 3 numbered choices, ending with `channel.follow`.
**Tips** – max 3 bullets (pin the comment immediately, reply to early comments, post when analytics show the audience is active).
