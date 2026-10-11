"""Review helpers.
  python pipeline/review.py sheet <dir_of_jpgs> <out.jpg>     stills grid with red platform-UI zones
  python pipeline/review.py video <in.mp4> <out.jpg>          1 frame/s contact sheet + loudness
"""
import sys, glob, subprocess, pathlib
from PIL import Image, ImageDraw

def zones(im):
    d = ImageDraw.Draw(im, "RGBA"); W, H = im.size
    d.rectangle([W * .86, H * .35, W, H * .85], fill=(255, 0, 0, 50))   # right-side buttons
    d.rectangle([0, H * .84, W, H], fill=(255, 0, 0, 50))              # caption / product anchor / nav
    d.rectangle([0, 0, W, H * .06], fill=(255, 0, 0, 40))              # top tabs
    return im

cmd = sys.argv[1]
if cmd == "sheet":
    fs = sorted(glob.glob(f"{sys.argv[2]}/*.jpg")); W, H = 270, 480; cols = min(8, len(fs))
    rows = (len(fs) + cols - 1) // cols
    sh = Image.new("RGB", (W * cols, H * rows), "white")
    for i, f in enumerate(fs):
        im = zones(Image.open(f).convert("RGB").resize((W, H)))
        ImageDraw.Draw(im).text((6, 6), pathlib.Path(f).stem, fill="white")
        sh.paste(im, ((i % cols) * W, (i // cols) * H))
    sh.save(sys.argv[3], quality=88); print("sheet", sys.argv[3], len(fs))
elif cmd == "video":
    src, out = sys.argv[2], sys.argv[3]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", "fps=1,scale=180:-1,tile=10x4", "-frames:v", "1", out], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    print("\n".join(l.split("] ")[-1] for l in r.stderr.splitlines() if "mean_volume" in l or "max_volume" in l))
    print("sheet", out)
