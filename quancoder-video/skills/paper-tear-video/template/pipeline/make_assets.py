"""Procedural assets: paper texture, grain, paper-rip SFX, soft ambient music bed.

Usage: python pipeline/make_assets.py [music_seconds]
"""
import pathlib, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
(PUB / "sfx").mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)

# ---------- paper texture (cream fibrous paper, tileable-ish 1080x1920) ----------
W, H = 1080, 1920
def fbm(w, h, octaves=6):
    out = np.zeros((h, w))
    amp = 1.0
    for o in range(octaves):
        s = 2 ** o * 4
        small = rng.random((max(2, h // (h // s if h // s else 1) ), s)) if False else rng.random((s * h // w + 2, s + 2))
        img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += np.asarray(img, dtype=np.float32) / 255 * amp
        amp *= 0.55
    return (out - out.min()) / (out.max() - out.min())

base = fbm(W, H)
fibers = np.asarray(Image.fromarray((rng.random((H, W)) * 255).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32) / 255
streak = np.asarray(Image.fromarray((rng.random((H // 6, W)) * 255).astype(np.uint8))
                    .resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
lum = 0.86 + 0.08 * base + 0.05 * (fibers - 0.5) + 0.03 * (streak - 0.5)
paper = np.stack([lum * 1.0, lum * 0.965, lum * 0.9], -1)  # warm cream
Image.fromarray(np.clip(paper * 255, 0, 255).astype(np.uint8)).save(PUB / "paper.jpg", quality=92)

# white paper (for captions/cutout borders)
lum2 = 0.95 + 0.04 * base + 0.03 * (fibers - 0.5)
paper2 = np.stack([lum2, lum2 * 0.99, lum2 * 0.965], -1)
Image.fromarray(np.clip(paper2 * 255, 0, 255).astype(np.uint8)).save(PUB / "paper-white.jpg", quality=92)

# grain overlay (grey noise, used with multiply/overlay at low opacity)
g = np.asarray(Image.fromarray((rng.random((H // 2, W // 2)) * 255).astype(np.uint8)).resize((W, H), Image.NEAREST), dtype=np.float32)
g = 128 + (g - 128) * 0.5 + (base - 0.5) * 60
Image.fromarray(np.clip(g, 0, 255).astype(np.uint8), "L").save(PUB / "grain.png")

# ---------- paper rip SFX ----------
SR = 48000
def rip(dur=0.75, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = r.standard_normal(n)
    # crackle: sparse impulses with varying density along the rip
    dens = np.interp(t, [0, 0.08, dur * 0.7, dur], [0.05, 0.5, 0.35, 0.0])
    imp = (r.random(n) < dens * 0.08) * r.standard_normal(n) * 3
    sig = sosfilt(butter(4, [900, 7500], "band", fs=SR, output="sos"), noise * 0.5 + imp)
    body = sosfilt(butter(2, [180, 900], "band", fs=SR, output="sos"), noise) * 0.35
    env = np.interp(t, [0, 0.03, dur * 0.6, dur], [0, 1, 0.7, 0]) * (0.8 + 0.2 * np.sin(t * 60))
    out = (sig + body) * env
    return out / np.max(np.abs(out)) * 0.55

for k in range(4):
    s = rip(0.6 + 0.08 * k, seed=k)
    wavfile.write(PUB / "sfx" / f"rip{k}.wav", SR, (s * 32767).astype(np.int16))

# ---------- ambient music bed (slow evolving pad, pentatonic, ~7 min) ----------
SRm = 44100
dur = float(sys.argv[1]) if len(sys.argv) > 1 else 480.0  # seconds; pass video length + 10
t = np.arange(int(dur * SRm)) / SRm
music = np.zeros_like(t)
# chord cycle (Hz): D minor pentatonic flavoured pads
chords = [[146.83, 220.0, 293.66, 349.23], [130.81, 196.0, 261.63, 329.63],
          [116.54, 174.61, 233.08, 293.66], [110.0, 164.81, 220.0, 261.63]]
seg = 12.0
for ci in range(int(dur // seg) + 1):
    ch = chords[ci % len(chords)]
    t0 = ci * seg
    m = (t >= t0 - 3) & (t < t0 + seg + 3)
    tt = t[m] - (t0 - 3)
    env = np.clip(tt / 3, 0, 1) * np.clip((seg + 6 - tt) / 3, 0, 1)
    for j, f in enumerate(ch):
        det = 1 + 0.002 * (j - 1.5)
        tone = np.sin(2 * np.pi * f * det * t[m] + j) + 0.3 * np.sin(2 * np.pi * f * 2 * t[m] + 0.5 * j)
        music[m] += tone * env * (0.16 if j else 0.22)
# soft high shimmer (pentatonic plucks, sparse)
notes = [587.33, 659.25, 880.0, 987.77, 1174.66]
for k in range(int(dur / 2.7)):
    st = k * 2.7 + rng.random() * 0.8
    f = notes[rng.integers(len(notes))]
    i0 = int(st * SRm); n = int(2.5 * SRm)
    if i0 + n >= len(t): break
    tt = np.arange(n) / SRm
    music[i0:i0 + n] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.2) * 0.07
music = sosfilt(butter(2, 2500, "low", fs=SRm, output="sos"), music)
# cheap reverb: multi-tap feedback delays
rev = music.copy()
for d, g_ in [(0.113, 0.35), (0.271, 0.3), (0.419, 0.25), (0.687, 0.2)]:
    k = int(d * SRm)
    rev[k:] += music[:-k] * g_
music = rev / np.max(np.abs(rev)) * 0.5
fade = np.clip(t / 4, 0, 1) * np.clip((dur - t) / 6, 0, 1)
music *= fade
wavfile.write(PUB / "music.wav", SRm, (np.stack([music, np.roll(music, 400)], -1) * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", PUB / "music.wav", "-c:a", "aac", "-b:a", "160k", PUB / "music.m4a"], check=True)
(PUB / "music.wav").unlink()
print("assets ok")
