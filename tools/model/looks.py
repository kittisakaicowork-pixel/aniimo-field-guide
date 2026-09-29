#!/usr/bin/env python3
"""Finish 3d/variants.json after variants.mjs: forms with their own GLB (formmesh.py) get a 3D look that loads
3d/f<formId>.glb, forms in exclude.json lose theirs, and each model gets its idle period.

    python3 tools/model/looks.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
man_file = ROOT / "3d" / "variants.json"
man = json.loads(man_file.read_text())
picks = json.loads((HERE / "picks.json").read_text())
idle = json.loads((HERE / "idle.json").read_text())
ex = json.loads((HERE / "exclude.json").read_text())
exclude = {k for k in ex if not k.startswith("_")}
for s in ex.get("_creatures", []):
    man["models"].pop(s, None)
for key, p in picks.items():
    if "form_of" in p and (ROOT / "3d" / f"{key}.glb").exists() and p["mid"] not in exclude:
        m = man["models"].setdefault(p["form_of"], {"mats": [], "looks": {}})
        m["looks"][p["mid"]] = "n"
        if p["mid"] not in m.setdefault("fg", []):
            m["fg"].append(p["mid"])
for s, m in man["models"].items():
    for fid in list(m["looks"]):
        if fid in exclude:
            del m["looks"][fid]
    if s in picks and picks[s]["mid"] in idle:
        m["p"] = idle[picks[s]["mid"]]
man_file.write_text(json.dumps(man))
print(sum(len(m["looks"]) for m in man["models"].values()), "form looks,", sum(len(m.get("fg", [])) for m in man["models"].values()), "with their own mesh")
