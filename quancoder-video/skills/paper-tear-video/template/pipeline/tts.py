"""Generate per-scene narration with VieNeu-TTS (v3 Turbo, CPU/ONNX).

Usage: python pipeline/tts.py [voice]   (default: script.json "voice", else Thiện Minh)
Writes public/audio/<id>.wav (48 kHz) and pipeline/durations.json
"""
import json, sys, time, pathlib
import numpy as np
import soundfile as sf
from vieneu import Vieneu

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
VOICE = sys.argv[1] if len(sys.argv) > 1 else script.get("voice", "Thiện Minh")


def materialize_hf_symlinks():
    """onnxruntime >=1.23 rejects ONNX external data reached through HF cache symlinks
    ("External data path validation failed ... escapes model directory").
    Replace symlinks in every snapshot with real file copies."""
    import os, shutil
    hub = pathlib.Path(os.environ.get("HF_HOME", pathlib.Path.home() / ".cache" / "huggingface")) / "hub"
    for link in hub.glob("models--*/snapshots/**/*"):
        if link.is_symlink():
            target = link.resolve()
            link.unlink()
            shutil.copy2(target, link)


tts = None
for attempt in range(4):  # each model repo downloads on first touch, so fix + retry a few times
    try:
        tts = Vieneu()
        break
    except Exception as e:
        print(f"load attempt {attempt + 1} failed, fixing HF symlinks:", str(e)[:160])
        materialize_hf_symlinks()
if tts is None:
    sys.exit("VieNeu failed to load — see references/troubleshooting.md")
print("voices:", [v[0] for v in tts.list_preset_voices()])

# Cloned voice: script.json "voiceRef" = 3–8 s clean clip of the speaker (path relative to project root).
ref = script.get("voiceRef")
if ref:
    ref_path = (ROOT / ref)
    if not ref_path.exists():
        sys.exit(f"voiceRef not found: {ref_path}")
    tts.add_voice(VOICE, str(ref_path))  # denoises + extracts speaker profile (a few seconds)
    print(f"cloned voice '{VOICE}' from {ref}")

durations = {}
dur_file = ROOT / "pipeline" / "durations.json"
if dur_file.exists():
    durations = json.loads(dur_file.read_text())

SR = 48000
for sc in script["scenes"]:
    wav = OUT / f"{sc['id']}.wav"
    if wav.exists() and sc["id"] in durations:
        continue
    t0 = time.time()
    audio = np.asarray(tts.infer(sc["text"], voice=VOICE), dtype=np.float32)
    # trim leading/trailing near-silence, then pad 0.15 s head / 0.35 s tail
    thr = 0.01 * np.max(np.abs(audio))
    idx = np.where(np.abs(audio) > thr)[0]
    if len(idx):
        audio = audio[max(0, idx[0] - 1200): idx[-1] + 2400]
    audio = audio / (np.max(np.abs(audio)) + 1e-9) * 0.89
    audio = np.concatenate([np.zeros(int(0.15 * SR)), audio, np.zeros(int(0.35 * SR))]).astype(np.float32)
    sf.write(wav, audio, SR)
    durations[sc["id"]] = len(audio) / SR
    dur_file.write_text(json.dumps(durations, indent=1))
    print(f"{sc['id']}: {durations[sc['id']]:.1f}s audio in {time.time()-t0:.0f}s", flush=True)

print("TOTAL", sum(durations.values()))
