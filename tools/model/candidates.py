#!/usr/bin/env python3
"""List possible part sets (mesh + texture per part) for every Aniimo on the site.

The exported meshes come in many copies (LODs, prefab variants, Sparkling/Shiny, voxel stand-ins),
grouped by the number at the end of the file name. Each group that has a body is one candidate,
plus a "best LOD of every part type" candidate. score.html renders them all and picks the one
whose silhouette and colours are closest to the site's art (the art is only a reference for the
match; it never goes into the model).

    python3 tools/model/candidates.py /path/to/out > tools/model/candidates.json
"""
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

OUT = Path(sys.argv[1] if __name__ == "__main__" and len(sys.argv) > 1 else str(Path(__file__).resolve().parents[2] / "aniimo" / "out"))
ROOT = Path(__file__).resolve().parents[2]
MESH = re.compile(r"M_Pa?r?mon_(\d+)_(.+?)(?:_(LOD\d))?_(-?\d+)\.obj$")
SKIP = re.compile(r"shiny|sparkl|demonic|voxel|collider|dark", re.I)  # "Body_Spark" is a lightning mane, not Sparkling
LOD_PREF = {"LOD1": 0, None: 1, "LOD0": 1, "LOD2": 2}  # LOD1 keeps the detail, LOD2 is the far-away mesh


def textures():
    """mesh id -> {texture file name: path}, base colour maps only, non-Sparkling first."""
    out = defaultdict(dict)
    for d in sorted(os.listdir(OUT / "textures2")):
        m = re.search(r"tcpm_(\d+)_", d)
        if not m:
            continue
        for f in os.listdir(OUT / "textures2" / d):
            if re.search(r"_(C|CA)\.png$", f) and not SKIP.search(f):
                p = f"textures2/{d}/{f}"
                old = out[m.group(1)].get(f.lower())  # some files are spelled T_parmon_...
                if not old or os.path.getsize(OUT / p) > os.path.getsize(OUT / old):
                    out[m.group(1)][f.lower()] = p
    return out


def tex_for(part, mid, tex):
    """Body01 -> T_Parmon_<id>_Body01_01a_C(A), then the plain Body texture."""
    base = re.sub(r"\d+$", "", part)
    for name in (part, base, "Body"):
        for v in ("01a", "01b", "01c", ""):
            for s in ("CA", "C"):
                f = f"t_parmon_{mid}_{name}_{v + '_' if v else ''}{s}.png".lower()
                if f in tex:
                    return tex[f]
    return None


def main():
    raw = json.loads((ROOT / "tools" / "raw.json").read_text())
    tex_all = textures()
    meshes = defaultdict(list)
    for d in os.listdir(OUT / "models"):
        if "parm" not in d.lower():
            continue
        for f in os.listdir(OUT / "models" / d):
            m = MESH.match(f)
            if m and not SKIP.search(m.group(2)):
                meshes[m.group(1)].append(dict(path=f"models/{d}/{f}", part=m.group(2), lod=m.group(3), group=m.group(4)))
    out = {}
    for a in raw["aniimo"]:
        if a["unreleased"] or not a["head"]:
            continue
        mid = re.search(r"(\d+)", a["head"]).group(1)
        tex = tex_all.get(mid, {})
        if not meshes.get(mid) or not tex:
            continue
        groups = defaultdict(dict)
        for m in meshes[mid]:
            g = groups[m["group"]]
            if m["part"] not in g or LOD_PREF[m["lod"]] < LOD_PREF[g[m["part"]]["lod"]]:
                g[m["part"]] = m
        best = {}
        for m in meshes[mid]:
            if m["part"] not in best or LOD_PREF[m["lod"]] < LOD_PREF[best[m["part"]]["lod"]]:
                best[m["part"]] = m
        has_eye = any(m["part"].startswith("Eye") for m in meshes[mid])
        cands, seen = [], set()
        for name, g in list(groups.items()) + [("best", best)]:
            if not any(p.startswith("Body") for p in g) or (has_eye and not any(p.startswith("Eye") for p in g)):
                continue  # a set without eyes scores well on shape alone, so it must have them when they exist
            parts = sorted((m["path"], tex_for(m["part"], mid, tex)) for m in g.values())
            parts = [[p, t] for p, t in parts if t]
            if not any("_Body" in p for p, _ in parts):
                continue
            key = tuple(p for p, _ in parts)
            if parts and key not in seen:
                seen.add(key)
                cands.append(dict(name=name, parts=parts))
        # the top-detail meshes without an LOD tag carry the game's stacked fur shells, which look messy without
        # its fur shader: when an all-LOD1 set exists, keep only sets whose meshes all have an LOD tag
        if any(all("_LOD1_" in p for p, _ in c["parts"]) for c in cands):
            cands = [c for c in cands if all(re.search(r"_LOD\d_", p) for p, _ in c["parts"])]
        if cands:
            # reference to score against: a full-body render of the in-game model when we have one (compared only,
            # never copied), else the in-game painting
            ref = ROOT / "tools" / "cache" / "img" / "full1024" / f"{a['slug']}.webp"
            out[a["slug"]] = dict(mid=mid, art=f"ref/{a['slug']}.webp" if ref.exists() else f"img/{a['slug']}.webp", cands=cands)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
