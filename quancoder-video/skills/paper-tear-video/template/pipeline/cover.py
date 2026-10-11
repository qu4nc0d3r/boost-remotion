"""Cover / thumbnail image cut from one frame of the rendered video, with FOMO text on torn paper.

  python pipeline/cover.py frames <mp4> <sheet.jpg>
        2 candidate frames per scene (a = background only, b = cutout pasted), labelled "<key> <sec>s"
  python pipeline/cover.py make <mp4> --at <sec | key> --kicker "..." --headline "LINE 1|LINE *ACCENT*" [--sub "..."]
        [--out out/cover.jpg] [--no-brand]
        -> out/cover.jpg (1080x1920) + out/cover-check.jpg (cover | TikTok grid 3:4 crop | small thumbnail)

Headline: '|' breaks lines, *word* is painted in the accent colour (script.json accentColor).
Layout keeps all text inside the centre 3:4 area (y 240-1680) so the TikTok profile grid and
Shorts/Reels thumbnails never crop it; the headline note covers the caption band of the frame and
the kicker strip covers the chapter label, so no leftover subtitle text competes with the hook.
"""
import argparse, json, pathlib, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / "public" / "fonts"
W, H = 1080, 1920
GRID = (0, 240, 1080, 1680)          # TikTok profile grid shows the centre 3:4


def load_json(p, default):
    try:
        return json.loads(pathlib.Path(p).read_text(encoding="utf-8"))
    except Exception:
        return default


def grab(mp4, sec, out, size=None):
    vf = ["-vf", f"scale={size[0]}:{size[1]}"] if size else []
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{sec:.3f}", "-i", str(mp4), "-frames:v", "1", "-q:v", "2", *vf, str(out)], check=True)
    return out


def scene_times():
    """Candidate timestamps per scene from src/data.json (skips the title card and the tears)."""
    d = load_json(ROOT / "src/data.json", None)
    if not d:
        return {}
    fps, T, st, res = d["fps"], d["tear"], 0, {}
    for x in d["scenes"]:
        if x.get("kind") != "outro":
            a0 = st + x["lead"]
            first = a0 + int(x["audioFrames"] * (0.36 if x["index"] == 1 else 0.28))   # before the cutout (48 %)
            second = a0 + int(x["audioFrames"] * 0.72)                                   # cutout visible
            res[f"{x['id']}a"] = first / fps
            res[f"{x['id']}b"] = second / fps
        st += x["duration"] - T
    return res


def font(name, size):
    f = ImageFont.truetype(str(FONTS / name), size)
    if name.startswith("Playfair"):
        try:
            f.set_variation_by_name("Black")
        except Exception:
            pass
    return f


def torn_mask(w, h, amp=10, step=14, seed=1):
    rnd = random.Random(seed)
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    top = [(x, amp + rnd.randint(-amp, amp)) for x in range(0, w + step, step)]
    bot = [(x, h - amp - rnd.randint(-amp, amp)) for x in range(w, -step, -step)]
    left = [(amp // 2 + rnd.randint(-amp // 2, amp // 2), y) for y in range(h, 0, -step)]
    d.polygon(top + [(w, amp)] + bot + left, fill=255)
    return m


def paper(w, h, tex, tint=None, seed=1, amp=10):
    base = Image.open(tex).convert("RGB") if tex.exists() else Image.new("RGB", (w, h), (244, 238, 226))
    base = ImageOps.fit(base, (w, h))
    if tint:
        base = Image.blend(base, Image.new("RGB", (w, h), tint), 0.82)
    img = base.convert("RGBA")
    img.putalpha(torn_mask(w, h, amp=amp, seed=seed))
    return img


def paste_shadow(canvas, img, xy, angle, blur=14, alpha=120):
    img = img.rotate(angle, resample=Image.BICUBIC, expand=True)
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.putalpha(img.getchannel("A").point(lambda v: v * alpha // 255))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    x, y = xy[0] - img.width // 2, xy[1] - img.height // 2
    canvas.alpha_composite(sh, (x + 8, y + 14))
    canvas.alpha_composite(img, (x, y))


def parse_line(line):
    """'NUỐT CẢ *KHÔNG GIAN*' -> [('NUỐT CẢ ', False), ('KHÔNG GIAN', True)]"""
    parts, acc = [], False
    for i, seg in enumerate(line.split("*")):
        if seg:
            parts.append((seg, acc))
        acc = not acc
    return parts


def fit_size(lines, fname, maxw, maxh, top=190):
    for s in range(top, 40, -4):
        f = font(fname, s)
        ws = [sum(f.getlength(t) for t, _ in parse_line(l)) for l in lines]
        hh = len(lines) * s * 1.08
        if max(ws) <= maxw and hh <= maxh:
            return s
    return 44


def make(a):
    sc = load_json(ROOT / "script.json", {})
    accent = sc.get("accentColor", "#b3261e")
    brand = (sc.get("branding") or {}).get("channel", "")
    times = scene_times()
    sec = times[a.at] if a.at in times else float(a.at)
    tmp = pathlib.Path(tempfile.mkdtemp())
    frame = Image.open(grab(a.mp4, sec, tmp / "f.jpg")).convert("RGB").resize((W, H))

    # punch up the frame a little, darken top/bottom so the paper pops
    frame = ImageEnhance.Contrast(ImageEnhance.Color(frame).enhance(1.18)).enhance(1.08)
    grad = Image.new("L", (1, H))
    for y in range(H):
        t = abs(y - H * 0.45) / (H * 0.55)
        grad.putpixel((0, y), int(150 * max(0, t) ** 1.6))
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    shade.putalpha(grad.resize((W, H)))
    cv = frame.convert("RGBA")
    cv.alpha_composite(shade)

    # kicker: red torn strip over the chapter label (top of the 3:4 grid area)
    kf = font("BeVietnamPro-ExtraBold.ttf", 64)
    kt = a.kicker.upper()
    while kf.getlength(kt) > 820 and kf.size > 34:
        kf = font("BeVietnamPro-ExtraBold.ttf", kf.size - 2)
    kw = max(int(kf.getlength(kt)) + 90, 780)          # wide enough to hide the chapter label underneath
    strip = paper(kw, max(kf.size + 70, 150), ROOT / "public/paper.jpg", tint=tuple(int(accent[i:i + 2], 16) for i in (1, 3, 5)), seed=3, amp=7)
    ImageDraw.Draw(strip).text((kw // 2, strip.height // 2), kt, font=kf, fill="white", anchor="mm")
    paste_shadow(cv, strip, (W // 2 - 30, 318), -2.5)

    # headline: big white torn note over the caption band
    lines = [l.strip().upper() for l in a.headline.split("|") if l.strip()]
    fname = "BeVietnamPro-ExtraBold.ttf"
    s = fit_size(lines, fname, 860, 520)
    hf = font(fname, s)
    lh = int(s * 1.12)
    nw, nh = 960, lh * len(lines) + 110
    note = paper(nw, nh, ROOT / "public/paper-white.jpg", seed=7, amp=11)
    d = ImageDraw.Draw(note)
    y = 55 + lh // 2
    for l in lines:
        parts = parse_line(l)
        x = (nw - sum(hf.getlength(t) for t, _ in parts)) / 2
        for t, acc in parts:
            d.text((x, y), t, font=hf, fill=accent if acc else (20, 18, 16), anchor="lm")
            x += hf.getlength(t)
        y += lh
    cy = 1330 - (nh - 300) // 3
    paste_shadow(cv, note, (W // 2, cy), 1.5)

    # sub line: handwritten on a kraft scrap under the note
    if a.sub:
        sf = font("PatrickHand-Regular.ttf", 64)
        while sf.getlength(a.sub) > 800 and sf.size > 36:
            sf = font("PatrickHand-Regular.ttf", sf.size - 2)
        sw = int(sf.getlength(a.sub)) + 80
        scrap = paper(sw, sf.size + 50, ROOT / "public/paper.jpg", seed=11, amp=6)
        ImageDraw.Draw(scrap).text((sw // 2, scrap.height // 2), a.sub, font=sf, fill=(30, 24, 20), anchor="mm")
        paste_shadow(cv, scrap, (W // 2 + 40, min(cy + nh // 2 + 50, GRID[3] - 60)), -2)

    if brand and not a.no_brand:
        bf = font("BeVietnamPro-Bold.ttf", 34)
        ImageDraw.Draw(cv).text((W // 2, GRID[3] - 8), f"— {brand} —", font=bf, fill=(255, 255, 255, 230), anchor="md",
                                stroke_width=3, stroke_fill=(0, 0, 0, 160))

    # grain
    g = ROOT / "public/grain.png"
    if g.exists():
        gr = Image.open(g).convert("RGBA").resize((W, H))
        gr.putalpha(gr.getchannel("A").point(lambda v: v * 12 // 100))
        cv.alpha_composite(gr)

    out = ROOT / a.out
    out.parent.mkdir(parents=True, exist_ok=True)
    cov = cv.convert("RGB")
    cov.save(out, quality=92)

    # review sheet: full cover | 3:4 grid crop | 1/4-size thumbnail as seen in a feed
    grid = cov.crop(GRID).resize((540, 720))
    full = cov.resize((405, 720))
    thumb = cov.resize((135, 240))
    chk = Image.new("RGB", (405 + 540 + 135 + 40, 740), "white")
    chk.paste(full, (5, 10)); chk.paste(grid, (420, 10)); chk.paste(thumb, (975, 10))
    chk.save(out.with_name(out.stem + "-check.jpg"), quality=85)
    print(out, f"frame {sec:.2f}s", out.with_name(out.stem + "-check.jpg"))


def frames(mp4, sheet):
    times = scene_times()
    if not times:
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)]))
        times = {f"t{i:02d}": (i + 0.5) * dur / 16 for i in range(16)}
    tmp = pathlib.Path(tempfile.mkdtemp())
    keys = list(times)
    cols, tw, th = 8, 216, 384
    rows = (len(keys) + cols - 1) // cols
    sh = Image.new("RGB", (cols * tw, rows * (th + 26)), "white")
    d = ImageDraw.Draw(sh)
    for i, k in enumerate(keys):
        im = Image.open(grab(mp4, times[k], tmp / f"{k}.jpg", (tw, th)))
        x, y = (i % cols) * tw, (i // cols) * (th + 26)
        sh.paste(im, (x, y))
        d.text((x + 4, y + th + 4), f"{k} {times[k]:.1f}s", fill="black")
    sh.save(sheet, quality=82)
    print(sheet, len(keys), "frames")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "frames":
        frames(sys.argv[2], sys.argv[3])
    elif len(sys.argv) > 1 and sys.argv[1] == "make":
        p = argparse.ArgumentParser()
        p.add_argument("cmd"); p.add_argument("mp4")
        p.add_argument("--at", required=True, help="seconds or a key from the frames sheet, e.g. s05a")
        p.add_argument("--kicker", required=True)
        p.add_argument("--headline", required=True)
        p.add_argument("--sub", default="")
        p.add_argument("--out", default="out/cover.jpg")
        p.add_argument("--no-brand", action="store_true")
        make(p.parse_args())
    else:
        print(__doc__)
