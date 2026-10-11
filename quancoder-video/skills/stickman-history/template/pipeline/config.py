"""Config loader for the stickman-history project.

The project's config.json (written by init_project.sh from the skill default + optional override)
is the single source of truth. {channel} {tiktok} {youtube} {fanpage} placeholders are filled everywhere.
Usage in scripts: from config import CFG, fmt
CLI: python pipeline/config.py            -> print resolved config
     python pipeline/config.py get a.b.c  -> print one value
"""
import json, pathlib, sys, copy

ROOT = pathlib.Path(__file__).resolve().parent.parent


def deep_merge(base, over):
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def _fill(obj, ch):
    if isinstance(obj, str):
        for k in ("channel", "tiktok", "youtube", "fanpage"):
            obj = obj.replace("{" + k + "}", ch.get("name" if k == "channel" else k, "") or "")
        return obj
    if isinstance(obj, list):
        return [_fill(x, ch) for x in obj]
    if isinstance(obj, dict):
        return {k: _fill(v, ch) for k, v in obj.items()}
    return obj


def load(path=None):
    p = pathlib.Path(path) if path else ROOT / "config.json"
    raw = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    return _fill(raw, raw.get("channel", {}))


CFG = load()


def fmt(s):
    return _fill(s, CFG.get("channel", {}))


def get(dotted, default=None):
    cur = CFG
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur[part]
    return cur


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "get":
        v = get(sys.argv[2])
        print(v if not isinstance(v, (dict, list)) else json.dumps(v, ensure_ascii=False))
    else:
        print(json.dumps(CFG, ensure_ascii=False, indent=1))
