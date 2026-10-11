import json, pathlib, io, time, urllib.request
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
db = json.loads((ROOT/"pipeline/cand/db.json").read_text())
picks = json.loads((ROOT/"pipeline/picks.json").read_text())
OUT = ROOT/"public/img"; OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "PaperTearVideo/1.0 (educational video pipeline)"}
credits = {}
for sid, lst in picks.items():
    for n, ref in enumerate(lst):
        slot, idx = ref.split(":"); it = db[slot]["items"][int(idx)]
        dest = OUT/f"{sid}_{n+1}.jpg"
        if not dest.exists():
            u = it["url"]
            if "upload.wikimedia.org" in u and "/thumb/" not in u:
                parts = u.split("/wikipedia/commons/")[1]; name = parts.split("/")[-1]
                u = f"https://upload.wikimedia.org/wikipedia/commons/thumb/{parts}/1280px-{name}"
            raw = None
            for k in range(4):
                try:
                    raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read(); break
                except Exception as e:
                    print("retry", u, e); time.sleep(4*(k+1))
                    if k == 1 and "/thumb/" in u: u = it["url"]
            if raw is None: print("FAILED", sid, n+1); continue
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            im.thumbnail((1600, 1600)); im.save(dest, quality=90)
        credits[f"{sid}_{n+1}"] = {k: it.get(k) for k in ("title","creator","license","license_version","foreign_landing_url","source")}
        print(sid, n+1, Image.open(dest).size, flush=True)
(ROOT/"pipeline/credits.json").write_text(json.dumps(credits, indent=1, ensure_ascii=False))
