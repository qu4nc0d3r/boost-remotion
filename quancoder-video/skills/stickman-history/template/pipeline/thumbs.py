"""Thumbnails from the Thumb still: YouTube 1280x720 + TikTok cover 1080x1920.
Usage: python pipeline/thumbs.py <art.png> <outdir> "<kicker>" "<line1>" "<line2 with *accent*>" "<sub>" ["<channel>"]
Channel, colours and sizes come from config.json (thumbnail.*, style.*, channel.name) unless given.
Art: npx remotion still Thumb /tmp/thumb_art.png --frame=0   (scene in src/thumb.json)
"""
import sys, re, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from config import CFG
art, out, kicker, l1, l2, sub = sys.argv[1:7]
TH = CFG.get("thumbnail", {})
channel = sys.argv[7] if len(sys.argv) > 7 else (CFG.get("channel", {}).get("name", "") if TH.get("showChannel", True) else "")
F = "public/fonts/"
hexrgb = lambda h: tuple(int(h.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
INK, RED, CREAM = hexrgb(CFG.get("style", {}).get("ink", "#2b1d12")), hexrgb(CFG.get("style", {}).get("accent", "#b3261e")), (246, 236, 214)
pathlib.Path(out).mkdir(parents=True, exist_ok=True)
def font(name, size): return ImageFont.truetype(F + name, size)

def rich(d, xy, text, fnt, anchor="la", stroke=8):
    """draw text where *word* is red; returns width"""
    x, y = xy
    parts = re.split(r"(\*[^*]+\*)", text)
    total = sum(d.textlength(p.strip("*"), font=fnt) for p in parts)
    if anchor == "ma": x -= total / 2
    for p in parts:
        if not p: continue
        col = RED if p.startswith("*") else INK
        t = p.strip("*")
        d.text((x, y), t, font=fnt, fill=col, stroke_width=stroke, stroke_fill=CREAM)
        x += d.textlength(t, font=fnt)
    return total

def fit(d, text, name, size, maxw):
    while d.textlength(text.replace("*", ""), font=font(name, size)) > maxw and size > 20: size -= 2
    return font(name, size)

def stamp(img, center, text, size, rot=-4):
    f = font("BeVietnamPro-ExtraBold.ttf", size)
    tmp = Image.new("RGBA", (10, 10)); w = ImageDraw.Draw(tmp).textlength(text, font=f)
    pad = size * 0.45
    layer = Image.new("RGBA", (int(w + pad * 2 + 20), int(size * 1.7 + 20)), (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    dl.rounded_rectangle([10, 10, layer.width - 10, layer.height - 10], radius=10, outline=RED, width=max(4, size // 10), fill=(246, 236, 214, 215))
    dl.text((layer.width / 2, layer.height / 2), text, font=f, fill=RED, anchor="mm")
    layer = layer.rotate(-rot, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(layer, (int(center[0] - layer.width / 2), int(center[1] - layer.height / 2)))

A = Image.open(art).convert("RGBA")

# ---------- YouTube 1280x720 ----------
yt = A.resize((1280, 720), Image.LANCZOS)
d = ImageDraw.Draw(yt)
stamp(yt, (230, 62), kicker, 34)
f1 = fit(d, l1, "BeVietnamPro-ExtraBold.ttf", 104, 760)
rich(d, (40, 100), l1, f1, stroke=9)
f2 = fit(d, l2, "BeVietnamPro-ExtraBold.ttf", 92, 800)
rich(d, (40, 100 + f1.size * 1.3), l2, f2, stroke=9)
fs = font("PatrickHand-Regular.ttf", 50)
if TH.get("youtubeSubLine"):
    d.text((880, 330), sub, font=font("PatrickHand-Regular.ttf", 50), fill=INK, stroke_width=5, stroke_fill=CREAM, anchor="ma")
if channel: d.text((1250, 690), channel, font=font("BeVietnamPro-Bold.ttf", 24), fill=(43, 29, 18), anchor="rs", stroke_width=3, stroke_fill=CREAM)
ytw, yth = TH.get("youtube", [1280, 720])
yt.convert("RGB").resize((ytw, yth), Image.LANCZOS).save(f"{out}/youtube-thumbnail.jpg", quality=90)

# ---------- TikTok 1080x1920 ----------
bg = Image.open("public/paper-h.jpg").convert("RGBA")
bg = bg.resize((int(bg.width * 1920 / bg.height), 1920)).crop((0, 0, 1080, 1920)) if False else bg.resize((3413, 1920)).crop((1166, 0, 2246, 1920))
tk = bg.copy()
crop = A.crop((280, 200, 1880, 1080))  # drop empty sky
crop = crop.resize((1080, int(crop.height * 1080 / crop.width)), Image.LANCZOS)
# soft fade at top edge of the art
mask = Image.new("L", crop.size, 255)
md = ImageDraw.Draw(mask)
for y in range(60): md.line([(0, y), (crop.width, y)], fill=int(255 * y / 60))
tk.paste(crop, (0, 740), mask)
d = ImageDraw.Draw(tk)
stamp(tk, (540, 330), kicker, 44)
f1 = fit(d, l1, "BeVietnamPro-ExtraBold.ttf", 118, 980)
rich(d, (540, 410), l1, f1, anchor="ma", stroke=10)
f2 = fit(d, l2, "BeVietnamPro-ExtraBold.ttf", 118, 980)
rich(d, (540, 410 + f1.size * 1.32), l2, f2, anchor="ma", stroke=10)
d.text((540, 1390), sub, font=fit(d, sub, "PatrickHand-Regular.ttf", 76, 960), fill=INK, stroke_width=6, stroke_fill=CREAM, anchor="ma")
if channel: d.text((540, 1760), channel, font=font("BeVietnamPro-Bold.ttf", 38), fill=INK, anchor="ms", stroke_width=4, stroke_fill=CREAM)
tkw, tkh = TH.get("tiktok", [1080, 1920])
tk.convert("RGB").resize((tkw, tkh), Image.LANCZOS).save(f"{out}/tiktok-cover.jpg", quality=90)
# check sheet: full | 3:4 profile grid crop | feed-size thumbs
g = tk.crop((0, 240, 1080, 1680)).resize((540, 720))
chk = Image.new("RGB", (540 + 540 + 20 + 640, 960), "white")
chk.paste(tk.convert("RGB").resize((540, 960)), (0, 0)); chk.paste(g.convert("RGB"), (560, 0))
chk.paste(yt.convert("RGB").resize((320, 180)), (1120, 0)); chk.paste(yt.convert("RGB").resize((640, 360)), (1120, 200))
chk.save(f"{out}/thumb-check.jpg", quality=85)
print("ok")
