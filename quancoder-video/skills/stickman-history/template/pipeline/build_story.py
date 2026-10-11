"""Build src/data.json for the stick-figure history format.

Reads script.json (scenes with items) + pipeline/durations.json (from tts.py).
Captions: phrases split on punctuation, timed by word weight and snapped to pauses in the wav;
"capReplace" swaps spoken number words for digits on screen (timing still uses spoken length).
Usage: python pipeline/build_story.py [--fake]   (--fake: estimate durations at 4.1 words/s, for layout previews)
"""
import json, math, pathlib, re, sys
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from config import CFG

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = CFG.get("video", {})
FPS, T, HEAD = int(V.get("fps", 30)), int(V.get("transitionFrames", 18)), 0.15
MAXW = int(V.get("captionMaxWords", 11))
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
fake = "--fake" in sys.argv
dfile = ROOT / "pipeline" / "durations.json"
durs = json.loads(dfile.read_text()) if dfile.exists() else {}
rep = script.get("capReplace", {})


def pauses(wav):
    import soundfile as sf
    a, sr = sf.read(wav)
    if a.ndim > 1: a = a.mean(1)
    hop = int(sr * 0.01)
    env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    thr = max(0.02 * env.max(), 1e-4)
    res, start = [], None
    for i, s in enumerate(env < thr):
        if s and start is None: start = i
        if (not s or i == len(env) - 1) and start is not None:
            if i - start >= 11: res.append(((start + i) / 2) * 0.01)
            start = None
    return res


def phrases(text, max_words=None):
    max_words = max_words or MAXW
    parts = [p.strip() for p in re.split(r"(?<=[,.?!:;])\s+", text) if p.strip()]
    out = []
    for p in parts:
        w = p.split()
        if len(w) <= max_words:
            out.append(p); continue
        k = math.ceil(len(w) / max_words); size = math.ceil(len(w) / k)
        out += [" ".join(w[i:i + size]) for i in range(0, len(w), size)]
    return out


def weight(p):
    w = len(p.split()) + 0.4
    if p[-1] in ".?!:": w += 1.2
    elif p[-1] in ",;": w += 0.6
    return w


def display(p):
    for k, v in sorted(rep.items(), key=lambda kv: -len(kv[0])):
        p = re.sub(re.escape(k), v, p, flags=re.IGNORECASE) if k.lower() in p.lower() else p
    return p


scenes, N = [], len(script["scenes"])
for i, sc in enumerate(script["scenes"]):
    if fake or sc["id"] not in durs:
        if not fake: sys.exit(f"missing duration for {sc['id']} (run tts.py or use --fake)")
        dur = len(sc["text"].split()) / float(CFG.get("voice", {}).get("wordsPerSecond", 4.6)) + 0.5
    else:
        dur = durs[sc["id"]]
    aud = math.ceil(dur * FPS)
    lead = T if i > 0 else 0
    tail = T if i < N - 1 else 60
    ph = phrases(sc["text"])
    s0, s1 = HEAD, dur - 0.3
    ws = [weight(p) for p in ph]; tot = sum(ws)
    bounds, acc = [s0], s0
    for w_ in ws[:-1]:
        acc += w_ / tot * (s1 - s0); bounds.append(acc)
    wav = ROOT / "public" / "audio" / f"{sc['id']}.wav"
    if wav.exists() and not fake:
        ps = pauses(wav)
        for k in range(1, len(bounds)):
            near = [q for q in ps if abs(q - bounds[k]) < 0.9 and q > bounds[k - 1] + 0.5]
            if near: bounds[k] = min(near, key=lambda q: abs(q - bounds[k]))
    bounds.append(dur)
    caps = [{"text": display(p), "from": round(lead + bounds[k] * FPS), "to": round(lead + bounds[k + 1] * FPS)} for k, p in enumerate(ph)]
    scenes.append({
        "id": sc["id"], "index": i + 1, "label": sc["label"], "chapter": sc.get("chapter"), "kind": sc.get("kind", "scene"),
        "audio": f"audio/{sc['id']}.wav", "lead": lead, "audioFrames": aud, "duration": lead + aud + tail,
        "night": sc.get("night", False), "tint": sc.get("tint"), "camera": sc.get("camera"), "shake": sc.get("shake", []),
        "sfx": sc.get("sfx", []), "items": sc["items"], "captions": caps,
        "sky": sc.get("sky"), "skyStrength": sc.get("skyStrength"), "transition": sc.get("transition"),
    })

total = sum(s["duration"] for s in scenes) - T * (N - 1)
A, ST = CFG.get("audio", {}), CFG.get("style", {})
ch = CFG.get("channel", {})
data = {"fps": FPS, "tear": T, "total": total, "title": script["title"],
        "musicVolume": script.get("musicVolume", A.get("musicVolume", 0.11)),
        "sfxVolume": A.get("sfxVolume", 1.0), "swishVolume": A.get("transitionSwishVolume", 0.35),
        "branding": script.get("branding", {"channel": ch.get("watermark", ch.get("name", "")), "sub": ch.get("watermarkSub", "")}),
        "style": ST, "captions": V.get("captions", True), "captionFontSize": V.get("captionFontSize", 46),
        "chapterFrames": int(float(V.get("chapterSeconds", 3.7)) * FPS), "scenes": scenes}
(ROOT / "src" / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print("total frames", total, "=", round(total / FPS / 60, 2), "min")
