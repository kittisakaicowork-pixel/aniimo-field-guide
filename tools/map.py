"""Build the interactive Idyll map data (map.js, map.webp, map-icons.webp) from the AniiDex map.

    python3 tools/map.py            # uses cached pages / chunk
    python3 tools/map.py --refresh  # re-download the map page, data chunk and images

AniiDex bundles the Idyll markers into one Nuxt chunk (an ES module exporting {metadata, layers,
markers, regions, regionMeta}). We find it among the map page's scripts and evaluate it with Node.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import polite

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent / "i18n"))
from rules import translate  # noqa: E402

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CACHE = TOOLS / "cache" / "map"
BASE = "https://aniidex.com"
UA = "Mozilla/5.0 (AniimoFieldGuide fan project)"
REFRESH = "--refresh" in sys.argv
FULL = "--full" in sys.argv
ICON = 48  # sprite cell size

CATS = {"Mobility": "การเดินทาง", "Places": "สถานที่", "Puzzles": "ปริศนา", "Collection": "เก็บสะสม",
        "Challenges": "ท้าสู้", "Events": "กิจกรรม", "Materials": "วัตถุดิบ"}
LABELS = {
    "type_10410": "ต้น Bloom", "type_2000": "ที่จอด RV", "type_10600": "ทางเข้าถ้ำ", "type_20": "จุดเทเลพอร์ต",
    "type_10406": "จุดวาร์ป Bloom", "type_2": "พ่อค้าด่านหน้า", "type_33": "Bloomville", "type_10301": "Branch",
    "type_10407": "Astra Outpost", "type_10415": "จุดเกิด Aniimo หายากมาก", "type_10405": "จุดนิเวศสำคัญ",
    "type_10305": "Sanctum", "type_10401": "Lumin Marking", "type_10412": "ช่วยเหลือ Aniimo",
    "type_10413": "อำพันหนีหาย", "type_10414": "Lumin Collection", "type_10402": "ความทรงจำ Morphling",
    "type_10403": "บททดสอบ Dr. Glass", "type_10400": "ปริศนาธีม", "type_Chest": "หีบสมบัติ",
    "type_LuminAmber": "Lumin Amber", "type_Aniipod": "Aniipod", "type_Egg": "ไข่", "type_Dig": "จุดขุด",
    "type_BreakablePot": "ไหทุบได้", "type_Pickup": "ของบนพื้น", "type_10304": "Omega Aniimo",
    "type_10404": "Alpha Aniimo", "type_10510": "ท้าดวล Pathfinder", "type_10511": "ท้าดวล Pathfinder ระดับสูง",
    "type_10202": "Vein Rift", "type_27": "จุดติดตาม", "type_29": "สวดมนต์สุดสัปดาห์",
    "type_30": "บันทึกนิเวศ", "type_31": "สืบรอยนิเวศ", "type_121": "Vein Abundance",
}
# layers shown when the map first opens
DEFAULT_ON = {"type_20", "type_10406", "type_2", "type_33", "type_10407", "type_10304", "type_10404", "type_10305"}


def curl(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not REFRESH:
        return dest
    if dest.exists():
        dest.unlink()
    polite.get(url, dest)  # low rate, never player profiles (the owner's terms)
    return dest


def find_chunk():
    page = curl(BASE + "/map/", CACHE / "map.html").read_text()
    seen, queue = set(), re.findall(r'/_nuxt/([\w-]+\.js)', page)
    while queue:
        name = queue.pop(0)
        if name in seen:
            continue
        seen.add(name)
        src = curl(f"{BASE}/_nuxt/{name}", CACHE / "js" / name).read_text()
        if "map_3000_full" in src and "regionMeta" in src and not src.lstrip().startswith("import"):
            return CACHE / "js" / name
        queue += re.findall(r'\./([\w-]+\.js)', src)
    sys.exit("map data chunk not found")


def load(chunk):
    mod = CACHE / "idyll.mjs"
    mod.write_text(chunk.read_text())
    out = subprocess.run(["node", "--input-type=module", "-e",
                          f"import * as m from {json.dumps(str(mod))};"
                          "const d=Object.values(m).find(v=>v&&v.markers);process.stdout.write(JSON.stringify(d))"],
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def rewards(lst):
    return [[r["name"], r.get("amount", 1)] for r in lst or []]


def info(m):
    p, d = m.get("popup") or {}, m.get("details") or {}
    o = {"t": p.get("title") or m.get("tooltip") or "", "d": (p.get("description") or "").strip()}
    k = d.get("kind")
    if k and k != "poi":
        o["k"] = k
    for src, dst in [("element", "el"), ("recommendedElements", "rec"), ("notRecommendedElements", "bad"),
                     ("challengers", "ch"), ("chestsTotal", "cht")]:
        if d.get(src):
            o[dst] = d[src]
    if d.get("levelRange"):
        o["lv"] = [d["levelRange"]["min"], d["levelRange"]["max"]]
    if d.get("firstClearRewards"):
        o["first"] = rewards(d["firstClearRewards"])
    if d.get("rewards"):
        o["rw"] = rewards(d["rewards"])
    if d.get("rewardCost"):
        o["cost"] = [d["rewardCost"]["name"], d["rewardCost"]["amount"]]
    if d.get("stages"):
        o["st"] = [{"lv": s.get("recommendedLevel"), "rec": s.get("recommendedElements", []), "rw": rewards(s.get("rewards"))}
                   for s in d["stages"]]
    return o


def main():
    data = load(find_chunk())
    th = json.loads((TOOLS / "i18n" / "th.json").read_text())

    layers, icons = [], []
    for c in data["layers"]:
        for l in c["layers"]:
            icon = l.get("icon") or ""
            if icon not in icons:
                icons.append(icon)
            layers.append({"id": l["uid"], "c": c["label"], "cth": CATS.get(c["label"], c["label"]), "n": l["label"],
                           "th": LABELS.get(l["uid"], l["label"]), "ic": icons.index(icon), "on": l["uid"] in DEFAULT_ON})
    lix = {l["id"]: i for i, l in enumerate(layers)}

    infos, iix, marks = [], {}, []
    for m in data["markers"]:
        o = info(m)
        key = json.dumps(o, sort_keys=True)
        if key not in iix:
            iix[key] = len(infos)
            infos.append(o)
        for uid in m["layers"][:1]:
            if uid in lix:
                marks.append([lix[uid], round(m["x"] * 10000), round(m["y"] * 10000), iix[key]])

    regions = {n: [[round(p["x"], 2), round(p["y"], 2)] for p in pts] for n, pts in data["regions"].items()}
    rmeta = {n: {"lv": [v.get("minLevel"), v.get("maxLevel")]} for n, v in data["regionMeta"].items()}

    # images: the base map and one sprite with every layer icon
    src = curl(BASE + data["metadata"]["image"], CACHE / "map_full.webp")
    out_dir = ROOT / "dist-full" if FULL else ROOT
    im = Image.open(src).convert("RGB")
    if not FULL:
        im = im.resize((3072, 3072), Image.LANCZOS)
    im.save(out_dir / "map.webp", "WEBP", quality=80 if not FULL else 90, method=5)
    paths = [curl(f"{BASE}/_ipx/q_95&s_96x96/{i}", CACHE / "icons" / Path(i).name) if i else None for i in icons]
    sheet = Image.new("RGBA", (len(paths) * ICON, ICON), (0, 0, 0, 0))
    for i, p in enumerate(paths):
        if p and p.stat().st_size:
            ic = Image.open(p).convert("RGBA")
            ic.thumbnail((ICON, ICON), Image.LANCZOS)
            sheet.alpha_composite(ic, (i * ICON + (ICON - ic.width) // 2, (ICON - ic.height) // 2))
    sheet.save(out_dir / "map-icons.webp", "WEBP", quality=90, method=5)

    texts = {s for o in infos for s in (o["t"], o["d"]) if s}
    th_used = {s: t for s in texts for t in [translate(s, th)] if t}
    missing = sorted(texts - th_used.keys())
    miss_file = TOOLS / "i18n" / "missing_map.json"
    if missing:  # translate these, then add them to th.json
        miss_file.write_text(json.dumps({m: "" for m in missing}, ensure_ascii=False, indent=1))
    elif miss_file.exists():
        miss_file.unlink()

    payload = {"layers": layers, "icons": len(icons), "cell": ICON, "m": marks, "info": infos,
               "regions": regions, "rmeta": rmeta, "th": th_used}
    js = "window.MAP=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (out_dir / "map.js").write_text(js)
    print(f"map.js {len(js)/1e3:.0f} KB · {len(marks)} markers · {len(infos)} infos · {len(layers)} layers · "
          f"untranslated {len(missing)}")


if __name__ == "__main__":
    main()
