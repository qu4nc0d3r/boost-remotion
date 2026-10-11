# Compliance rules (apply in every style)

Platforms (TikTok Shop, Shopee Video, Facebook/Instagram) limit or remove affiliate videos with misleading claims, and Vietnamese advertising law restricts health claims for food/supplements/cosmetics. FOMO must come from true facts.

1. **Facts only from the product page** (or the user). Prices, discount, sold count, rating, rating count, specs, ingredients, usage: copy exactly. If the page shows "1k+", say "hơn một nghìn", show "1.000+".
2. **No health / medical / efficacy claims** for food, drinks, supplements, cosmetics, even if the seller writes them ("thanh lọc", "giảm cân", "trị mụn", "tốt cho phụ nữ", "hỗ trợ điều trị"). Describe taste, format, ingredients, usage, convenience. Crop such text out of images (`prep_images.py crop`). If the page says "không phải là thuốc", do not imply otherwise.
3. **No fake urgency**: no countdown timers, "chỉ còn X suất", "hôm nay cuối cùng" unless the page shows a real, dated flash sale — and then say its end time. Default wording: "đang giảm …", "xem giá hôm nay ở giỏ hàng".
4. **Price note** on the price scene: which variant + "lúc làm video", and send viewers to the cart for the current price.
5. **Reviews**: only real ones from the page, shortened without changing meaning, usernames masked (`aml***`). Stars appear only when you pass the review's real star count as the 3rd element (`["text", "aml***", 5]`).
6. **No "số 1", "tốt nhất", "rẻ nhất"** or comparisons with named competitors unless the page proves it.
7. **Brand/IP**: product photos from the listing are fine for promoting that listing. No celebrity images, no other creators' videos, no copyrighted music (the beat is generated).
8. **Disclosure**: the post caption carries an affiliate disclosure (handled in `/video-meta`). Remind the user to tick the platform's AI-generated content label because the voice is synthetic.
9. **Regulated/prohibited products** (medicine, alcohol to minors, weapons, adult, financial products): stop and tell the user this skill does not make ads for them.
