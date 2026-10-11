# quancoder-video

Bộ skill làm video dọc 9:16 có lồng tiếng của Quancoder: video giải thích kiểu xé giấy, video affiliate kiểu FOMO motion, và meta để đăng.

Gọi bằng `/quancoder-video:paper-tear-video`, `/quancoder-video:affiliate-video-01`, `/quancoder-video:video-meta`, `/quancoder-video:init-ui` (hoặc tên ngắn nếu app hiển thị).

## Lệnh

- `/paper-tear-video <chủ đề> [thời lượng] [giọng]` — viết kịch bản, lồng tiếng VieNeu-TTS, tìm ảnh Creative Commons, dựng Remotion (chuyển cảnh xé giấy, ảnh cắt giấy, nhãn chương, phụ đề trên mẩu giấy), render MP4 1080×1920, nén, ghi nguồn ảnh, chia phần ≤ 3 phút nếu cần, lưu vào thư mục đã kết nối.
- Giọng đọc mặc định: "Giọng Donghua" — nhân bản từ giọng của bạn (VieNeu-TTS, mẫu 7 giây trong `template/voices/`).
- Chủ đề về một bộ phim/truyện (vd. phân tích Trần Bình An – Kiếm Lai): tự tìm ảnh chính thức của phim (poster, cảnh phim trên wiki của phim, AniList), bỏ fan art; có thể thêm ảnh/đoạn quay của bạn trong thư mục `donghua/`.
- Vùng an toàn: chữ, ảnh dán và watermark được thu nhỏ vào giữa (86%) để không bị giao diện TikTok/Reels/Shorts che hay bị cắt trên điện thoại màn dài; ảnh nền vẫn tràn viền.
- Mọi video tự gắn nhận diện chống reup cho kênh TikTok "Thế Giới Donghua" và fanpage "Ban Công Thố": watermark nhảy vị trí, chữ ký trên phụ đề, tên kênh ở màn mở đầu, màn kết + lời thoại giới thiệu kênh, metadata MP4.
- Ảnh bìa: cuối mỗi video tự cắt 1 khung hình đẹp nhất, dán chữ FOMO trên giấy xé (dòng mở, tiêu đề lớn có chữ nhấn đỏ, câu gợi tò mò), giữ chữ trong vùng 3:4 để lưới TikTok không cắt → `<slug>-cover.jpg`.
- `/affiliate-video-01 <url sản phẩm> [thời lượng, mặc định 25s] [giọng, mặc định Giọng Donghua] [style: hào hứng · hài hước · nhí nhảnh · nghiêm túc · nhẹ nhàng · kịch tính]` — video affiliate 9:16 kiểu FOMO motion: lấy thông tin + ảnh từ trang sản phẩm (Shopee cần bạn đăng nhập trong khung Browser), hook rung, ảnh sản phẩm zoom punch, chip tính năng, thẻ các bước, số đã bán đếm lên + sao + review thật, giá gạch → giá mới + badge %, so sánh trước/sau, mũi tên chỉ giỏ hàng, phụ đề nhảy từng từ, beat + SFX theo style. Tự kiểm tra giọng đọc giá/số bằng nhận dạng giọng nói, không dùng claim sức khỏe hay đếm ngược giả.
- `/quancoder-video:init-ui` — mở Quancoder Studio: trang web riêng trên claude.ai (giao diện tối) để chọn loại video, dán link/chủ đề, kéo thời lượng, chọn giọng + style, xem trước 9:16, copy lệnh hoặc thêm vào hàng chờ; gõ "chạy hàng chờ" trong chat để Claude làm lần lượt và cập nhật trạng thái trên trang.
- `/stickman-history <chủ đề> [thời lượng] [giọng]` — video kể chuyện lịch sử 16:9 (1920×1080) bằng người que vẽ tay trên giấy cũ: nghiên cứu sử liệu, kịch bản, lồng tiếng, người que có khớp chuyển động (đi, chạy, chèo, đóng cọc, đánh, khóc…), thuyền nổi theo thủy triều/mắc cọc/chìm, mưa tên, dòng thời gian, con dấu chương, phụ đề, trống trận; render, thumbnail YouTube + ảnh bìa TikTok, meta đăng TikTok/YouTube (có mục lục chương).
  - **Đồ hoạ v2 (1.3.0)**: người que nét cọ có mặt biểu cảm, áo giáp/áo dài/áo choàng bay, bóng đổ, bụi khi chạy; trời màu nước theo thời điểm (bình minh, hoàng hôn, đêm, bão), lửa hắt sáng, sương, khói, tia lửa, bọt sóng; parallax nhiều lớp và camera cận cảnh; chuyển cảnh quét mực / cuộn tranh / lật trang / mờ; bản đồ cổ Bắc Bộ với đường hành quân, hạm đội chạy dần; thẻ chương nét cọ lớn.
  - **Render nhanh hơn ~1.7× (1.4.0)**: filter SVG chạy trong sRGB, noise rung nét lát 1 ô 200 px, bỏ filter loang vô hình trên nền trời, file master trung gian dùng x264 `ultrafast`; hình giữ nguyên. Sửa lỗi `resolution: "720p"`/`"1440p"` làm render.sh dừng. Tuỳ chọn `render.everyNthFrame: 2` (vẽ 15 hình/giây kiểu hoạt hình tay, xuất vẫn 30 fps) render nhanh thêm ~1,7×.
  - **File cấu hình** `skills/stickman-history/config.json`: tên kênh TikTok/YouTube/fanpage, watermark, câu kết, giọng đọc, màu mực/màu nhấn/màu phe địch, giấy, âm lượng nhạc/SFX, cỡ phụ đề, độ phân giải, thông số render, kích thước thumbnail, hashtag cố định. Đổi lâu dài: nói "đổi tên kênh thành …" để Claude lưu bản ghi đè vào Project (doc `stickman-history/config.json`); đổi cho 1 video: nói trong yêu cầu.
- `/video-meta` — tiêu đề, caption, hashtag, tags và bình luận ghim cho TikTok, YouTube Shorts, Instagram Reels.

## Chuyển từ plugin cũ

Plugin này thay cho plugin `paper-tear-video` cũ (cùng các skill, thêm affiliate-video-01). Gỡ plugin cũ sau khi cài để không bị hai bản cùng kích hoạt.

## Thành phần stickman-history

- `skills/stickman-history/template/` — engine Remotion (người que, đạo cụ, cảnh) + pipeline (init_project, apply_config, build_story, make_assets_h, render, thumbs, sheet); dùng chung font, giọng, tts.py với template paper-tear-video.
- `skills/stickman-history/references/` — hướng dẫn config, schema kịch bản, mẫu meta, kịch bản mẫu Trận Bạch Đằng 938.

## Cần có

- Mạng tới: registry.npmjs.org, pypi.org, files.pythonhosted.org, huggingface.co, *.hf.co, api.openverse.org, live.staticflickr.com, upload.wikimedia.org (Admin settings → Capabilities). Nếu bị chặn, skill tự dùng máy tính đã liên kết để tải gói.
- Thời gian: kịch bản 6 phút ≈ 7 phút lồng tiếng + ≈ 50 phút render trên máy 2 nhân.

## Thành phần

- `skills/paper-tear-video/template/` — project Remotion 4.0.529 + pipeline Python (tts, ảnh, timing, assets, review, finalize). Font Be Vietnam Pro, Patrick Hand, Playfair Display (SIL OFL) đi kèm.
- `skills/paper-tear-video/references/` — cách viết kịch bản, chọn ảnh, xử lý sự cố, kịch bản mẫu "Nếu ngày mai thế giới có thể tu tiên".
