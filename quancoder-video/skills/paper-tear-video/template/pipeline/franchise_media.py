"""Official stills/posters for a specific donghua / anime / novel adaptation (character analyses, recaps).

Sources (no scraping of video platforms, no fan art):
  - Fandom wiki of the work (MediaWiki API; screenshots/posters uploaded to the wiki)
  - AniList (official cover + character key art)

  python pipeline/franchise_media.py wiki <subdomain> <sheet_dir> <term> [term …]
        e.g. wiki sword-of-coming rv "Chen Ping An" "Ning Yao" "Qi Jingchun"
  python pipeline/franchise_media.py anilist <search title> <sheet_dir>
  python pipeline/franchise_media.py fetch <id> [id …]     -> public/user/fr_<id>.<ext>, credits in pipeline/franchise_credits.json

Every search appends to pipeline/franchise_catalog.json; contact-sheet tiles are labelled "<id> <w>x<h> <name>".
"""
import io, json, pathlib, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAT = ROOT / "pipeline" / "franchise_catalog.json"
CRED = ROOT / "pipeline" / "franchise_credits.json"
OUT = ROOT / "public" / "user"; OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (PaperTearVideo commentary pipeline)"}
FANART_HINTS = ("fanart", "fan_art", "fan-art", "by_", "commission", "cosplay", "meme")


def get(url, data=None, headers=None):
    h = dict(UA, **(headers or {}))
    for k in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(4 * (k + 1)); continue
            raise
    raise RuntimeError("429 " + url)


cat = json.loads(CAT.read_text()) if CAT.exists() else []


def add(item):
    item["id"] = len(cat); cat.append(item); return item


def sheet(items, sheet_dir, tag):
    sheet_dir = pathlib.Path(sheet_dir); sheet_dir.mkdir(parents=True, exist_ok=True)
    for s in range(0, len(items), 24):
        sh = Image.new("RGB", (6 * 320, 4 * 300), "white"); dr = ImageDraw.Draw(sh)
        for k, it in enumerate(items[s:s + 24]):
            try:
                im = Image.open(io.BytesIO(get(it["thumb"]))).convert("RGB"); im.thumbnail((316, 276))
                x, y = (k % 6) * 320, (k // 6) * 300
                sh.paste(im, (x, y)); dr.text((x + 3, y + 280), f"{it['id']} {it['w']}x{it['h']} {it['name'][:24]}", fill="black")
            except Exception as e:
                print("thumb fail", it["name"], e)
        p = sheet_dir / f"{tag}_{s // 24:02d}.jpg"; sh.save(p, quality=80); print(p)


cmd = sys.argv[1]
if cmd == "wiki":
    sub, sheet_dir, terms = sys.argv[2], sys.argv[3], sys.argv[4:]
    api = f"https://{sub}.fandom.com/api.php"
    found, seen = [], {c.get("url") for c in cat}
    for t in terms:
        q = {"action": "query", "format": "json", "generator": "search", "gsrsearch": t, "gsrnamespace": 6, "gsrlimit": 30,
             "prop": "imageinfo", "iiprop": "url|size|mime"}
        d = json.loads(get(api + "?" + urllib.parse.urlencode(q)))
        for p in d.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            name = p["title"].split(":", 1)[-1]
            if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp") or ii.get("url") in seen: continue
            if any(h in name.lower() for h in FANART_HINTS) or min(ii.get("width", 0), ii.get("height", 0)) < 300: continue
            base = ii["url"].split("/revision/")[0]
            found.append(add({"src": "fandom", "wiki": sub, "name": name, "url": base + "/revision/latest",
                              "thumb": base + "/revision/latest/scale-to-width-down/320", "w": ii["width"], "h": ii["height"],
                              "page": f"https://{sub}.fandom.com/wiki/{urllib.parse.quote(p['title'])}"}))
            seen.add(ii["url"])
    CAT.write_text(json.dumps(cat, indent=1, ensure_ascii=False)); sheet(found, sheet_dir, f"wiki_{sub}")
    print(len(found), "images")
elif cmd == "anilist":
    title, sheet_dir = sys.argv[2], sys.argv[3]
    q = {"query": "query($s:String){Media(search:$s,type:ANIME){id title{romaji native} coverImage{extraLarge} bannerImage "
                  "characters(perPage:25,sort:ROLE){nodes{name{full native} image{large}}}}}", "variables": {"s": title}}
    m = json.loads(get("https://graphql.anilist.co", json.dumps(q).encode(), {"Content-Type": "application/json"}))["data"]["Media"]
    page = f"https://anilist.co/anime/{m['id']}"
    items = []
    for name, url in [("cover", m["coverImage"]["extraLarge"]), ("banner", m.get("bannerImage"))] + \
                     [(c["name"]["full"] + " " + (c["name"]["native"] or ""), c["image"]["large"]) for c in m["characters"]["nodes"]]:
        if not url or "default" in url: continue
        im = Image.open(io.BytesIO(get(url)))
        items.append(add({"src": "anilist", "name": name.strip(), "url": url, "thumb": url, "w": im.width, "h": im.height, "page": page}))
    CAT.write_text(json.dumps(cat, indent=1, ensure_ascii=False)); sheet(items, sheet_dir, "anilist")
    print(m["title"], len(items), "images")
elif cmd == "fetch":
    cred = json.loads(CRED.read_text()) if CRED.exists() else {}
    for i in map(int, sys.argv[2:]):
        it = cat[i]
        im = Image.open(io.BytesIO(get(it["url"]))).convert("RGB"); im.thumbnail((1920, 1920))
        out = OUT / f"fr_{i}.jpg"; im.save(out, quality=92)
        cred[f"user/fr_{i}.jpg"] = {k: it[k] for k in ("name", "page", "src")}
        print(f"user/fr_{i}.jpg", im.size, "(small — use as cutout, slot 2)" if max(im.size) < 1000 else "")
    CRED.write_text(json.dumps(cred, indent=1, ensure_ascii=False))
