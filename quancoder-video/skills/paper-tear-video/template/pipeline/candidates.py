"""Fetch candidate photos per query from Openverse (Flickr/Wikimedia CC) and build contact sheets."""
import re, json, pathlib, sys, time, urllib.parse, urllib.request, io
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAND = ROOT / "pipeline" / "cand"
CAND.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "PaperTearVideo/1.0 (educational video pipeline)"}


def get(url, timeout=40):
    for k in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (k + 1)); continue
            raise
    raise RuntimeError("429 " + url)


def thumb(it):
    u = it["url"]
    m = re.match(r"(https://upload.wikimedia.org/wikipedia/commons)/(\w)/(\w\w)/(.+)$", u)
    if m:
        return f"{m[1]}/thumb/{m[2]}/{m[3]}/{m[4]}/330px-{m[4]}" + (".jpg" if m[4].lower().endswith((".tif", ".tiff")) else "")
    m = re.match(r"(https://live.staticflickr.com/\d+/\d+_[0-9a-f]+)(_\w)?\.jpg", u)
    if m:
        return m[1] + "_n.jpg"
    return u


def search(q, n=8):
    p = {"q": q, "page_size": 20, "license_type": "commercial", "mature": "false"}
    d = json.loads(get("https://api.openverse.org/v1/images/?" + urllib.parse.urlencode(p)))
    out = []
    for r in d.get("results", []):
        w, h = r.get("width") or 0, r.get("height") or 0
        if w and h and (min(w, h) < 600 or max(w, h) / min(w, h) > 2.2): continue
        out.append({k: r.get(k) for k in ("id", "title", "url", "thumbnail", "creator", "license", "license_version",
                                          "foreign_landing_url", "source", "width", "height")})
        if len(out) >= n: break
    return out


script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
only = set(sys.argv[1:])
db_file = CAND / "db.json"
db = json.loads(db_file.read_text()) if db_file.exists() else {}
for sc in script["scenes"]:
    if only and sc["id"] not in only: continue
    for qi, q in enumerate(sc.get("queries", [])):
        key = f"{sc['id']}_{qi+1}"
        if key in db and not only: continue
        try:
            res = search(q)
        except Exception as e:
            print("fail", key, e); continue
        db[key] = {"query": q, "items": res}
        # contact sheet
        tw, th = 300, 300
        sheet = Image.new("RGB", (tw * 4, (th + 24) * 2), "white")
        dr = ImageDraw.Draw(sheet)
        for i, it in enumerate(res[:8]):
            try:
                im = Image.open(io.BytesIO(get(thumb(it)))).convert("RGB")
                im.thumbnail((tw, th))
                x, y = (i % 4) * tw, (i // 4) * (th + 24)
                sheet.paste(im, (x, y))
                dr.text((x + 4, y + th + 4), f"{i} {it['width']}x{it['height']}", fill="black")
            except Exception as e:
                print("thumb fail", e)
        sheet.save(CAND / f"{key}.jpg", quality=80)
        db_file.write_text(json.dumps(db, indent=1, ensure_ascii=False))
        print("sheet", key, len(res), flush=True)
        time.sleep(1.5)
