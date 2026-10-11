---
name: video-meta
description: "This skill should be used when the user runs '/video-meta' or '/quancoder-video:video-meta', or asks for 'meta để đăng video', 'caption TikTok', 'tiêu đề YouTube Shorts', 'hashtag Reels', 'mô tả video', 'metadata upload', or wants titles, captions, hashtags, tags and a pinned comment for posting a vertical video (especially one made with /paper-tear-video or /affiliate-video-01) to TikTok, YouTube Shorts, Instagram/Facebook Reels."
metadata:
  version: "0.1.0"
  author: "Quan"
---

# Upload metadata for vertical videos

Produce ready-to-paste Vietnamese metadata for TikTok, YouTube Shorts and Instagram Reels.

## Inputs

Gather from context, in this order: `script.json` of the project (title, scene labels, final question), `src/data.json` (total frames/fps → duration), `out/credits.txt`, any `out/*-p*.mp4` parts. If none exist, ask the user for topic and duration.

## Rules

0. Branding: default channel is TikTok "Thế Giới Donghua" and fanpage "Ban Công Thố" (or `script.json` → `branding`). Mention both in every caption/description and end the pinned comment with "Theo dõi Thế Giới Donghua để xem thêm". Add a line "Video gốc thuộc Thế Giới Donghua – vui lòng không reup" to the YouTube description.

1. Check current length limits with WebSearch before answering (last known, Sept 2026: Shorts ≤ 3 min, Reels ≤ 3 min, Facebook Reels ≤ 90 s, TikTok up to 60 min). If the video exceeds a platform limit, say so first and give per-part metadata (Part 1/N titles built from the chapter labels each part covers). Offer to run `finalize.py --split` if parts do not exist yet.
2. Character limits: YouTube title ≤ 100 (aim ≤ 60 so it is not truncated), YouTube description ≤ 5,000, TikTok caption ≤ 4,000 (first ~100 chars visible), Instagram caption ≤ 2,200 and ≤ 30 hashtags (use 5–8).
3. Hook first: the first line of every caption is a curiosity question or a vivid "what if", never a summary.
4. Hashtags: 3 broad (#xuhuong, #tiktokvietnam, #shorts on YouTube only), 4–6 topic-specific, all lowercase without diacritics.
5. Attribution: CC BY / BY-SA photos require credit. If `credits.txt` fits (YouTube ≤ 5,000 chars), paste it in the description; otherwise add a short line ("Hình ảnh: Creative Commons, danh sách tác giả trong bình luận ghim / link") and suggest hosting the list (public doc) and linking it.
6. Mention the voiceover tool (VieNeu-TTS) in the YouTube description; platforms increasingly require AI-content disclosure. Remind the user to toggle the platform's "AI-generated / altered content" label when uploading (TikTok "AI-generated content" setting, YouTube "Altered or synthetic content" when realistic).

## Affiliate videos (made with /affiliate-video-01)

When `script.json` has a `product` block: skip the channel-branding rule 0 unless the user wants it, put a clear affiliate disclosure in every caption ("Video có gắn link tiếp thị liên kết" + #tiepthilienket), never paste claims the video avoided (see affiliate-video-01/references/compliance.md), keep prices out of titles (they change) or add "giá lúc đăng", tell the user to attach the product with the platform's own tool (TikTok Shop: Thêm liên kết → Sản phẩm; Shopee Video: Gắn sản phẩm) and put their affiliate link (`product.url`) in bio/pinned comment where the platform allows links.

## Output format (in the reply, no file unless asked)

- **TikTok** – cover text (≤ 6 words, caps; reuse the headline of `out/cover.jpg` when it exists), caption, hashtags. Remind: upload `cover.jpg` as the cover (TikTok: Chọn ảnh bìa → Tải lên; Instagram: Ảnh bìa → Thêm từ thư viện; YouTube Shorts on mobile: pick the frame time printed by cover.py, or upload the thumbnail from YouTube Studio on desktop).
- **YouTube Shorts** – title(s), description, tags (comma list, ≤ 500 chars total).
- **Instagram Reels** – caption (+ "Phần x/N" when split), hashtags.
- **Pinned comment** – one engagement question with numbered choices.
- **Posting tips** – 2–3 bullets max (post when the account analytics show the audience is most active, pin the comment immediately, reply to early comments).

End with a one-line offer (split into parts, make a thumbnail frame, or translate the metadata to English).
