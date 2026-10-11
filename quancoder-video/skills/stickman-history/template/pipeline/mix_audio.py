"""Mix the soundtrack with ffmpeg from src/data.json, mirroring the <Audio> sequences in src/Video.tsx.

render.sh uses it when render.everyNthFrame > 1: Remotion only collects audio on the frames it renders,
so the video is rendered muted and this file supplies the sound. Keep it in sync with MainVideo's audio.
Usage: python3 pipeline/mix_audio.py out/audio.wav
"""
import functools, json, math, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((ROOT / "src" / "data.json").read_text(encoding="utf-8"))
FPS, T = D["fps"], D["tear"]


def clips():
    """(file in public/, start frame, max frames, volume) for every <Audio> in MainVideo."""
    out, cursor = [], 0
    for i, s in enumerate(D["scenes"]):
        start = 0 if i == 0 else cursor - T
        out.append((s["audio"], start + s["lead"], s["audioFrames"] + 5, 1))
        if i > 0:
            out.append((f"sfx/swish{i % 3}.wav", start, 30, D.get("swishVolume", 0.35)))
        for t, name, *vol in s.get("sfx", []):
            v = vol[0] if vol and vol[0] is not None else 0.5
            at = start + s["lead"] + math.floor(t * s["audioFrames"] + 0.5)  # JS Math.round
            out.append((f"sfx/{name}.wav", at, s["duration"], v * D.get("sfxVolume", 1)))
        cursor = start + s["duration"]
    out.append(("music.m4a", 0, D["total"], D.get("musicVolume", 0.12)))
    return out


@functools.cache
def channels(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return int(r.stdout)


def main(dst):
    cs = clips()
    args, chains = ["ffmpeg", "-v", "error", "-y"], []
    for k, (f, start, frames, vol) in enumerate(cs):
        path = str(ROOT / "public" / f)
        args += ["-i", path]
        smp = round(start * 48000 / FPS)  # in samples: rounding to whole ms would shift clips by up to 0.5 ms
        # Remotion copies mono to both channels at full level; ffmpeg's own mono->stereo upmix is 3 dB quieter
        dup = "pan=stereo|c0=c0|c1=c0," if channels(path) == 1 else ""
        chains.append(f"[{k}:a]{dup}aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:{frames / FPS:.4f},"
                      f"adelay={smp}S|{smp}S,volume={vol}[a{k}]")
    # plain sum like Remotion (no amix normalisation); float wav so peaks survive until render.sh's alimiter
    mix = "".join(f"[a{k}]" for k in range(len(cs))) + f"amix=inputs={len(cs)}:normalize=0:dropout_transition=0,atrim=0:{D['total'] / FPS:.4f}[out]"
    args += ["-filter_complex", ";".join(chains + [mix]), "-map", "[out]", "-c:a", "pcm_f32le", dst]
    subprocess.run(args, check=True)
    print("audio", dst, len(cs), "clips")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/audio.wav")
