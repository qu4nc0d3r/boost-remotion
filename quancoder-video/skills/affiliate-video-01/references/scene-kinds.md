# Scene kinds, structure and word budget

Every scene: `id` (s01, s02 …), `kind`, `text` (narration, TTS-safe: numbers in words, no emoji, no abbreviations like "k", "sp", "ib"). Image paths are relative to `public/` (e.g. `img/p03.jpg`). On-screen text: short, CAPS for titles/chips, digits allowed. No emoji anywhere (fonts may not render them).

| kind | fields | what it shows |
|---|---|---|
| `hook` | `image` (blurred bg), `top` (white label, ≤ 16 chars), `big` (yellow, ≤ 2 lines × ~11 chars; auto-split), `bigSize?` | shaking pattern-interrupt text. Must be readable from frame 0 (thumbnail). |
| `product` | `image` (square card, hand-held or pack shot), `bg?` (blurred), `tag` (red chip top-left), `chip` (yellow chip under card), `chipX?` | zoom-punch product card that "breathes" |
| `chips` | `image` (full-bleed, no blur), `title` (green chip), `items` [2–4 strings, ≤ 14 chars each], `pos?` | features / ingredients popping in 2×2 |
| `steps` | `image` (blurred bg), `title`, `steps` [[big, small] × 2–4], `chip?` | numbered cards ("3 / TÚI LỌC") |
| `proof` | `image` (blurred bg), `count` (number to count to, 0 = hide), `countLabel` ("1.000+"), `countText` ("HỘP ĐÃ BÁN"), `rating` (0 = hide), `reviews` [[text, masked user, stars?] × 0–3] (stars only if known from the page) | counter, filling stars, review bubbles |
| `price` | `image` (full-bleed), `old?`, `new`, `badge?` ("-41%"), `note` (which variant + "lúc làm video") | strike → slam → flash → spinning badge |
| `compare` | `left`, `right` (images), `leftLabel`, `rightLabel` | before/after or 1 hộp vs combo, wipe reveal |
| `statement` | `image` (blurred bg), `big` (≤ 2 lines, auto-split at 14 chars), `sub?`, `top?`, `blur?` | one bold claim/benefit or a second hook ("NHƯNG KHOAN…") |
| `cta` | `image`, `main` ("BẤM GIỎ HÀNG"), `sub` ("xem giá hôm nay") | bouncing arrow to the cart anchor; held `ctaHoldSec` after the voice |

Optional on any scene: `caption: false` (hide kinetic caption).

## Structure by duration

Scene = 2.5–5 s (≈ 12–25 words). First scene ≤ 3 s.

| duration | scenes |
|---|---|
| 15–20 s | hook → product → price (fold one proof fact into its line) → cta |
| 21–30 s | hook → product → chips/steps/compare (1–2) → proof → price → cta |
| 31–45 s | hook → product → chips → steps or compare → statement (mid re-hook: "Nhưng điều mình thích nhất là…") → proof → price → cta |
| 46–60 s | as above + second chips/compare + second proof beat; keep a re-hook every ~15 s |

Proof before price (trust, then deal). CTA always last. Skip `proof` if the product has < 10 ratings (never invent).

## Word budget

words ≈ (duration − ctaHoldSec) × wps of the style (`styles.py`: 4.3 nhẹ nhàng … 5.1 nhí nhảnh). Measured: cloned "Giọng Donghua" reads ≈ 4.8–5.0 words/s at tempo 1.0.
