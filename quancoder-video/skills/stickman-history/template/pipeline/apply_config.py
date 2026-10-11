"""Inject config into script.json before TTS: voice/voiceRef, branding, music volume, outro text.
Values already present in script.json win (per-video overrides). Run after writing script.json."""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from config import CFG, ROOT, fmt

sp = ROOT / "script.json"
s = json.loads(sp.read_text(encoding="utf-8"))
v = CFG.get("voice", {})
s.setdefault("voice", v.get("name", "Thiện Minh"))
if "voiceRef" not in s and v.get("ref"):
    s["voiceRef"] = v["ref"]
ch = CFG.get("channel", {})
s.setdefault("branding", {"channel": ch.get("watermark", ch.get("name", "")), "sub": ch.get("watermarkSub", "")})
s.setdefault("musicVolume", CFG.get("audio", {}).get("musicVolume", 0.11))
# outro scene: fill {channel} placeholders and default items
for sc in s["scenes"]:
    sc["text"] = fmt(sc["text"])
    for it in sc.get("items", []):
        if isinstance(it.get("text"), str):
            it["text"] = fmt(it["text"])
    if sc.get("kind") == "outro" and not sc.get("items"):
        oc = ch.get("outroCard", {})
        sc["items"] = [
            {"type": "ground", "y": 860},
            {"type": "stick", "x": 420, "y": 860, "hat": "general", "weapon": "flag", "scale": 1.4, "pose": "cheer"},
            {"type": "text", "text": oc.get("kicker", ""), "style": "hand", "size": 56, "x": 1150, "y": 360},
            {"type": "text", "text": oc.get("title", ch.get("name", "")), "style": "title", "size": 120, "color": "red", "x": 1150, "y": 520, "at": 0.15},
            {"type": "text", "text": oc.get("sub", ""), "style": "hand", "size": 46, "x": 1150, "y": 650, "at": 0.35},
        ]
sp.write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
print("script.json: voice =", s["voice"], "| ref =", s.get("voiceRef"), "| channel =", s["branding"].get("channel"))
