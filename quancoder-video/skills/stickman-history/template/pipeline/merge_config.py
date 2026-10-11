"""merge_config.py <default.json> <out.json> [override.json ...]  – deep-merge overrides onto the default."""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from config import deep_merge
cfg = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
for o in sys.argv[3:]:
    p = pathlib.Path(o)
    if p.exists() and p.stat().st_size:
        cfg = deep_merge(cfg, json.loads(p.read_text(encoding="utf-8")))
        print("override:", o)
pathlib.Path(sys.argv[2]).write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
print("config ->", sys.argv[2], "| channel:", cfg["channel"]["name"])
