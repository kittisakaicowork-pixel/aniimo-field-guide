#!/usr/bin/env python3
"""Pick the files of web3d_deploy/ (the 3D viewer package, not in git) that may go public.

Only Aniimo and forms the site already shows are published: anything the game has not announced (unreleased
species, "Unreleased" forms, their textures and animations) stays off the bucket. Writes:
  tools/r2/files.txt   paths (relative to web3d_deploy/) to upload
  tools/r2/index.json  the viewer's model list with only those models (uploaded as models/index.json)
  tools/r2/m3d.json    slug -> {base file, form id -> file} for the site's 3D tab (read by build.py)

    python3 tools/r2/manifest.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "web3d_deploy"
OUT = Path(__file__).resolve().parent


def site_aniimo():
    js = (ROOT / "data.js").read_text()
    m = re.search(r"^window\.ANIIMO=(.*);$", js, re.M)
    return json.loads(m.group(1))


def main():
    A = [a for a in site_aniimo() if not a.get("u")]
    species = {a["fid"][:5]: a for a in A if a.get("fid")}
    forms = {f["id"]: (a, f) for a in A for f in a.get("f", []) if f.get("id")}
    index = json.loads((PKG / "models" / "index.json").read_text())
    by_name = {a["name"]: a for a in A if not a.get("fid")}  # a few released Aniimo have no game id on the site yet
    for e in index:
        if e["en"] in by_name and e["id"] not in species and len(e["id"]) == 5:
            species[e["id"]] = by_name[e["en"]]
    keep = [e for e in index if "unreleased" not in e["file"].lower() and (e["id"] in species or e["id"] in forms)]

    files = set()
    for p in PKG.rglob("*"):  # the viewer itself and the shared shader / lighting / effect data
        r = p.relative_to(PKG).as_posix()
        if p.is_file() and not r.startswith(("models/", "gtex/")) and p.name not in (".htaccess", ".DS_Store") \
                and not r.endswith(".command"):
            files.add(r)
    missing = []
    for e in keep:
        glbs = [e["file"]] + [s["file"] for s in e.get("styles") or [] if s.get("file")]
        for g in glbs:
            files.add("models/" + g)
            side = PKG / "models" / "game" / (g[:-4] + ".game.json")
            if not side.exists():
                missing.append(side.name)
                continue
            files.add("models/game/" + side.name)
            meta = side.read_text()
            files.add("models/game/" + json.loads(meta)["bin"])
            files.update("gtex/" + t for t in set(re.findall(r'"([^"/]+\.webp)"', meta)) if (PKG / "gtex" / t).exists())
        if e.get("anim"):
            files.add("models/" + e["anim"])
    files.discard("models/index.json")
    gone = [f for f in files if not (PKG / f).exists()]
    files -= set(gone)

    m3d = {}
    for e in keep:
        if e["variant"] != "base":
            continue
        if e["id"] in species:
            m3d.setdefault(species[e["id"]]["slug"], {})["b"] = e["file"]
        else:
            a, f = forms[e["id"]]
            m3d.setdefault(a["slug"], {}).setdefault("f", {})[f["id"]] = e["file"]

    (OUT / "files.txt").write_text("\n".join(sorted(files)) + "\n")
    (OUT / "index.json").write_text(json.dumps(keep, ensure_ascii=False))
    (OUT / "m3d.json").write_text(json.dumps(m3d, ensure_ascii=False, indent=1))
    size = sum((PKG / f).stat().st_size for f in files)
    print(f"{len(keep)}/{len(index)} models public · {len(files)} files · {size/1e9:.2f} GB · "
          f"{len(m3d)} Aniimo with 3D · held back {len(index) - len(keep)} · missing sidecars {len(missing)} · missing files {len(gone)}")


if __name__ == "__main__":
    main()
