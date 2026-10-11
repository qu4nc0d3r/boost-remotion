"""Contact sheet of scene stills. Usage:
  python pipeline/sheet.py frames "0.15,0.5,0.85" [scene ids]   -> prints frame list
  python pipeline/sheet.py make <dir> <out.jpg> [cols]
"""
import json, sys, pathlib
from PIL import Image, ImageDraw
ROOT = pathlib.Path(__file__).resolve().parent.parent
if sys.argv[1] == "frames":
    d = json.loads((ROOT / "src/data.json").read_text())
    fr = [float(x) for x in sys.argv[2].split(",")]
    ids = sys.argv[3].split(",") if len(sys.argv) > 3 else None
    cur, out = 0, []
    for i, s in enumerate(d["scenes"]):
        start = 0 if i == 0 else cur - d["tear"]
        if not ids or s["id"] in ids:
            out += [start + s["lead"] + int(f * s["audioFrames"]) for f in fr]
        cur = start + s["duration"]
    print(",".join(map(str, out)))
else:
    files = sorted(pathlib.Path(sys.argv[2]).glob("*.jpeg"))
    cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    ims = [Image.open(f) for f in files]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), "white")
    dr = ImageDraw.Draw(sheet)
    for k, (f, im) in enumerate(zip(files, ims)):
        x, y = (k % cols) * w, (k // cols) * h
        sheet.paste(im, (x, y)); dr.text((x + 6, y + 4), f.stem, fill="red")
    sheet.save(sys.argv[3], quality=80)
