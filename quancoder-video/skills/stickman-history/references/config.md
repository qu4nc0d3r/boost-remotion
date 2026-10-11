# config.json – field guide

Placeholders `{channel}` (= `channel.name`), `{tiktok}`, `{youtube}`, `{fanpage}` work in every string.
Read a resolved value inside a project: `python3 pipeline/config.py get channel.name`.

## channel
| key | default | used by |
|---|---|---|
| `name` | Thế Giới Donghua | outro card, thumbnails, MP4 artist, metadata |
| `tiktok`, `tiktokHandle` | Thế Giới Donghua, "" | outro card, captions, metadata (@handle if set) |
| `youtube`, `youtubeHandle` | Thế Giới Donghua, "" | YouTube description |
| `fanpage` | Ban Công Thố | outro card, metadata |
| `watermark`, `watermarkSub` | {channel}, TIKTOK · FB BAN CÔNG THỐ | moving watermark (2 lines) |
| `outroLine` | "Nếu thấy câu chuyện hay, hãy theo dõi kênh {channel}…" | spoken last sentence (copy into the outro scene text) |
| `outroCard {kicker,title,sub}` | CẢM ƠN BẠN ĐÃ XEM / {channel} / TikTok · FB | outro scene drawn by apply_config.py when its items are empty |
| `noReupLine` | Video gốc thuộc {channel} – vui lòng không reup. | MP4 comment, YouTube description |
| `follow` | Theo dõi {channel} để xem thêm. | pinned comment ending |

## voice
`name` (VieNeu preset or cloned name), `ref` (3–8 s wav inside the project, `null` = preset voice), `wordsPerSecond` (script length math and `--fake` previews; Giọng Donghua ≈ 4.6).

## video
`targetMinutes` (4), `fps` (30), `resolution` ("720p" | "1080p" | "1440p" | "4k" → render `--scale`; the drawing canvas is always 1920×1080 logical px), `transitionFrames` (ink-wipe length, 18), `captions` (true), `captionFontSize` (46), `captionMaxWords` (11 per caption phrase), `chapterSeconds` (how long the chapter stamp stays, 3.7).

## audio
`musicVolume` (0.11), `sfxVolume` (multiplier for scene SFX, 1.0), `transitionSwishVolume` (0.35), `limiter` (0.89 → delivery encode `alimiter`).

## style
`ink`, `accent` (our side, stamps, titles in red), `enemy` (opposing side caps/flags), `gold`, `water` (hex); `paperTone` [r,g,b multipliers], `stains`, `vignette` (paper texture — rerun make_assets_h.py after changing); `lineBoil` (wobble strength, 0 = static lines); `watermark` (bool), `watermarkOpacity`, `watermarkEverySeconds`; `defaultSky` (day), `skyStrength` (0.6), `paperOverlay` (paper grain over the colours, 0.45; 0 = flat colours), `transition` (default scene transition: ink/scroll/page/fade/cut), `chapterCard` (big brush banner on chapter scenes, true).

## render
`concurrency` (2; ~75 % of CPU threads on a local machine), `masterCrf` (18), `masterPreset` (ultrafast — x264 preset of the intermediate `out/master.mp4`; leaves the CPU to Chrome, ≈ 150 MB per minute, re-encoded below), `deliveryCrf` (27 ≈ 28 MB per 4 min), `x264Preset` (slow), `audioBitrate` (160k).

## thumbnail
`youtube` [1280,720], `tiktok` [1080,1920], `showChannel` (true), `youtubeSubLine` (false — keep YouTube to ~6 words).

## meta
`platforms` (["tiktok","youtube"]), `hashtagsBroad` per platform, `hashtagsFixed` (always added), `aiDisclosure`, `artCredit`, `youtubeChapters` (true).

## Override examples
Permanent (Project doc `stickman-history/config.json`):
```json
{"channel": {"name": "Sử Việt Que", "tiktok": "suvietque", "tiktokHandle": "@suvietque", "youtube": "Sử Việt Que", "fanpage": "Sử Việt Que", "watermarkSub": "TIKTOK · @SUVIETQUE"}}
```
One video: `{"voice": {"name": "Thiện Minh", "ref": null}, "style": {"accent": "#1f6f43"}, "video": {"resolution": "720p"}}`
