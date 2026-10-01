#!/usr/bin/env python3
"""Build the Aniimo Field Guide from tools/raw.json (made by scrape.py).

    python3 tools/build.py          # web build in the project root (fits the Artifact limits)
    python3 tools/build.py --full   # full-quality local build in dist-full/ (2048px art, every Sparkling)

Both builds share index.html; build.js tells the page which assets exist.
Downloaded images are cached in tools/cache/img so rebuilding is offline.
"""
import base64
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent / "i18n"))
from rules import translate  # noqa: E402
import polite  # noqa: E402

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CACHE = TOOLS / "cache" / "img"
IPX = "https://aniidex.com/_ipx/q_90&fit_inside&s_{s}x{s}/"
RAW_URL = "https://aniidex.com/"
UA = "Mozilla/5.0 (AniimoFieldGuide fan project)"
FULL = "--full" in sys.argv
# 3D viewer package (web3d_deploy/, too big for GitHub Pages) lives in this Cloudflare R2 bucket; tools/r2/
R2_3D = "https://3d.aniiguide.trade"
KINDS = {"Basic attack": "atk", "Ultimate": "ult"}
SPARK_TYPES = 12


def download(jobs, workers=6):
    """jobs: list of (url, dest Path). Skips files already cached. AniiDex files go through polite.get
    (one at a time, spaced out: the owner's terms); others may run in parallel."""
    def one(job):
        return polite.get(*job)
    if any(polite.is_aniidex(u) for u, _ in jobs):
        return [one(j) for j in jobs]
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(one, jobs))


def art_path(a, form=None):
    """AniiDex path of the full-body art for a base form or an alternate form."""
    if form:
        return f"images/aniimo/full-body-shadow/{form['id']}/common.webp"
    if a["full_id"]:
        return f"images/aniimo/full-body-shadow/{a['full_id']}/common.webp"
    return f"images/aniimo/{a['head']}"


def icons_from_game():
    """icon file name as the scrape knows it (UI_Skillicon_Fire_2.webp, ui_item_1001.webp) -> gamedata/icons PNG."""
    d = ROOT / "gamedata" / "icons"
    have = {p.name.lower(): p for p in d.glob("*.png")} if d.exists() else {}
    def find(name):
        stem = name.lower().rsplit(".", 1)[0]
        for n in (stem, stem + "_large", stem + "_small"):
            if n + ".png" in have:
                return have[n + ".png"]
        return None
    return find


def pack_sheet(paths, cell, cols, out, quality=86):
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
    for i, p in enumerate(paths):
        if not p or not Path(p).exists():
            continue
        im = Image.open(p).convert("RGBA")
        im.thumbnail((cell, cell), Image.LANCZOS)
        sheet.alpha_composite(im, ((i % cols) * cell + (cell - im.width) // 2, (i // cols) * cell + (cell - im.height) // 2))
    sheet.save(out, "WEBP", quality=quality, method=4)
    return rows


def main():
    raw = json.loads((TOOLS / "raw.json").read_text())
    th = json.loads((TOOLS / "i18n" / "th.json").read_text())
    manual = json.loads((TOOLS / "manual.json").read_text())  # hand-kept data: redeem codes
    names_th = json.loads((TOOLS / "i18n" / "names_th.json").read_text())
    game = None
    if (ROOT / "gamedata").exists():  # the game's own data wins over the scrape (see tools/game.py)
        import game
        names_th.update(game.apply(raw, th))
    A = raw["aniimo"]
    out_dir = ROOT / "dist-full" if FULL else ROOT
    out_dir.mkdir(exist_ok=True)

    # ------------------------------------------------ creature + form art
    # Full-body renders of the in-game models, the way AniiDex shows them (owner's permission, credited;
    # fetched politely and cached). The game's Research Book art only fills what AniiDex lacks. Only creatures
    # and forms already listed on the site get art, so nothing unannounced leaks from the game files.
    img_jobs, art = [], {}
    for a in A:
        name = f"img/{a['slug']}.webp"
        art[(a["slug"], None)] = name
        img_jobs.append((a, None, name))
        for fi, f in enumerate(a["forms"]):
            if f["has_image"] or (game and not a["unreleased"] and game.art(f["id"])):
                name = f"img/f{f['id']}.webp"
                art[(a["slug"], fi)] = name
                img_jobs.append((a, f, name))
    size = 2048 if FULL else 1024
    cache = CACHE / f"full{size}"
    gcache = CACHE / "game-art"
    gcache.mkdir(parents=True, exist_ok=True)
    urls = [((RAW_URL if FULL else IPX.format(s=size)) + art_path(a, f), cache / Path(n).name)
            for a, f, n in img_jobs if (f is None or f["has_image"])]
    ok = download(urls)
    srcs, from_game = {}, set()
    for a, f, n in img_jobs:
        srcs[n] = cache / Path(n).name
        if srcs[n].exists():
            continue
        gid = f["id"] if f else (re.search(r"(\d+)", a["head"]).group(1) if a["head"] else "")
        g = game and not a["unreleased"] and game.art(gid)
        if g:
            dest = gcache / Path(n).name
            if not dest.exists() or dest.stat().st_mtime < g.stat().st_mtime:
                game.stylize(g).save(dest, "WEBP", quality=88, method=4)
            srcs[n] = dest
            from_game.add(n)
    print(f"art: {sum(ok)}/{len(ok)} full-body renders (AniiDex), {len(from_game)} from the game's Research Book")
    (out_dir / "img").mkdir(exist_ok=True)
    for _, _, name in img_jobs:
        if srcs[name].exists():
            shutil.copyfile(srcs[name], out_dir / name)

    # thumbnails (200px) embedded in one script so list views stay light
    thumbs = {}
    for _, _, name in img_jobs:
        src = srcs[name]
        if not src.exists():
            continue
        im = Image.open(src).convert("RGBA")
        im.thumbnail((200, 200), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=80, method=4)
        thumbs[name] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    (out_dir / "thumbs.js").write_text("window.THUMB=" + json.dumps(thumbs, separators=(",", ":")) + ";")

    # ------------------------------------------------ skill icon sprite
    icons = sorted({s["icon"] for a in A for s in a["skills"]})
    icon = icons_from_game()  # the game's own icons first, AniiDex's only for the few it lacks
    download([(IPX.format(s=128).replace("fit_inside&", "") + "images/skills/" + ic, CACHE / "skill128" / ic) for ic in icons if not icon(ic)])
    cols = 15
    rows = pack_sheet([icon(ic) or CACHE / "skill128" / ic for ic in icons], 128, cols, out_dir / "skills.webp", quality=90)
    sprite = dict(cols=cols, rows=rows)
    icon_idx = {ic: i for i, ic in enumerate(icons)}

    # ------------------------------------------------ sparkling
    # Sparkling images: AniiDex's renders of the in-game model (used with the owner's permission, credited)
    # match the game best, so they come first; our renders (tools/model/render.cjs) fill any look they lack.
    listed = set(raw["sparkling"])
    own = CACHE / "spark-own"
    has_own = lambda fid: all((own / f"{fid}_{n:02d}.webp").exists() for n in range(1, SPARK_TYPES + 1))
    spark_size = 1024 if FULL else 320
    sp_cache = CACHE / f"spark{spark_size}"
    has_ref = lambda fid: all((sp_cache / f"{fid}_{n:02d}.webp").exists() for n in range(1, SPARK_TYPES + 1))
    entries = []  # (slug, form index or None, art id)
    for a in A:
        if a["slug"] in listed and a["full_id"]:
            entries.append((a["slug"], None, a["full_id"]))
        for fi, f in enumerate(a["forms"]):
            if not (f["has_image"] or has_own(f["id"]) or has_ref(f["id"])):
                continue
            if f["kind"] == "prismana" and a["slug"] in listed:
                entries.append((a["slug"], fi, f["id"]))
            elif FULL and a["slug"] in listed:
                entries.append((a["slug"], fi, f["id"]))  # regional/weather Sparkling: full build only
    jobs = [(IPX.format(s=spark_size) + f"images/aniimo/full-body-shadow/{fid}/sparkling-{n:02d}.webp", sp_cache / f"{fid}_{n:02d}.webp")
            for _, _, fid in entries if not has_own(fid) and not has_ref(fid) for n in range(1, SPARK_TYPES + 1)]
    ok = download(jobs)
    have = {fid for (_, dest), good in zip(jobs, ok) if good for fid in [dest.stem.split("_")[0]]}
    entries = [e for e in entries if has_ref(e[2]) or has_own(e[2])]
    spk = lambda fid, n: (sp_cache if has_ref(fid) else own) / f"{fid}_{n:02d}.webp"
    print(f"sparkling: {sum(has_ref(e[2]) for e in entries)} looks from AniiDex, {sum(not has_ref(e[2]) for e in entries)} from our renders")
    spark = dict(e=[[s, fi] for s, fi, _ in entries], cols=10)
    if FULL:
        (out_dir / "spk").mkdir(exist_ok=True)
        for s, fi, fid in entries:
            for n in range(1, SPARK_TYPES + 1):
                src = spk(fid, n)
                if src.exists():
                    shutil.copyfile(src, out_dir / "spk" / src.name)
        spark["ids"] = [fid for _, _, fid in entries]
    else:
        for n in range(1, SPARK_TYPES + 1):
            paths = [spk(fid, n) for _, _, fid in entries]
            spark["rows"] = pack_sheet(paths, 320, 10, out_dir / f"spark-{n:02d}.webp")
            big = Image.open(out_dir / f"spark-{n:02d}.webp")
            big.resize((big.width * 128 // 320, big.height * 128 // 320), Image.LANCZOS).save(out_dir / f"spark-s-{n:02d}.webp", "WEBP", quality=80, method=4)
    # full build also gets small sheets for the grid view
    if FULL:
        for n in range(1, SPARK_TYPES + 1):
            paths = [spk(fid, n) for _, _, fid in entries]
            spark["rows"] = pack_sheet(paths, 128, 10, out_dir / f"spark-s-{n:02d}.webp", quality=80)

    # ------------------------------------------------ item icons
    items_raw = raw.get("items", [])
    icons_i = [it["icon"] for it in items_raw if it["icon"]]
    download([(IPX.format(s=96) + "images/items/" + ic, CACHE / "item96" / ic) for ic in icons_i if not icon(ic)])
    item_cols = 10
    item_rows = pack_sheet([icon(ic) or CACHE / "item96" / ic for ic in icons_i], 96, item_cols, out_dir / "items.webp", quality=88)
    item_idx = {ic: i for i, ic in enumerate(icons_i)}
    held_effect = {x["name"]: x["effect"] for a in A for x in a["items"] if x["effect"]}
    items = [dict(slug=it["slug"], n=it["name"], q=it["quality"], c=it["category"], f=1 if it.get("featured", True) else 0,
                  d=it["desc"] or held_effect.get(it["name"], ""), ix=item_idx.get(it["icon"], -1),
                  src=[[x["kind"], x["detail"], x["cost"], x["where"], x["note"]] for x in it["sources"]])
             for it in items_raw]
    events = [dict(slug=e["slug"], t=e["title"], run=e["run"], kind=e["kind"], ends=e["ends_in"], starts=e["starts_in"],
                   d=e["intro"], rules=e["rules"], rw=e["rewards"], dates=e["dates"]) for e in raw.get("events", [])]

    # ------------------------------------------------ data
    aniimo, skills, partners = [], {}, {}
    regions = {}
    for a in A:
        hid = int(re.search(r"(\d+)", a["head"]).group(1)) if a["head"] else 0
        aniimo.append(dict(
            no=a["no"], name=a["name"], slug=a["slug"], e=a["elements"], st=a["stage"], r=a["role"], d=a["desc"],
            s=a["stats"], i=art[(a["slug"], None)], cut=art[(a["slug"], None)] not in from_game and not a["full_id"], u=a["unreleased"], ord=hid, b=a.get("bio"), rec=a.get("rec"),
            fid=a["full_id"], f=[dict(id=f["id"], n=f["name"], k=f["kind"], e=f["elements"], i=art.get((a["slug"], fi), "")) for fi, f in enumerate(a["forms"])],
            w=a["work"], it=[[x["name"], x["effect"]] for x in a["items"]],
            sp=dict(c=a["spawn"]["conditions"], r=[[g["name"], g["level"]] for g in a["spawn"]["regions"]]),
        ))
        for g in a["spawn"]["regions"]:
            regions[g["name"]] = g["desc"]
        skills[a["slug"]] = dict(
            s=[[s["name"], KINDS.get(s["kind"], s["kind"].replace("Skill ", "s")), s["element"], s["dmg"][:1],
                s["chips"].get("Might", ""), s["chips"].get("EP cost", s["chips"].get("Ultimate cost", "")),
                s["chips"].get("Cooldown", ""), 1 if s["rare"] else 0, icon_idx.get(s["icon"], -1), s["desc"], s["tags"]]
               for s in a["skills"]],
            t=[[t["name"], t["kind"], t["desc"]] for t in a["traits"]], up=a.get("skill_upgrades", []))
        if a["partners"]:
            partners[a["slug"]] = a["partners"]
    evo = {}
    for a in A:
        for r in a["routes"]:
            evo[(r["src"], r["dst"])] = [r["criteria"], [[c["item"], c["n"]] for c in r["cost"]]]
    evo = [[s, d, c, k] for (s, d), (c, k) in evo.items()]
    bosses = [dict(slug=b["slug"], name=b["name"], kind=b["kind"], lv=b["level"], weak=b["weak"], strong=b["strong"],
                   head=b["head"], el=b["element"], region=b["region"], d=b["desc"], respawn=b["respawn"], claim=b["claim"],
                   stats=b["stats"], first=b["first_clear"], every=b["every_clear"],
                   species=next((a["slug"] for a in A if a["name"] == b["name"].split()[-1]), ""))
              for b in raw["bosses"]]
    used = {x for a in A for x in [a["desc"]] + [s["desc"] for s in a["skills"]] + [t["desc"] for t in a["traits"]]
            + [i["effect"] for i in a["items"]] + [a["spawn"]["conditions"]] + [g["desc"] for g in a["spawn"]["regions"]]
            + [c for r in a["routes"] for c in r["criteria"]]} | {b["desc"] for b in raw["bosses"]} \
        | {it["desc"] for it in raw.get("items", [])} | {x for e in raw.get("events", []) for x in [e["intro"]] + e["rules"]} \
        | {n for it in raw.get("items", []) for x in it["sources"] for n in [x["note"]]} | {t["desc"] for t in raw.get("territories", [])}
    # AniiDex sometimes re-posts the same text with other quotes or capitals; reuse the translation
    loose = lambda x: re.sub(r"\W+", " ", x).strip().lower()
    by_loose = {loose(k): v for k, v in th.items()}
    for x in used - th.keys():  # templated text (item sources, crafting notes...) translates by rule
        t = x and (by_loose.get(loose(x)) or translate(x, th))
        if t:
            th[x] = t
    th_used = {k: th[k] for k in sorted(used & th.keys())}  # sorted: same data, same file
    missing = sorted(x for x in used if x and x not in th)
    miss_file = TOOLS / "i18n" / "missing.json"
    if missing:  # new game text after a scrape: translate these, then add them to th.json
        miss_file.write_text(json.dumps({m: "" for m in missing}, ensure_ascii=False, indent=1))
    elif miss_file.exists():
        miss_file.unlink()
    js = "".join(f"window.{k}={json.dumps(v, ensure_ascii=False, separators=(',', ':'))};\n" for k, v in [
        ("ANIIMO", aniimo), ("SKILLS", skills), ("SPRITE", sprite), ("PARTNERS", partners), ("SPARK", spark),
        ("EVO", evo), ("BOSSES", bosses), ("REGIONS", regions), ("TH", th_used), ("NAMES_TH", names_th), ("CODES", manual),
        ("ITEMS", dict(cols=item_cols, rows=item_rows, list=items)), ("EVENTS", events), ("UPCOMING", raw.get("upcoming", [])),
        ("TERR", raw.get("territories", [])), ("FOOD", game.foods() if game else []),
        ("M3D", dict(url=R2_3D, m=json.loads((TOOLS / "r2" / "m3d.json").read_text())) if (TOOLS / "r2" / "m3d.json").exists() else None),
        ("SETS", json.loads((TOOLS / "sets.json").read_text()) if (TOOLS / "sets.json").exists() else []), ("RUSH", raw.get("boss_rush", [])),
        ("META", dict(scraped=raw["scraped"], scraped_at=raw.get("scraped_at", ""), full=FULL, server="Asia-Pacific"))])
    (out_dir / "data.js").write_text(js)
    # Script links carry a version from the files' contents, so browsers and Cloudflare fetch new data at once
    # (and an unchanged build leaves index.html unchanged).
    if not FULL:
        parts = [(ROOT / f).read_bytes() for f in ("data.js", "thumbs.js", "content.js", "i18n-en.js", "map.js", "heist.js")
                 if (ROOT / f).exists()]
        stamp = hashlib.md5(b"".join(parts)).hexdigest()[:10]
        page = ROOT / "index.html"
        old = page.read_text()
        new = re.sub(r"((?:data|thumbs|content|i18n-en|map|heist)\.js\?v=)[0-9a-z]+", lambda m: m.group(1) + stamp, old)
        if new != old:
            page.write_text(new)
    print(f"data.js {len(js)/1e6:.2f} MB · Thai strings {len(th_used)} · untranslated {len(missing)}")

    if FULL:
        for f in ["index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "sw.js"]:
            shutil.copyfile(ROOT / f, out_dir / f)
    skip = {"tools", "dist-full", ".git", "gamedata", "aniimo", "web3d_deploy"}
    total = sum(p.stat().st_size for p in out_dir.rglob("*")
                if p.is_file() and not skip & set(p.relative_to(out_dir).parts))
    print(f"built {out_dir} ({total/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
