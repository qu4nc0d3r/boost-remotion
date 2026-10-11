# Voice styles

VieNeu v3 Turbo has no emotion control (the style lives in the reference voice), so a style = **wording** (most important) + sampling temperature + tempo/pitch post-processing + music + SFX + motion energy. All numbers live in `pipeline/styles.py`.

| key (aliases) | temp | tempo | pitch | music | SFX | motion | wps |
|---|---|---|---|---|---|---|---|
| hao-hung — hào hứng, hype, sôi nổi (default) | 0.45 | 1.05 | 0 | pop 118 bpm | whoosh, pop, impact, ding | 1.0 | 4.9 |
| hai-huoc — hài hước, funny, vui nhộn, lầy | 0.60 | 1.08 | 0 | bouncy 124 | swish, boing, record scratch | 1.3 (wobble) | 5.0 |
| nhi-nhanh — nhí nhảnh, cute, dễ thương | 0.55 | 1.10 | +1 st | cute bells 128 | pop, sparkle | 1.25 | 5.1 |
| nghiem-tuc — nghiêm túc, chuyên gia, review chân thực | 0.35 | 1.00 | 0 | calm 96 | soft ticks only, no flash | 0.55 | 4.5 |
| nhe-nhang — nhẹ nhàng, chill, tâm tình | 0.35 | 0.97 | 0 | lofi 86 | minimal | 0.5 | 4.3 |
| kich-tinh — kịch tính, drama, hồi hộp | 0.45 | 1.03 | −0.5 st | tension (minor) 110 | boom, riser | 1.1 | 4.8 |

Pitch shifting a cloned voice lowers speaker similarity; keep |semitones| ≤ 1.5. For a female-sounding cute style, a female preset ("Trúc Ly", "Ngọc Huyền") works better than pitching a male voice — suggest it if the user picked nhí nhảnh with a male voice, but keep their choice.

## Wording per style (Vietnamese, spoken, TTS-safe)

- **Hào hứng**: short punchy clauses, "nè", "luôn", "cực", rhetorical question hook. "Thử ngay trà túi lọc này nè, pha cực nhanh."
- **Hài hước**: one light joke/metaphor per 2–3 scenes, self-aware exaggeration, relatable pain ("nhạt như tình cũ", "ví mỏng như lá lúa"). Keep facts exact; the joke never replaces the product info. Hook can be absurd. CTA with a punchline ("…trước khi nước lọc làm bạn buồn thêm").
- **Nhí nhảnh**: "nha", "nè", "xinh xỉu", "mê lắm luôn", exclamations, second person "bạn ơi", lighter topics first (looks, taste), short sentences.
- **Nghiêm túc**: calm, informative, first-person tester ("Mình đã dùng thử…" only if the user actually did — otherwise "Theo mô tả của shop…"), spec → usage → who it suits → price. No slang, no hype words, no jokes. Price stated plainly.
- **Nhẹ nhàng**: slow, sensory, cozy ("một tách trà ấm buổi tối"), longer vowels, fewer scenes, soft CTA ("nếu bạn cũng thích, giỏ hàng ở góc dưới nha").
- **Kịch tính**: suspense structure — problem, twist ("nhưng…"), reveal of product, reveal of price as the climax; short sentences, pauses via commas.

Text still follows `compliance.md` in every style: humour and drama never invent facts, urgency or effects.

## Adding a style

Add an entry to `STYLES` and aliases in `styles.py`, a SFX profile in `aff_build.py` if needed, a mood branch in `aff_assets.py` if needed, and a row + wording rule here.
