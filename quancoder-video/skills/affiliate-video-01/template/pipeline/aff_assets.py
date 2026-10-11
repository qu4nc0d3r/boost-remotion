"""Procedural music bed + SFX (no downloads, no licensing issues).

Usage: python pipeline/aff_assets.py <seconds>   (mood/bpm from script.json voiceStyle, or script.json "music")
Writes public/beat.m4a and public/sfx/*.wav
"""
import sys, json, pathlib, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from styles import resolve

PUB = ROOT / "public"; (PUB / "sfx").mkdir(parents=True, exist_ok=True)
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
_, ST = resolve(script.get("voiceStyle"))
music = script.get("music", {})
MOOD, BPM = music.get("mood", ST["mood"]), float(music.get("bpm", ST["bpm"]))
SR = 44100
rng = np.random.default_rng(3)
dur = float(sys.argv[1]) if len(sys.argv) > 1 else 40
n = int(dur * SR); t = np.arange(n) / SR
beat = 60 / BPM
mix = np.zeros(n)


def lp(x, f): return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(4, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], "band", fs=SR, output="sos"), x)
def ar(d): return np.arange(int(d * SR)) / SR


def add(sig, at, g=1.0):
    i = int(at * SR); j = min(n, i + len(sig))
    if 0 <= i < n: mix[i:j] += sig[: j - i] * g


def kick(soft=False):
    tt = ar(0.35); f = 50 + (60 if soft else 90) * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (12 if soft else 9))
def hat(): tt = ar(0.06); return hp(rng.standard_normal(len(tt)), 7000) * np.exp(-tt * 70)
def clap(): tt = ar(0.18); return bp(rng.standard_normal(len(tt)), 1000, 4000) * np.exp(-tt * 25)
def pluck(f, d=0.28, bright=1.0):
    tt = ar(d); return (np.sin(2*np.pi*f*tt) + 0.4*bright*np.sin(4*np.pi*f*tt) + 0.15*bright*np.sin(6*np.pi*f*tt)) * np.exp(-tt * 11)
def bell(f, d=0.9):
    tt = ar(d); return (np.sin(2*np.pi*f*tt) + 0.5*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6)) * np.exp(-tt * 4)
def pad(fs, d):
    tt = ar(d); env = np.minimum(1, tt / 0.4) * np.minimum(1, (d - tt) / 0.5)
    return sum(np.sin(2*np.pi*f*tt) + 0.2*np.sin(4*np.pi*f*tt) for f in fs) * env / len(fs)
def bass(f, d, square=True):
    tt = ar(d); s = (np.sign(np.sin(2*np.pi*f*tt)) * 0.5 if square else 0) + np.sin(2*np.pi*f*tt)
    return lp(s, 400) * np.minimum(1, (d - tt) * 20) * np.minimum(1, tt * 200)


MAJOR = [(261.63, [261.63, 329.63, 392.0]), (196.0, [246.94, 293.66, 392.0]), (220.0, [261.63, 329.63, 440.0]), (174.61, [261.63, 349.23, 440.0])]
MINOR = [(220.0, [220.0, 261.63, 329.63]), (174.61, [174.61, 220.0, 261.63]), (146.83, [174.61, 220.0, 293.66]), (164.81, [164.81, 207.65, 246.94])]
nb = int(dur / beat) + 1
for b in range(nb):
    at = b * beat
    prog = MINOR if MOOD == "tension" else MAJOR
    root, ch = prog[(b // 4) % 4]
    if MOOD in ("pop", "bouncy"):
        add(kick(), at, 0.9); add(hat(), at + beat / 2, 0.25)
        if b % 2: add(clap(), at, 0.35)
        if MOOD == "bouncy":  # staccato octave bass + off-beat stabs
            add(bass(root / 2, beat * 0.2), at, 0.4); add(bass(root, beat * 0.2), at + beat / 2, 0.3)
            for k, f in enumerate(ch): add(pluck(f * 2, 0.12), at + beat / 2, 0.12)
        else:
            add(bass(root / 2, beat * 0.45), at, 0.35); add(bass(root / 2, beat * 0.4), at + beat / 2, 0.25)
            for k, f in enumerate(ch):
                if (b + k) % 2 == 0: add(pluck(f * 2), at + k * beat / 3, 0.18)
    elif MOOD == "cute":
        add(kick(soft=True), at, 0.6); add(hat(), at + beat / 2, 0.18)
        if b % 2: add(clap(), at, 0.2)
        add(bass(root / 2, beat * 0.3, square=False), at, 0.35)
        for k, f in enumerate(ch): add(bell(f * 4 if k != 1 else f * 2, 0.6), at + k * beat / 3, 0.07)
    elif MOOD in ("calm", "lofi"):
        if b % 4 == 0: add(pad([f / (2 if MOOD == "lofi" else 1) for f in ch], beat * 4), at, 0.35)
        if b % 2 == 0: add(kick(soft=True), at, 0.45)
        add(hat(), at + beat / 2, 0.08 if MOOD == "lofi" else 0.12)
        add(bass(root / 2, beat * 0.8, square=False), at, 0.25)
        if MOOD == "calm" and b % 2: add(pluck(ch[b % 3] * 2, 0.4, 0.5), at + beat / 2, 0.1)
    elif MOOD == "tension":
        add(kick(), at, 0.8 if b % 2 == 0 else 0.4); add(hat(), at + beat / 4, 0.1); add(hat(), at + 3 * beat / 4, 0.1)
        for k in range(4): add(bass(root / 2, beat / 4 * 0.8), at + k * beat / 4, 0.28)
        if b % 4 == 0: add(pad([f / 2 for f in ch], beat * 4), at, 0.25)
if MOOD == "lofi":  # vinyl crackle + dull top
    mix = lp(mix, 3500) + (rng.random(n) < 0.0006) * rng.standard_normal(n) * 0.15
fade = np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 1.5, 0, 1)
mix = mix * fade; mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.6
wavfile.write(PUB / "beat.wav", SR, (np.stack([mix, mix], -1) * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", PUB / "beat.wav", "-c:a", "aac", "-b:a", "160k", PUB / "beat.m4a"], check=True)
(PUB / "beat.wav").unlink()


def w(name, s): wavfile.write(PUB / "sfx" / f"{name}.wav", SR, (s / (np.max(np.abs(s)) + 1e-9) * 0.7 * 32767).astype(np.int16))
tt = ar(0.45); w("whoosh", bp(rng.standard_normal(len(tt)), 400, 3000) * np.sin(np.pi * tt / tt[-1]) ** 2)
tt = ar(0.3); w("swish", bp(rng.standard_normal(len(tt)), 1500, 6000) * np.sin(np.pi * tt / tt[-1]) ** 3)
tt = ar(0.12); w("pop", np.sin(2*np.pi*(300 + 900*tt/tt[-1])*tt) * np.exp(-tt*35))
tt = ar(0.9); w("ding", (np.sin(2*np.pi*1568*tt) + 0.6*np.sin(2*np.pi*2093*tt) + 0.3*np.sin(2*np.pi*3136*tt)) * np.exp(-tt*5))
tt = ar(0.35); w("impact", (np.sin(2*np.pi*np.cumsum(40+120*np.exp(-tt*25))/SR) + 0.3*lp(rng.standard_normal(len(tt)), 2000)) * np.exp(-tt*10))
tt = ar(0.5); w("boing", np.sin(2*np.pi*np.cumsum(180 + 120*np.sin(2*np.pi*14*tt)*np.exp(-tt*4))/SR) * np.exp(-tt*5))
tt = ar(0.35); w("scratch", bp(rng.standard_normal(len(tt)), 300, 2500) * np.abs(np.sin(2*np.pi*9*tt)) * np.exp(-tt*3))
tt = ar(0.5); w("sparkle", sum(np.sin(2*np.pi*f*tt)*np.exp(-np.maximum(0, tt-k*0.06)*14)*(tt >= k*0.06) for k, f in enumerate([2093, 2637, 3136, 4186])))
tt = ar(0.08); w("tick", np.sin(2*np.pi*2400*tt) * np.exp(-tt*80))
tt = ar(1.0); w("riser", bp(rng.standard_normal(len(tt)), 500, 5000) * (tt / tt[-1]) ** 2)
tt = ar(0.8); w("boom", np.sin(2*np.pi*np.cumsum(35+60*np.exp(-tt*8))/SR) * np.exp(-tt*4))
print("assets ok", MOOD, BPM)
