"""Product images: download, inspect, crop.
  python pipeline/prep_images.py fetch <url-or-shopee-id> ...   → public/img/p01.jpg, p02.jpg … + out/images.jpg (contact sheet)
      Shopee ids like vn-11134207-81ztc-ms2pjjjkvcaq76 become https://down-vn.img.susercontent.com/file/<id>
  python pipeline/prep_images.py local <file> ...               → copy user-supplied images the same way
  python pipeline/prep_images.py crop <name> x0 y0 x1 y1 <new>  → crop public/img/<name>.jpg (fractions 0–1) to public/img/<new>.jpg
"""
import sys, re, pathlib, shutil, subprocess
from PIL import Image, ImageDraw
ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "img"; IMG.mkdir(parents=True, exist_ok=True); (ROOT / "out").mkdir(exist_ok=True)

def norm(path):
    im = Image.open(path).convert("RGB")
    if max(im.size) > 1600: im.thumbnail((1600, 1600))
    return im

def sheet():
    fs = sorted(IMG.glob("*.jpg")); W = 300; cols = 4; rows = (len(fs) + cols - 1) // cols
    sh = Image.new("RGB", (W * cols, (W + 24) * max(1, rows)), "white")
    for i, f in enumerate(fs):
        im = Image.open(f); lab = f"{f.stem} {im.size[0]}x{im.size[1]}"
        im = im.convert("RGB"); im.thumbnail((W, W))
        x, y = (i % cols) * W, (i // cols) * (W + 24)
        sh.paste(im, (x + (W - im.width) // 2, y)); ImageDraw.Draw(sh).text((x + 4, y + W + 4), lab, fill="black")
    sh.save(ROOT / "out/images.jpg", quality=88); print("sheet out/images.jpg")

def nxt():
    k = len([f for f in IMG.glob("p*.jpg") if re.fullmatch(r"p\d\d", f.stem)]) + 1
    return IMG / f"p{k:02d}.jpg"

cmd, args = sys.argv[1], sys.argv[2:]
if cmd == "fetch":
    for a in args:
        url = a if a.startswith("http") else f"https://down-vn.img.susercontent.com/file/{a}"
        tmp = ROOT / "out/_dl"
        r = subprocess.run(["curl", "-sSL", "-m", "40", "-A", "Mozilla/5.0", "-o", tmp, url])
        try:
            dst = nxt(); norm(tmp).save(dst, quality=93); print(dst.name, "<-", url)
        except Exception as e:
            print("FAILED", url, e)
    sheet()
elif cmd == "local":
    for a in args:
        dst = nxt(); norm(a).save(dst, quality=93); print(dst.name, "<-", a)
    sheet()
elif cmd == "crop":
    name, x0, y0, x1, y1, new = args
    im = Image.open(IMG / f"{name}.jpg"); W, H = im.size
    im.crop((int(float(x0) * W), int(float(y0) * H), int(float(x1) * W), int(float(y1) * H))).save(IMG / f"{new}.jpg", quality=93)
    print("cropped", new); sheet()
elif cmd == "sheet":
    sheet()
