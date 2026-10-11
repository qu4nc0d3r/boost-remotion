"""Transcribe each scene's narration (faster-whisper) and flag scenes whose words, numbers or prices
don't match the script — TTS sometimes skips or garbles numbers.
  python pipeline/check_audio.py [model=small]
Needs: pip install faster-whisper --break-system-packages (model downloads from Hugging Face once).
"""
import json, sys, pathlib, re, unicodedata
from faster_whisper import WhisperModel
ROOT = pathlib.Path(__file__).resolve().parent.parent
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
model = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else "small", device="cpu", compute_type="int8")

D = "không một hai ba bốn năm sáu bảy tám chín".split()

def read3(n, full=False):
    h, t, u = n // 100, n // 10 % 10, n % 10
    w = []
    if h or full: w += [D[h], "trăm"]
    if t > 1: w += [D[t], "mươi"] + ([] if u == 0 else ["mốt" if u == 1 else "tư" if u == 4 else "lăm" if u == 5 else D[u]])
    elif t == 1: w += ["mười"] + ([] if u == 0 else ["lăm" if u == 5 else D[u]])
    elif u: w += (["lẻ"] if (h or full) else []) + [D[u]]
    return w

def say(n):
    if n == 0: return ["không"]
    parts, units = [], ["", "nghìn", "triệu", "tỷ"]
    i = 0
    while n:
        parts.append((n % 1000, units[i])); n //= 1000; i += 1
    w = []
    for k, (v, u) in enumerate(reversed(parts)):
        if v: w += read3(v, full=k > 0) + ([u] if u else [])
    return w

def spell_numbers(s):
    s = re.sub(r"(\d)\s*(đ|k)(?=\W|$)", lambda m: m.group(1) + (" đồng" if m.group(2) == "đ" else " nghìn"), s)
    s = re.sub(r"(\d+)[.,](\d)\b", lambda m: f"{m.group(1)} chấm {m.group(2)}", s)   # 4,8 → 4 chấm 8
    s = re.sub(r"(\d{1,3}(?:\.\d{3})+|\d+)", lambda m: " ".join(say(int(m.group(1).replace(".", "")))), s)
    return s.replace("%", " phần trăm")

def toks(s):
    s = unicodedata.normalize("NFC", spell_numbers(s).lower())
    return re.findall(r"\w+", s)

bad = 0
for sc in script["scenes"]:
    segs, _ = model.transcribe(str(ROOT / f"public/audio/{sc['id']}.wav"), language="vi", beam_size=5)
    heard = " ".join(s.text for s in segs).strip()
    a, b = toks(sc["text"]), toks(heard)
    hit = sum(1 for w in a if w in b) / max(1, len(a))
    flag = "OK " if hit >= 0.75 else "CHECK"
    bad += flag != "OK "
    print(f"{flag} {sc['id']} match={hit:.0%}\n   script: {sc['text']}\n   heard : {heard}")
print("ALL OK" if not bad else f"{bad} scene(s) flagged — whisper also mishears; regenerate only when a number, price or product name is missing/wrong")
