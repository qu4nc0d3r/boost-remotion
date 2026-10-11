"""Per-scene narration with VieNeu-TTS + style post-processing (tempo / pitch).

Usage: python pipeline/tts.py            (voice, voiceRef, voiceStyle from script.json)
Writes public/audio/<id>.wav (48 kHz mono) and pipeline/durations.json. Resumable: delete a
scene's wav + its key in durations.json to redo it.
"""
import json, sys, time, pathlib, subprocess, shutil, os, tempfile
import numpy as np
import soundfile as sf
from vieneu import Vieneu

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from styles import resolve

OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
VOICE = script.get("voice", "Thiện Minh")
skey, ST = resolve(script.get("voiceStyle"))
print(f"style: {skey} {ST}")


def materialize_hf_symlinks():
    """onnxruntime >= 1.23 rejects ONNX external data behind HF cache symlinks → copy blobs over links."""
    hub = pathlib.Path(os.environ.get("HF_HOME", pathlib.Path.home() / ".cache" / "huggingface")) / "hub"
    for link in hub.glob("models--*/snapshots/**/*"):
        if link.is_symlink():
            target = link.resolve(); link.unlink(); shutil.copy2(target, link)


tts = None
for attempt in range(4):
    try:
        tts = Vieneu(); break
    except Exception as e:
        print(f"load attempt {attempt + 1} failed, fixing HF symlinks:", str(e)[:160]); materialize_hf_symlinks()
if tts is None:
    sys.exit("VieNeu failed to load")

ref = script.get("voiceRef")
if ref:
    rp = ROOT / ref
    if not rp.exists():
        sys.exit(f"voiceRef not found: {rp}")
    tts.add_voice(VOICE, str(rp)); print(f"cloned voice '{VOICE}' from {ref}")
else:
    names = [v[1] for v in tts.list_preset_voices()]
    if tts.resolve_voice_name(VOICE) is None:
        sys.exit(f"Voice '{VOICE}' not found. Presets: {names}")


def style_fx(audio: np.ndarray, sr: int) -> np.ndarray:
    """Tempo + pitch with ffmpeg rubberband (formant-preserving); falls back to atempo/asetrate."""
    tempo, semis = ST["tempo"], ST["semitones"]
    if abs(tempo - 1) < 1e-3 and abs(semis) < 1e-3:
        return audio
    with tempfile.TemporaryDirectory() as d:
        a, b = pathlib.Path(d, "a.wav"), pathlib.Path(d, "b.wav")
        sf.write(a, audio, sr)
        pitch = 2 ** (semis / 12)
        filt = f"rubberband=tempo={tempo}:pitch={pitch}:formant=preserved"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", filt, b], capture_output=True)
        if r.returncode != 0:  # no librubberband: asetrate shifts pitch+speed, atempo corrects speed
            filt = f"asetrate={int(sr * pitch)},aresample={sr},atempo={tempo / pitch:.4f}"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", filt, b], check=True)
        out, _ = sf.read(b, dtype="float32")
        return out


dur_file = ROOT / "pipeline" / "durations.json"
durations = json.loads(dur_file.read_text()) if dur_file.exists() else {}
SR = 48000
for sc in script["scenes"]:
    wav = OUT / f"{sc['id']}.wav"
    if wav.exists() and sc["id"] in durations:
        continue
    t0 = time.time()
    audio = np.asarray(tts.infer(sc["text"], voice=VOICE, temperature=ST["temp"]), dtype=np.float32)
    src_sr = getattr(tts, "sample_rate", None) or 48000
    if src_sr != SR:  # resample through ffmpeg to 48 kHz
        with tempfile.TemporaryDirectory() as d:
            a, b = pathlib.Path(d, "a.wav"), pathlib.Path(d, "b.wav")
            sf.write(a, audio, src_sr)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-ar", str(SR), b], check=True)
            audio, _ = sf.read(b, dtype="float32")
    thr = 0.01 * np.max(np.abs(audio))
    idx = np.where(np.abs(audio) > thr)[0]
    if len(idx):
        audio = audio[max(0, idx[0] - 1200): idx[-1] + 2400]
    audio = style_fx(audio, SR)
    audio = audio / (np.max(np.abs(audio)) + 1e-9) * 0.89
    audio = np.concatenate([np.zeros(int(0.12 * SR)), audio, np.zeros(int(0.25 * SR))]).astype(np.float32)
    sf.write(wav, audio, SR)
    durations[sc["id"]] = len(audio) / SR
    dur_file.write_text(json.dumps(durations, indent=1))
    words = len(sc["text"].split())
    print(f"{sc['id']}: {durations[sc['id']]:.2f}s, {words / max(0.1, durations[sc['id']] - 0.37):.2f} words/s ({time.time()-t0:.0f}s)", flush=True)

print("TOTAL", round(sum(durations[s['id']] for s in script['scenes']), 2))
