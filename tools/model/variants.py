#!/usr/bin/env python3
"""Plan texture variants for every picked model: form looks and Sparkling looks.

For each Aniimo in picks.json and each of its non-eye textures (materials), look up in the game export:
  n  the form's own texture (T_Parmon_<formId>_<Part>_01a_CA)          -> forms
  s  Shiny         (T_Parmon_<id>_<Part>_Shiny_01a_CA, ..._01a_Shiny_CA) -> Sparkling Type I-X
  z  WhiteShiny                                                          -> Dazzling Sparkling
  d  DarkShiny                                                           -> Shadow Sparkling
When the game has no such texture, variants.mjs derives it from the plain texture with a colour
transform measured on reference images (tools/cache/img: plain art vs the 12 Sparkling types), so
only numbers are taken from the references. Only forms and Sparkling looks already on the site are
planned, so nothing unannounced is made.

    python3 tools/model/variants.py picks.json > variants.json
"""
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "aniimo" / "out"
ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "tools" / "cache" / "img"
TEX = re.compile(r"t_parmon_(\d+)_([a-z]+\d*)_(?:(shiny|whiteshiny|darkshiny|demonic)_)?(\d\d[a-z])_(?:(shiny|whiteshiny|darkshiny)_)?(c|ca)\.png$")
KIND = {None: "n", "shiny": "s", "whiteshiny": "z", "darkshiny": "d"}


def index():
    """(id, part, variant, kind) -> path, from every creature/form texture folder."""
    out = {}
    for d in sorted(os.listdir(OUT / "textures2")):
        if not re.search(r"(?:tc)?pm_(\d+)_", d):
            continue
        for f in os.listdir(OUT / "textures2" / d):
            m = TEX.match(f.lower())
            if not m or m.group(3) == "demonic":
                continue
            kind = KIND[m.group(3) or m.group(5)]
            key = (m.group(1), m.group(2), m.group(4), kind)
            p = f"textures2/{d}/{f}"
            if key not in out or os.path.getsize(OUT / p) > os.path.getsize(OUT / out[key]):
                out[key] = p
    return out


def main():
    picks = json.loads(Path(sys.argv[1]).read_text())
    raw = json.loads((ROOT / "tools" / "raw.json").read_text())
    A = {a["slug"]: a for a in raw["aniimo"]}
    sparkling = set(raw["sparkling"])
    idx = index()
    plan = {}
    for slug, p in picks.items():
        a = A.get(slug)
        if not a or a["unreleased"] or not p.get("parts"):
            continue
        mats = []  # distinct non-eye textures, in the order obj2glb creates materials
        for _, t in p["parts"]:
            if t not in mats and "_eye" not in t.lower():
                mats.append(t)
        keys = []
        for t in mats:
            m = TEX.match(Path(t).name.lower())
            keys.append((m.group(2), m.group(4)) if m else None)
        looks = {}
        # (form id, list the site shows it in): base form first, then every form on the site
        targets = [(a["full_id"], None)] + [(f["id"], f) for f in a["forms"]]
        for fid, f in targets:
            gid = fid[:5] if f is None else fid  # base textures use the 5-digit model id
            if f is None:
                gid = p["mid"]
            want = []
            if f is not None:
                want.append("n")
            if slug in sparkling and (f is None or f["kind"] == "prismana"):
                want += ["s", "z", "d"]
            if not want:
                continue
            look = {}
            for kind in want:
                srcs = []
                for k in keys:
                    hit = None
                    if k:
                        hit = idx.get((gid, k[0], k[1], kind))
                        if not hit and kind != "n":
                            hit = idx.get((gid, k[0], "01a", kind))
                    srcs.append(hit)
                base = []  # the texture a derived variant starts from: the form's own, else the model's
                for k, t in zip(keys, mats):
                    base.append((k and idx.get((gid, k[0], k[1], "n"))) or t)
                look[kind] = dict(src=srcs, base=base)
            ref_common = REF / "full1024" / (f"f{fid}.webp" if f else f"{slug}.webp")
            looks[fid] = dict(form=f["name"] if f else None, kind=f["kind"] if f else "base", want=look,
                              ref=dict(common=str(ref_common) if ref_common.exists() else None,
                                       spark=[str(REF / "spark320" / f"{fid}_{n:02d}.webp") for n in range(1, 13)
                                              if (REF / "spark320" / f"{fid}_{n:02d}.webp").exists()]))
        plan[slug] = dict(mats=mats, looks=looks)
    print(json.dumps(plan, indent=1))


if __name__ == "__main__":
    main()
