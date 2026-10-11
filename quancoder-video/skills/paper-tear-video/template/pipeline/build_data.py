"""Build src/data.json: scene timing + caption phrases aligned to pauses in the narration."""
import json, math, pathlib, re
import numpy as np
try:
    import soundfile as sf
except ImportError:  # fallback reader
    from scipy.io import wavfile
    class sf:
        @staticmethod
        def read(p):
            sr, a = wavfile.read(p)
            a = a.astype(np.float32) / (32768 if a.dtype == np.int16 else 1)
            return a, sr

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
T = 24          # tear transition length (frames)
HEAD = 0.15     # silence padding added by tts.py

script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
durs = json.loads((ROOT / "pipeline" / "durations.json").read_text())
cf = ROOT / "pipeline" / "credits.json"
credits = json.loads(cf.read_text(encoding="utf-8")) if cf.exists() else {}


def phrases(text, max_words=8):
    parts = [p.strip() for p in re.split(r"(?<=[,.?!:;])\s+", text) if p.strip()]
    out = []
    for p in parts:
        w = p.split()
        if len(w) <= max_words:
            out.append(p); continue
        k = math.ceil(len(w) / max_words)
        size = math.ceil(len(w) / k)
        for i in range(0, len(w), size):
            out.append(" ".join(w[i:i + size]))
    return out


def pauses(wav):
    """Return list of (mid_time) for silent gaps >= 110 ms."""
    a, sr = sf.read(wav)
    if a.ndim > 1: a = a.mean(1)
    hop = int(sr * 0.01)
    env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    thr = max(0.02 * env.max(), 1e-4)
    silent = env < thr
    res, start = [], None
    for i, s in enumerate(silent):
        if s and start is None: start = i
        if (not s or i == len(silent) - 1) and start is not None:
            if i - start >= 11: res.append(((start + i) / 2) * 0.01)
            start = None
    return res


def media_entry(src):
    p = ROOT / "public" / src
    if not p.exists():
        raise SystemExit(f"missing media: public/{src}")
    video = p.suffix.lower() in (".mp4", ".mov", ".webm")
    frames = None
    if video:
        import subprocess
        d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))
        frames = int(d * FPS)
    return {"src": src, "video": video, "frames": frames}


def weight(p):
    w = len(p.split()) + 0.4
    if p[-1] in ".?!:": w += 1.2
    elif p[-1] in ",;": w += 0.6
    return w


scenes, cursor = [], 0
N = len(script["scenes"])
for i, sc in enumerate(script["scenes"]):
    dur = durs[sc["id"]]
    aud = math.ceil(dur * FPS)
    lead = T if i > 0 else 0
    tail = T if i < N - 1 else 45
    ph = phrases(sc["text"])
    # proportional estimate, then snap boundaries to nearest detected pause
    speech_start, speech_end = HEAD, dur - 0.3
    ws = [weight(p) for p in ph]
    tot = sum(ws)
    bounds, acc = [speech_start], speech_start
    for w in ws[:-1]:
        acc += w / tot * (speech_end - speech_start)
        bounds.append(acc)
    ps = pauses(ROOT / "public" / "audio" / f"{sc['id']}.wav")
    for k in range(1, len(bounds)):
        near = [q for q in ps if abs(q - bounds[k]) < 0.9 and q > bounds[k - 1] + 0.5]
        if near:
            bounds[k] = min(near, key=lambda q: abs(q - bounds[k]))
    bounds.append(dur)
    caps = [{"text": p, "from": round(lead + bounds[k] * FPS), "to": round(lead + bounds[k + 1] * FPS)}
            for k, p in enumerate(ph)]
    imgs = [media_entry(f"img/{sc['id']}_{n+1}.jpg") for n in range(len(sc.get("queries", [])))
            if f"{sc['id']}_{n+1}" in credits]
    if sc.get("media"):  # user-supplied stills/clips (paths relative to public/) override CC photos slot by slot
        # null keeps the CC photo in that slot, e.g. [null, "user/fr_3.jpg"] replaces only the cutout
        slots = list(imgs) + [None] * max(0, len(sc["media"]) - len(imgs))
        for k, m in enumerate(sc["media"]):
            if m: slots[k] = media_entry(m)
        imgs = [x for x in slots if x]
        for m in [x for x in imgs if x["video"]]:
            if m["frames"] and m["frames"] < lead + aud + T:
                print(f"note: {m['src']} ({m['frames']} f) shorter than scene {sc['id']} — it will loop")
    scenes.append({
        "id": sc["id"], "label": sc["label"], "index": i + 1, "kind": sc.get("kind", "scene"),
        "audio": f"audio/{sc['id']}.wav", "images": imgs,
        "lead": lead, "audioFrames": aud, "duration": lead + aud + tail,
        "captions": caps,
    })

total = sum(s["duration"] for s in scenes) - T * (N - 1)
tc = script.get("titleCard") or {"kicker": "", "lines": [script["title"].upper()], "accent": ""}
data = {"fps": FPS, "tear": T, "total": total, "title": script["title"], "titleCard": tc,
        "chapterWord": script.get("chapterWord", "CHƯƠNG"),
        "safeArea": {"scale": 0.86, "offsetX": -24, "offsetY": -30, **script.get("safeArea", {})},
        "branding": {"channel": "", "sub": "", "tiktok": "", "fanpage": "", "endKicker": "", **script.get("branding", {})}, "accentColor": script.get("accentColor", "#b3261e"),
        "scenes": scenes}
(ROOT / "src" / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print("total frames", total, "=", round(total / FPS / 60, 2), "min")
