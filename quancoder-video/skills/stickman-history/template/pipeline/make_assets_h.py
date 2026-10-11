"""Assets for the stick-figure history format (16:9): aged paper, SFX, music bed with war drums.

Usage: python pipeline/make_assets_h.py <music_seconds>
Writes public/paper-h.jpg, public/sfx/{swish0-2,drum,hit,clash,crack,hammer}.wav, public/music.m4a
"""
import pathlib, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
(PUB / "sfx").mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(11)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from config import CFG
STY = CFG.get("style", {})

# ---------- aged parchment 1920x1080 ----------
W, H = 1920, 1080
def noise(scale, blur):
    small = rng.random((max(2, H // scale), max(2, W // scale)))
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    if blur: img = img.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(img, dtype=np.float32) / 255

base = 0.5 * noise(240, 20) + 0.3 * noise(60, 6) + 0.2 * noise(12, 1)
fib = noise(1, 0.7)
stains = np.clip((noise(300, 40) - 0.62) * 4, 0, 1)
yy, xx = np.mgrid[0:H, 0:W]
d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
vign = np.clip((d - 0.55) / 0.9, 0, 1) ** 1.6
lum = 0.9 + 0.07 * (base - 0.5) + 0.03 * (fib - 0.5) - STY.get("stains", 0.045) * stains - STY.get("vignette", 0.22) * vign
tone = STY.get("paperTone", [1.0, 0.94, 0.82])
paper = np.stack([lum * tone[0], lum * tone[1], lum * tone[2]], -1)
Image.fromarray(np.clip(paper * 255, 0, 255).astype(np.uint8)).save(PUB / "paper-h.jpg", quality=90)

SR = 48000
def w(name, sig, sr=SR):
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * 0.8
    wavfile.write(PUB / "sfx" / f"{name}.wav", sr, (sig * 32767).astype(np.int16))

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

# swish (brush / page turn)
for k in range(3):
    n = int(0.55 * SR); t = np.arange(n) / SR
    nz = np.random.default_rng(k).standard_normal(n)
    sig = sosfilt(butter(2, [700 + 300 * k, 5000], "band", fs=SR, output="sos"), nz)
    e = np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 2
    w(f"swish{k}", sig * e)

# war drum: 3 hits (boom boom BOOM)
def drum_hit(f0=62, dur=1.2, seed=0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (1 + 0.8 * np.exp(-t * 25))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    slap = sosfilt(butter(2, [150, 1500], "band", fs=SR, output="sos"), np.random.default_rng(seed).standard_normal(n)) * np.exp(-t * 30) * 0.5
    return body + slap
seq = np.zeros(int(2.6 * SR))
for i, (st, g) in enumerate([(0, 0.7), (0.45, 0.7), (0.9, 1.0), (1.35, 0.6)]):
    h = drum_hit(58 + i * 2, seed=i) * g
    i0 = int(st * SR); seq[i0:i0 + len(h)] += h[: len(seq) - i0]
w("drum", seq)

# hit (thud)
w("hit", drum_hit(80, 0.6, 5) * 0.8 + sosfilt(butter(2, 3000, "low", fs=SR, output="sos"), np.random.default_rng(3).standard_normal(int(0.6 * SR))) * env(int(0.6 * SR), 0.002, 0.05))

# clash (metal)
n = int(0.9 * SR); t = np.arange(n) / SR
clash = sum(np.sin(2 * np.pi * f * t + i) * np.exp(-t * (4 + i)) for i, f in enumerate([1830, 2470, 3190, 4210]))
clash += sosfilt(butter(2, [2000, 9000], "band", fs=SR, output="sos"), np.random.default_rng(9).standard_normal(n)) * np.exp(-t * 20)
w("clash", clash)

# crack (wood splintering)
n = int(1.0 * SR); t = np.arange(n) / SR
r = np.random.default_rng(4)
imp = (r.random(n) < np.interp(t, [0, 0.05, 0.6, 1], [0.02, 0.01, 0.003, 0])) * r.standard_normal(n) * 4
crack = sosfilt(butter(2, [300, 4000], "band", fs=SR, output="sos"), imp + r.standard_normal(n) * 0.3 * np.exp(-t * 6)) + drum_hit(45, 1.0, 7) * 0.6
w("crack", crack)

# hammer (4 knocks)
hm = np.zeros(int(3.0 * SR))
for i in range(4):
    h = drum_hit(140, 0.3, 10 + i) * 0.8
    i0 = int(i * 0.75 * SR); hm[i0:i0 + len(h)] += h
w("hammer", hm)

# ---------- music: slow pentatonic pad + low drum pulse ----------
SRm = 44100
dur = float(sys.argv[1]) if len(sys.argv) > 1 else 300.0
t = np.arange(int(dur * SRm)) / SRm
music = np.zeros_like(t)
chords = [[110.0, 164.81, 220.0, 261.63], [98.0, 146.83, 196.0, 246.94], [87.31, 130.81, 174.61, 220.0], [98.0, 146.83, 196.0, 293.66]]
seg = 10.0
for ci in range(int(dur // seg) + 1):
    ch = chords[ci % len(chords)]
    t0 = ci * seg
    m = (t >= t0 - 3) & (t < t0 + seg + 3)
    tt = t[m] - (t0 - 3)
    e = np.clip(tt / 3, 0, 1) * np.clip((seg + 6 - tt) / 3, 0, 1)
    for j, f in enumerate(ch):
        tone = np.sin(2 * np.pi * f * (1 + 0.002 * (j - 1.5)) * t[m] + j) + 0.25 * np.sin(2 * np.pi * f * 2 * t[m])
        music[m] += tone * e * (0.2 if j == 0 else 0.13)
# plucked pentatonic (đàn tranh-like) motifs
notes = [440.0, 493.88, 587.33, 659.25, 739.99, 880.0]
k = 0.0
while k < dur - 3:
    f = notes[rng.integers(len(notes))]
    i0 = int(k * SRm); n = int(2.2 * SRm)
    tt = np.arange(n) / SRm
    pl = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt) + 0.15 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 3.0)
    pl *= 1 + 0.004 * np.sin(2 * np.pi * 5 * tt)  # slight vibrato-ish
    music[i0:i0 + n] += pl[: len(music) - i0] * 0.06
    k += rng.choice([0.8, 1.2, 1.6, 2.4])
# soft low drum pulse every 2 s
for s in np.arange(0, dur - 2, 2.0):
    n = int(0.8 * SRm); tt = np.arange(n) / SRm
    h = np.sin(2 * np.pi * 55 * (1 + 0.6 * np.exp(-tt * 20)) * tt) * np.exp(-tt * 5) * 0.18
    i0 = int(s * SRm); music[i0:i0 + n] += h
music = sosfilt(butter(2, 3200, "low", fs=SRm, output="sos"), music)
rev = music.copy()
for dly, g_ in [(0.113, 0.35), (0.271, 0.3), (0.419, 0.25), (0.687, 0.2)]:
    kk = int(dly * SRm); rev[kk:] += music[:-kk] * g_
music = rev / np.max(np.abs(rev)) * 0.5
music *= np.clip(t / 4, 0, 1) * np.clip((dur - t) / 6, 0, 1)
wavfile.write(PUB / "music.wav", SRm, (np.stack([music, np.roll(music, 400)], -1) * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", PUB / "music.wav", "-c:a", "aac", "-b:a", "160k", PUB / "music.m4a"], check=True)
(PUB / "music.wav").unlink()
print("assets ok")
