"""Visual review helpers — produce single JPEG grids to Read.
Still/video grids shade the platform UI zones in red: no text may sit inside them.

  python pipeline/review.py pages  <outdir>            candidate contact sheets, 4 slots per page
  python pipeline/review.py picks  <out.jpg>           overview of public/img (+ duplicate check)
  python pipeline/review.py stills <out.jpg>           suggested preview frames (renders via stills.mjs)
  python pipeline/review.py video  <mp4> <out.jpg>     16 frames evenly spread over the final video
"""
import glob, hashlib, json, pathlib, subprocess, sys, tempfile
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent


# Approximate TikTok/Reels/Shorts UI overlays on a 1080×1920 frame (status+tabs, caption/username/music, action buttons)
UI_ZONES = [(0, 0, 1080, 150), (0, 1500, 1080, 1920), (940, 800, 1080, 1500)]


def ui_overlay(im):
    k = im.width / 1080
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for b in UI_ZONES:
        d.rectangle([c * k for c in b], fill=(255, 0, 0, 60), outline=(255, 0, 0, 255), width=2)
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def tile(files, out, cols, tw, th, ui=False):
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), "white")
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB")
        if ui: im = ui_overlay(im)
        im.thumbnail((tw, th))
        sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    sheet.save(out, quality=82)
    print(out)


cmd = sys.argv[1]
if cmd == "pages":
    outdir = pathlib.Path(sys.argv[2]); outdir.mkdir(parents=True, exist_ok=True)
    keys = sorted(pathlib.Path(f).stem for f in glob.glob(str(ROOT / "pipeline/cand/s*_*.jpg")))
    for pi in range(0, len(keys), 4):
        pg = keys[pi:pi + 4]
        out = Image.new("RGB", (1200, 4 * 678), "white"); d = ImageDraw.Draw(out)
        for j, k in enumerate(pg):
            out.paste(Image.open(ROOT / f"pipeline/cand/{k}.jpg"), (0, j * 678 + 30))
            d.text((5, j * 678 + 8), k, fill="red")
        out = out.resize((800, out.height * 2 // 3))
        p = outdir / f"page{pi // 4:02d}.jpg"; out.save(p, quality=80); print(p)
elif cmd == "picks":
    fs = sorted(glob.glob(str(ROOT / "public/img/*.jpg")))
    seen = {}
    for f in fs:
        h = hashlib.md5(open(f, "rb").read()).hexdigest()
        if h in seen: print("DUPLICATE", seen[h], f)
        seen[h] = f
    tile(fs, sys.argv[2], 8, 200, 200)
elif cmd == "stills":
    d = json.loads((ROOT / "src/data.json").read_text(encoding="utf-8"))
    T, st, frames = d["tear"], 0, []
    for x in d["scenes"][:4]:
        frames += [st + x["lead"] + 40, st + x["lead"] + int(x["audioFrames"] * 0.7),
                   st + x["duration"] - T + 10, st + x["duration"] - T + 17]
        st += x["duration"] - T
    tmp = tempfile.mkdtemp()
    subprocess.run(["node", "stills.mjs", ",".join(map(str, frames)), tmp], cwd=ROOT, check=True)
    tile(sorted(glob.glob(tmp + "/*.jpeg")), sys.argv[2], 8, 432, 768, ui=True)
elif cmd == "video":
    mp4, out = sys.argv[2], sys.argv[3]
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]))
    tmp = tempfile.mkdtemp(); files = []
    for i in range(16):
        f = f"{tmp}/v{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{(i + 0.5) * dur / 16:.2f}", "-i", mp4,
                        "-frames:v", "1", "-vf", "scale=270:480", f], check=True)
        files.append(f)
    tile(files, out, 8, 270, 480, ui=True)
