"""User-supplied donghua stills / clips (the user's own screenshots or footage).

  python pipeline/user_media.py scan <folder> <sheet_dir> [--every 3]
        Catalog images + videos in <folder>; for videos, sample a frame every N s.
        Writes contact sheets (<sheet_dir>/user_XX.jpg, each tile labelled "<id> <file>@<sec>")
        and pipeline/user_catalog.json.
  python pipeline/user_media.py still <id|file> [sec]   -> public/user/<name>.jpg   (image copy or video frame)
  python pipeline/user_media.py clip  <file> <sec> <dur> -> public/user/<name>_<sec>.mp4 (muted, 1080 wide, H.264)

Then put the returned paths (relative to public/) into script.json → scene "media": [bg, cutout].
Clips are muted in the render; the narration stays on top.
"""
import json, pathlib, subprocess, sys, tempfile
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public" / "user"; PUB.mkdir(parents=True, exist_ok=True)
CAT = ROOT / "pipeline" / "user_catalog.json"
IMG = {".jpg", ".jpeg", ".png", ".webp"}
VID = {".mp4", ".mov", ".mkv", ".webm"}


def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))


def slug(p):
    import re, unicodedata
    s = unicodedata.normalize("NFKD", pathlib.Path(p).stem).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()[:40] or "media"


cmd = sys.argv[1]
if cmd == "scan":
    folder, sheet_dir = pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]); sheet_dir.mkdir(parents=True, exist_ok=True)
    every = float(sys.argv[sys.argv.index("--every") + 1]) if "--every" in sys.argv else 3.0
    tiles, cat = [], []
    tmp = pathlib.Path(tempfile.mkdtemp())
    for f in sorted(folder.rglob("*")):
        ext = f.suffix.lower()
        if ext in IMG:
            cat.append({"id": len(cat), "file": str(f), "t": None}); tiles.append((cat[-1], f))
        elif ext in VID:
            d = dur(f); t = 0.5
            while t < d:
                out = tmp / f"{len(cat)}.jpg"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(f), "-frames:v", "1", "-vf", "scale=-2:300", str(out)], check=True)
                cat.append({"id": len(cat), "file": str(f), "t": round(t, 2), "dur": round(d, 2)}); tiles.append((cat[-1], out))
                t += every
    CAT.write_text(json.dumps(cat, indent=1, ensure_ascii=False))
    per = 24
    for s in range(0, len(tiles), per):
        sheet = Image.new("RGB", (6 * 320, 4 * 326), "white"); dr = ImageDraw.Draw(sheet)
        for k, (c, img) in enumerate(tiles[s:s + per]):
            im = Image.open(img).convert("RGB"); im.thumbnail((316, 300))
            x, y = (k % 6) * 320, (k // 6) * 326
            sheet.paste(im, (x, y))
            label = f"{c['id']} {pathlib.Path(c['file']).name[:22]}" + (f"@{c['t']}" if c["t"] is not None else "")
            dr.text((x + 3, y + 304), label, fill="black")
        p = sheet_dir / f"user_{s // per:02d}.jpg"; sheet.save(p, quality=80); print(p)
    print(len(cat), "tiles")
elif cmd == "still":
    ref = sys.argv[2]
    if ref.isdigit():
        c = json.loads(CAT.read_text())[int(ref)]; f, t = pathlib.Path(c["file"]), c["t"]
    else:
        f, t = pathlib.Path(ref), (float(sys.argv[3]) if len(sys.argv) > 3 else None)
    name = slug(f) + (f"_{t:g}" if t is not None else "")
    out = PUB / f"{name}.jpg"
    if t is None:
        im = Image.open(f).convert("RGB"); im.thumbnail((1920, 1920)); im.save(out, quality=92)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t}", "-i", str(f), "-frames:v", "1", "-q:v", "2", str(out)], check=True)
    print(out.relative_to(ROOT / "public"))
elif cmd == "clip":
    f, t, d = pathlib.Path(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
    out = PUB / f"{slug(f)}_{t:g}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t}", "-t", f"{d}", "-i", str(f), "-an",
                    "-vf", "scale=1080:-2:flags=lanczos,fps=30", "-c:v", "libx264", "-crf", "19", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], check=True)
    print(out.relative_to(ROOT / "public"))
