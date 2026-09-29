#!/usr/bin/env python3
"""Forms that have their own meshes in the export (e.g. Nimbi's rain form) get their own GLB: add them to
picks.json as "f<formId>" (best LOD1 of every part, with the form's textures). obj2glb.mjs then builds
3d/f<formId>.glb and the viewer loads it instead of re-texturing the base model.

    python3 tools/model/formmesh.py tools/model/picks.json
"""
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from candidates import MESH, SKIP, LOD_PREF, OUT, textures, tex_for  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def main():
    picks_file = Path(sys.argv[1])
    picks = json.loads(picks_file.read_text())
    raw = json.loads((ROOT / "tools" / "raw.json").read_text())
    tex = textures()
    meshes = {}
    for d in os.listdir(OUT / "models"):
        if "parm" not in d.lower():
            continue
        for f in os.listdir(OUT / "models" / d):
            m = MESH.match(f)
            if m and len(m.group(1)) == 7 and not SKIP.search(m.group(2)):
                meshes.setdefault(m.group(1), []).append(dict(path=f"models/{d}/{f}", part=m.group(2), lod=m.group(3)))
    added = []
    for a in raw["aniimo"]:
        if a["unreleased"] or a["slug"] not in picks:
            continue
        for f in a["forms"]:
            ms = meshes.get(f["id"])
            if not ms:
                continue
            best = {}
            for m in ms:
                if m["part"] not in best or LOD_PREF[m["lod"]] < LOD_PREF[best[m["part"]]["lod"]]:
                    best[m["part"]] = m
            t = tex.get(f["id"], {}) | {k: v for k, v in tex.get(picks[a["slug"]]["mid"], {}).items() if k not in tex.get(f["id"], {})}
            parts = [[m["path"], tex_for(p, f["id"], t) or tex_for(p, picks[a["slug"]]["mid"], t)] for p, m in sorted(best.items())]
            parts = [p for p in parts if p[1]]
            if any("_Body" in p[0] for p in parts):
                picks["f" + f["id"]] = dict(mid=f["id"], parts=parts, form_of=a["slug"])
                added.append(f["id"])
    picks_file.write_text(json.dumps(picks, indent=1))
    print("form meshes:", added)


if __name__ == "__main__":
    main()
