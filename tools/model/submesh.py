#!/usr/bin/env python3
"""Give every submesh its own texture, the way the game draws it.

An exported OBJ holds several submeshes (groups "<mesh>_0", "_1", ...), and in the game each is drawn with its
own material. The export has no material files, and the game's material list (dye_config_data) does not say
which texture each material uses, so the texture is found from the geometry: each submesh's UVs are dropped
onto every colour texture of the creature, and the texture whose painted area (alpha) they land on wins.
Submeshes that fit no texture are the game's effect layers (clear eye lenses, glow shells) and are hidden.
Parts for another state of the creature (Rampage, Angry, ...) are dropped: the game shows the default set.

    python3 tools/model/submesh.py tools/model/picks.json    # rewrites parts as [obj, [texture or null per submesh]]
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from candidates import OUT, textures  # noqa: E402

STATE = re.compile(r"_(Rampage|Angry|Battle|Sleep|Evo|Attack)", re.I)
SAMPLES = 400
_img = {}


def alpha(path):
    """256x256 alpha of a colour texture (None when it has no real alpha: opaque everywhere)."""
    if path not in _img:
        im = Image.open(OUT / path)
        a = im.convert("RGBA").getchannel("A").resize((256, 256))
        _img[path] = a if a.getextrema()[0] < 200 else None
    return _img[path]


def groups(obj):
    """Per non-empty group, in file order: UV centroids of its faces and its position bounds."""
    v, vt, out, cur = [], [], [], None
    for line in open(OUT / obj):
        if line.startswith("v "):
            v.append(tuple(map(float, line.split()[1:4])))
        elif line.startswith("vt "):
            vt.append(tuple(map(float, line.split()[1:3])))
        elif line.startswith("g "):
            cur = {"uv": [], "lo": [1e9] * 3, "hi": [-1e9] * 3}
            out.append(cur)
        elif line.startswith("f ") and cur is not None:
            ks = [x.split("/") for x in line.split()[1:]]
            uv = [int(k[1]) - 1 for k in ks if len(k) > 1 and k[1]]
            if uv:
                cur["uv"].append((sum(vt[i][0] for i in uv) / len(uv), sum(vt[i][1] for i in uv) / len(uv)))
            for k in ks:
                p = v[int(k[0]) - 1]
                cur["lo"] = [min(a, b) for a, b in zip(cur["lo"], p)]
                cur["hi"] = [max(a, b) for a, b in zip(cur["hi"], p)]
    return [g for g in out if g["uv"]]


def shell_of(g, earlier):
    """A near-copy of an earlier submesh (same bounds, about the same size): a layer of the game's fur shader."""
    size = max(h - l for l, h in zip(g["lo"], g["hi"])) or 1
    for e in earlier:
        same = all(abs(a - b) < size * 0.04 for a, b in zip(g["lo"] + g["hi"], e["lo"] + e["hi"]))
        if same and abs(len(g["uv"]) - len(e["uv"])) < 0.15 * len(e["uv"]):
            return True
    return False


def fit(uvs, tex):
    """Share of the submesh's UVs that land on painted texels (1.0 for opaque textures)."""
    a = alpha(tex)
    if a is None:
        return 1.0
    step = max(1, len(uvs) // SAMPLES)
    pts = uvs[::step]
    px = a.load()
    hit = sum(1 for u, v in pts if px[int((u % 1) * 255.999), int((1 - v % 1) * 255.999)] > 100)
    return hit / len(pts)


def colour_textures(mid, tex):
    # this creature's own colour maps only; "_01a_01"-style greyscale companions are not colour
    return {k: v for k, v in tex.get(mid, {}).items()
            if k.startswith(f"t_parmon_{mid}_") and not re.search(r"_\d\d[a-z]_\d\d_", k)}


def main():
    picks_file = Path(sys.argv[1])
    picks = json.loads(picks_file.read_text())
    tex = textures()
    stats = {"submeshes": 0, "hidden": 0, "changed": 0, "state parts dropped": 0}
    for key, p in picks.items():
        if not p.get("parts"):
            continue
        mid = p["mid"]
        pool = colour_textures(mid, tex) or colour_textures(mid[:5], tex)
        parts = []
        for obj, t in p["parts"]:
            name = Path(obj).name
            if STATE.search(name):
                stats["state parts dropped"] += 1
                continue
            first = t if isinstance(t, str) else next((x for x in t if x), None)
            eye = "_eye" in name.lower()
            part = re.sub(r"(_LOD\d)?_-?\d+\.obj$", "", name).split(f"_{mid[:5]}_", 1)[-1].lower()
            base_part = re.sub(r"\d+$", "", part)
            # other materials of the same part only (Body_02a, Body01_01a...): "b"/"c" variants are other colourings
            same = [v for k, v in pool.items()
                    if re.fullmatch(rf"t_parmon_{mid}_(?:{re.escape(part)}|{re.escape(base_part)})_\d\da_(?:ca|c)\.png", k)]
            cands = [first] + [c for c in same if c != first] if first else same
            chosen, seen = [], []
            for i, g in enumerate(groups(obj)):
                stats["submeshes"] += 1
                pick = first
                f0 = fit(g["uv"], first) if first else 0
                if f0 < 0.5:  # the default texture does not cover this submesh: try the part's other materials
                    best = max(((fit(g["uv"], c), c) for c in cands[1:]), default=(0, None))
                    if best[0] >= 0.8:
                        pick = best[1]
                    elif f0 < 0.25:
                        pick = None  # fits nothing: an effect layer drawn by the game's shader
                # the eye's second material is the clear lens over it: shown only when it has its own texture
                lens = eye and i > 0 and not any(re.search(rf"_eye\d*_0{i + 1}a_", Path(c).name.lower()) for c in cands)
                if not pick or lens or shell_of(g, seen):
                    chosen.append(None)
                    stats["hidden"] += 1
                else:
                    chosen.append(pick)
                    stats["changed"] += pick != first
                seen.append(g)
            if any(chosen):
                parts.append([obj, chosen])
        p["parts"] = parts
    picks_file.write_text(json.dumps(picks, indent=1))
    print(stats)


if __name__ == "__main__":
    main()
