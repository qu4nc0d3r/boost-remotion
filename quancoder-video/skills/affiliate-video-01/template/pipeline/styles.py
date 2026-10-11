"""Voice/visual style presets for /affiliate-video-01.

Each style drives: TTS sampling temperature, post-TTS tempo + pitch, the procedural
music bed (bpm + mood), the SFX set, and the motion energy of the Remotion scenes.
VieNeu v3 Turbo has no style knob (the style lives in the reference voice), so the
wording of the script does most of the work — see references/voice-styles.md.
"""
import unicodedata

STYLES = {
    # key: temperature, tempo (1 = unchanged), pitch in semitones, bpm, music mood, sfx set, motion energy, words/s after tempo
    "hao-hung":   dict(label="Hào hứng",   temp=0.45, tempo=1.05, semitones=0.0, bpm=118, mood="pop",     sfx="normal",  energy=1.0, wps=4.9),
    "hai-huoc":   dict(label="Hài hước",   temp=0.60, tempo=1.08, semitones=0.0, bpm=124, mood="bouncy",  sfx="funny",   energy=1.3, wps=5.0),
    "nhi-nhanh":  dict(label="Nhí nhảnh",  temp=0.55, tempo=1.10, semitones=1.0, bpm=128, mood="cute",    sfx="cute",    energy=1.25, wps=5.1),
    "nghiem-tuc": dict(label="Nghiêm túc", temp=0.35, tempo=1.00, semitones=0.0, bpm=96,  mood="calm",    sfx="minimal", energy=0.55, wps=4.5),
    "nhe-nhang":  dict(label="Nhẹ nhàng",  temp=0.35, tempo=0.97, semitones=0.0, bpm=86,  mood="lofi",    sfx="minimal", energy=0.5, wps=4.3),
    "kich-tinh":  dict(label="Kịch tính",  temp=0.45, tempo=1.03, semitones=-0.5, bpm=110, mood="tension", sfx="drama",   energy=1.1, wps=4.8),
}
DEFAULT = "hao-hung"

ALIASES = {
    "hao hung": "hao-hung", "hype": "hao-hung", "nang luong": "hao-hung", "soi noi": "hao-hung", "energetic": "hao-hung",
    "hai huoc": "hai-huoc", "funny": "hai-huoc", "vui nhon": "hai-huoc", "lay loi": "hai-huoc", "bua": "hai-huoc",
    "nhi nhanh": "nhi-nhanh", "cute": "nhi-nhanh", "de thuong": "nhi-nhanh", "dang yeu": "nhi-nhanh", "tre trung": "nhi-nhanh",
    "nghiem tuc": "nghiem-tuc", "serious": "nghiem-tuc", "chuyen gia": "nghiem-tuc", "tin tuc": "nghiem-tuc", "review chan thuc": "nghiem-tuc",
    "nhe nhang": "nhe-nhang", "calm": "nhe-nhang", "tam tinh": "nhe-nhang", "thu gian": "nhe-nhang", "chill": "nhe-nhang",
    "kich tinh": "kich-tinh", "drama": "kich-tinh", "hoi hop": "kich-tinh", "gay can": "kich-tinh",
}


def _plain(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "").replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip().replace("-", " ")


def resolve(name: str | None) -> tuple[str, dict]:
    """Map a free-text style ("nhí nhảnh", "funny", "hai-huoc") to a preset. Unknown → closest by alias, else default."""
    p = _plain(name or "")
    if not p:
        return DEFAULT, STYLES[DEFAULT]
    key = p.replace(" ", "-")
    if key in STYLES:
        return key, STYLES[key]
    if p in ALIASES:
        return ALIASES[p], STYLES[ALIASES[p]]
    for a, k in ALIASES.items():
        if a in p or p in a:
            return k, STYLES[k]
    return DEFAULT, STYLES[DEFAULT]


if __name__ == "__main__":
    import sys
    k, v = resolve(" ".join(sys.argv[1:]))
    print(k, v)
