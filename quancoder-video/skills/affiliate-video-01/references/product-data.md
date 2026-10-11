# Getting product data from the link

## Shopee (shopee.vn, s.shopee.vn)

Shopee blocks anonymous and scripted access: WebFetch/curl of the product page returns an empty JS shell, and `/api/v4/pdp/get_pc` / `/api/v4/item/get` return `error 90309999` — even from a logged-in browser tab, where calling the API also bounces the tab to `/verify/traffic/error`. Do not call the API.

Working path (built-in browser on the user's computer):
1. `preview_start` with the link (short links redirect to `shopee.vn/<shop>/<shopid>/<itemid>?…`). Note `shopid` and `itemid`.
2. If `get_page_text` shows "Login Required" / "Verify By QR Scan", check `tabs_context` (pane displayed?) and ask the user to log in themselves in the Browser pane (usually: scan the QR with the Shopee app). Never type credentials. Wait, polling `get_page_text` every ~20 s.
3. Once logged in, `navigate` to `https://shopee.vn/product/<shopid>/<itemid>`, wait 4–8 s (a blank page means still loading), then `get_page_text`. It contains: title, rating, ratings count, sold ("1k+ Sold"), price range + original price range + discount, variants ("1 hộp / combo 2 hộp…"), shipping, shop name, specifications, full description, and the first page of reviews with variation names.
4. Images: run in the page
   ```js
   const s=new Set();(document.documentElement.innerHTML.match(/vn-111342\d\d-[a-z0-9]+-[a-z0-9]+/g)||[]).forEach(x=>s.add(x));[...s]
   ```
   `vn-11134207-…` are the product gallery (1024×1024), `vn-11134258-…` / `vn-11134103-…` are review photos (small), `vn-11134233-…` are shop/brand assets. The gallery thumbnails strip may hide extra images behind its arrow; click it and re-run if only ~5 appear.
5. Download from the cloud (CDN needs no login): `python3 pipeline/prep_images.py fetch vn-11134207-… …`.

Price range → pick the variant you will quote (usually the cheapest single unit) and say which one on screen ("giá 1 hộp …"). The original price for that variant is the low end of the struck range; discount % is shown on the page. Round nothing — copy exactly.

## TikTok Shop / Lazada / Tiki / other

Same browser approach: open, wait, `get_page_text`; images via
```js
[...new Set([...document.images].map(i=>i.currentSrc||i.src).filter(u=>/\.(jpe?g|png|webp)|image/.test(u)&&!/avatar|icon|logo|sprite/i.test(u)))]
```
then pick the large product ones (check the contact sheet). If a site needs login, ask the user to log in in the Browser pane. If nothing works, ask for 3–6 screenshots/photos of the product page and the product, and the price/sold/rating numbers.

## What to record (script.json → product)

```json
"product": {"name": "...", "url": "<the user's affiliate link, unchanged>", "variant": "1 hộp", "price": "94.400đ", "oldPrice": "160.000đ",
            "discount": "-41%", "sold": "1k+", "rating": 4.8, "ratingCount": 80, "shop": "...", "checkedAt": "2026-09-26",
            "facts": ["35 túi x 5g", "lá mâm xôi, bầu đất, xạ đen, cỏ ngọt", "3 túi + 450 ml–1 l nước sôi, ủ 3–5 phút"],
            "avoidClaims": ["Thanh lọc - tốt cho phụ nữ (on image p06)"]}
```

Keep the affiliate URL exactly as given — it carries the user's tracking parameters.
