"""Finalize: out/master.mp4 → out/<slug>-9x16.mp4 (+metadata) and out/<slug>-cover.jpg (frame of the hook scene).
  python pipeline/finalize.py --slug <slug> [--cover-at <sec>]
"""
import argparse, json, pathlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser(); ap.add_argument("--slug", required=True); ap.add_argument("--cover-at", type=float, default=None)
a = ap.parse_args()
data = json.loads((ROOT / "src/aff.json").read_text(encoding="utf-8"))
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
src, dst = ROOT / "out/master.mp4", ROOT / f"out/{a.slug}-9x16.mp4"
title = script.get("title") or script.get("product", {}).get("name", a.slug)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-c", "copy", "-movflags", "+faststart", "-metadata", f"title={title}",
                "-metadata", "comment=Affiliate video — made with /affiliate-video-01", dst], check=True)
hook = data["scenes"][0]
at = a.cover_at if a.cover_at is not None else (hook["from"] + hook["dur"] * 0.6) / data["fps"]
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.2f}", "-i", dst, "-frames:v", "1", "-q:v", "2", ROOT / f"out/{a.slug}-cover.jpg"], check=True)
mb = dst.stat().st_size / 1e6
print(f"{dst.name} {mb:.1f} MB, cover at {at:.2f}s → out/{a.slug}-cover.jpg")
if mb > 20: print("NOTE: > 20 MB — commit via gzip chunks or re-encode with -crf 26")
