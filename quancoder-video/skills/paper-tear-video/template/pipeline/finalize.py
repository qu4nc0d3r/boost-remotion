"""Finalize a rendered master: compressed MP4, credits.txt, optional ≤3-min parts, transfer chunks.

Usage:
  python pipeline/finalize.py --slug my-video [--split] [--chunks]
Outputs in out/:
  <slug>-9x16.mp4            compressed deliverable (~2.2 Mbps)
  <slug>-p1.mp4, -p2.mp4 ... (--split) parts ≤ 175 s cut at scene boundaries (for Shorts/Reels)
  credits.txt                attribution list for the description
  chunks/<name>.gz.part.*    (--chunks) gzip+split 19 MB pieces for device_commit_files
"""
import argparse, json, math, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
ap = argparse.ArgumentParser()
ap.add_argument("--slug", required=True)
ap.add_argument("--split", action="store_true")
ap.add_argument("--chunks", action="store_true")
ap.add_argument("--max-part", type=float, default=175.0)
a = ap.parse_args()

master = OUT / "master.mp4"
final = OUT / f"{a.slug}-9x16.mp4"
enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "24", "-maxrate", "2200k", "-bufsize", "4400k",
       "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
br = json.loads((ROOT / "script.json").read_text(encoding="utf-8")).get("branding", {})
meta = []
if br.get("channel"):
    owner = br["channel"] + (f" | Fanpage {br['fanpage']}" if br.get("fanpage") else "")
    meta = ["-metadata", f"artist={br['channel']}", "-metadata", f"copyright=© {owner}",
            "-metadata", f"comment=Bản gốc thuộc {owner}. Không reup."]
enc_meta = enc + meta
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", master, *enc_meta, "-c:a", "copy", final], check=True)
deliverables = [final]

# credits
cf = ROOT / "pipeline" / "credits.json"
c = json.loads(cf.read_text(encoding="utf-8")) if cf.exists() else {}
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
lines = [f'Hình ảnh trong video "{script["title"]}" (Creative Commons, qua Openverse / Wikimedia Commons):', ""]
for k in sorted(c):
    v = c[k]; lic = (v.get("license") or "").upper(); ver = v.get("license_version") or ""
    lic = {"CC0": "CC0", "PDM": "Public Domain"}.get(lic, f"CC {lic} {ver}".strip())
    lines.append(f"- {v.get('title') or 'Untitled'} — {v.get('creator') or 'Unknown'} — {lic} — {v.get('foreign_landing_url')}")
fc = ROOT / "pipeline" / "franchise_credits.json"
if fc.exists():
    used = {m for s in script["scenes"] for m in (s.get("media") or []) if m}
    rows = [v for k, v in json.loads(fc.read_text(encoding="utf-8")).items() if k in used]
    if rows:
        lines += ["", "Hình ảnh chính thức của phim (trích dẫn cho mục đích phân tích, bình luận; bản quyền thuộc chủ sở hữu):"]
        lines += [f"- {r['name']} — {r['page']}" for r in rows]
if script.get("mediaCredits"):
    lines += ["", "Hình ảnh/đoạn phim trích dẫn (thuộc bản quyền của chủ sở hữu, dùng cho mục đích bình luận):"]
    lines += [f"- {m}" for m in script["mediaCredits"]]
lines += ["", f"Lồng tiếng: VieNeu-TTS (giọng {script.get('voice', '')}{' – nhân bản từ giọng chủ kênh' if script.get('voiceRef') else ''}) — github.com/pnnbao97/VieNeu-TTS",
          "Font: Be Vietnam Pro, Patrick Hand, Playfair Display (SIL OFL)", "Nhạc nền & hiệu ứng xé giấy: tổng hợp bằng code (procedural)."]
(OUT / "credits.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

if a.split:
    d = json.loads((ROOT / "src" / "data.json").read_text(encoding="utf-8"))
    fps, T = d["fps"], d["tear"]
    starts, acc = [], 0
    for s in d["scenes"]:
        starts.append(acc); acc += s["duration"] - T
    total = d["total"] / fps
    nparts = max(1, math.ceil(total / a.max_part))
    target = total / nparts
    # cut right after a tear finishes (scene start + T), nearest to even spacing
    cands = [(st + T) / fps for st in starts[1:]]
    cuts = []
    for k in range(1, nparts):
        cuts.append(min(cands, key=lambda t: abs(t - k * target)))
    bounds = [0.0, *sorted(set(cuts)), total]
    for i in range(len(bounds) - 1):
        p = OUT / f"{a.slug}-p{i+1}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{bounds[i]:.3f}", "-to", f"{bounds[i+1]:.3f}",
                        "-i", final, *enc_meta, "-c:a", "aac", "-b:a", "160k", p], check=True)
        print("part", i + 1, round(bounds[i + 1] - bounds[i], 1), "s")
        deliverables.append(p)

if a.chunks:
    ch = OUT / "chunks"; ch.mkdir(exist_ok=True)
    for f in deliverables:
        subprocess.run(f"gzip -1 -c '{f}' | split -b 19m - '{ch}/{f.name}.gz.part.'", shell=True, check=True)
    print("chunks in", ch)
for f in deliverables:
    print(f.name, round(f.stat().st_size / 1e6, 1), "MB")
