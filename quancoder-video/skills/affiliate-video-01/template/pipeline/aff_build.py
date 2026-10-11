"""script.json + pipeline/durations.json → src/aff.json (scene timing, element beats, SFX cues, style).

Usage: python pipeline/aff_build.py
Every element entrance time ("beats", in frames from scene start) is computed here once, so the
Remotion scenes and the SFX cues always line up.
"""
import json, math, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from styles import resolve

FPS = 30
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
dur = json.loads((ROOT / "pipeline/durations.json").read_text())
skey, ST = resolve(script.get("voiceStyle"))

# which sound plays for each kind of moment, per SFX profile: (file, volume)
PROFILES = {
    "normal":  dict(cut=("whoosh", .35), pop=[("pop", .45)], hook=("impact", .6), strike=("whoosh", .4), slam=("impact", .6), cash=("ding", .5), cta=("ding", .35)),
    "funny":   dict(cut=("swish", .4), pop=[("boing", .35), ("pop", .45)], hook=("scratch", .6), strike=("swish", .5), slam=("impact", .6), cash=("ding", .5), cta=("boing", .4)),
    "cute":    dict(cut=("swish", .35), pop=[("pop", .4), ("sparkle", .3)], hook=("sparkle", .5), strike=("swish", .4), slam=("sparkle", .45), cash=("ding", .45), cta=("sparkle", .4)),
    "minimal": dict(cut=("swish", .18), pop=[("tick", .3)], hook=None, strike=None, slam=("tick", .35), cash=("ding", .3), cta=None),
    "drama":   dict(cut=("whoosh", .4), pop=[("impact", .3)], hook=("boom", .7), strike=("riser", .45), slam=("boom", .7), cash=("ding", .45), cta=("impact", .45)),
}
P = PROFILES[ST["sfx"]]


def beats_for(sc, d):
    k = sc["kind"]
    if k == "hook":
        return {"top": 0, "big": 8}
    if k == "product":
        return {"tag": 4, "chip": round(d * .45)}
    if k == "chips":
        items = sc.get("items", []); step = d * .55 / max(1, len(items))
        return {"title": 0, "items": [round(8 + i * step) for i in range(len(items))]}
    if k == "steps":
        st = sc.get("steps", []); step = d * .6 / max(1, len(st))
        return {"title": 0, "steps": [round(6 + i * step) for i in range(len(st))], "chip": round(d * .72)}
    if k == "proof":
        rv = sc.get("reviews", [])
        c1 = min(30, round(d * .3)); s1 = min(55, round(d * .5))
        return {"countFrom": 4, "countTo": c1, "starsTo": s1, "reviews": [round(d * .38 + i * d * .15) for i in range(len(rv))]}
    if k == "price":
        return {"strikeFrom": 10, "strikeTo": 20, "new": 22, "badge": 30}
    if k == "compare":
        return {"left": 0, "wipe": round(d * .4), "right": round(d * .5)}
    if k == "statement":
        return {"big": 2, "sub": round(d * .45)}
    if k == "cta":
        return {"main": 0, "arrow": 8}
    sys.exit(f"unknown scene kind: {k}")


scenes, sfx, t = [], [], 0
for i, sc in enumerate(script["scenes"]):
    if sc["id"] not in dur:
        sys.exit(f"no audio for {sc['id']} — run pipeline/tts.py")
    d = math.ceil(dur[sc["id"]] * FPS) + 3
    if sc["kind"] == "cta":
        d += round(script.get("ctaHoldSec", 1.5) * FPS)
    b = beats_for(sc, d)
    scenes.append({**sc, "from": t, "dur": d, "beats": b})
    pops = P["pop"]
    def pop(at, j=0):
        name, v = pops[j % len(pops)]; sfx.append([name, t + at, v])
    if i > 0 and P["cut"]:
        sfx.append([P["cut"][0], max(0, t - 4), P["cut"][1]])
    k = sc["kind"]
    if k == "hook":
        if P["hook"]: sfx.append([P["hook"][0], t + 2, P["hook"][1]])
        pop(b["big"], 1)
    elif k == "product": pop(b["tag"]); pop(b["chip"], 1)
    elif k == "chips": [pop(x, j) for j, x in enumerate(b["items"])]
    elif k == "steps": [pop(x, j) for j, x in enumerate(b["steps"])]; pop(b["chip"])
    elif k == "proof": [pop(x, j) for j, x in enumerate(b["reviews"])]; sfx.append(["tick", t + b["countTo"], .3])
    elif k == "price":
        if P["strike"]: sfx.append([P["strike"][0], t + b["strikeFrom"], P["strike"][1]])
        sfx.append([P["slam"][0], t + b["new"], P["slam"][1]]); sfx.append([P["cash"][0], t + b["new"] + 2, P["cash"][1]]); pop(b["badge"])
    elif k == "compare": pop(b["left"]); sfx.append([P["cut"][0], t + b["wipe"], P["cut"][1]]); pop(b["right"], 1)
    elif k == "statement": pop(b["big"]); pop(b["sub"], 1)
    elif k == "cta":
        if P["cta"]: sfx.append([P["cta"][0], t + 2, P["cta"][1]])
    t += d

pal = {"primary": "#1d5a37", "dark": "#0f2e1c", "accent": "#e0294a", "highlight": "#ffd23f", "light": "#fbf5e6"}
pal.update(script.get("palette", {}))
out = {"total": t, "fps": FPS, "style": skey, "energy": ST["energy"], "palette": pal,
       "musicVolume": script.get("musicVolume", 0.16 if ST["sfx"] != "minimal" else 0.12),
       "arrow": script.get("ctaArrow", "bottom-left"), "ctaHoldSec": script.get("ctaHoldSec", 1.5), "scenes": scenes, "sfx": sfx}
(ROOT / "src/aff.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"style={skey} total={t} frames = {t / FPS:.1f}s, scenes={len(scenes)}, sfx={len(sfx)}")
