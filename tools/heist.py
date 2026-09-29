"""Build the Operation: Egg Heist maps (heist.js and heist/*.webp) from AniiLog, used with permission.

    python3 tools/heist.py            # uses cached pages / chunks
    python3 tools/heist.py --refresh  # re-download everything

AniiLog's map page component holds the Lost Isles island markers, the four difficulties (which Lost Sanctum
layouts each can roll, and how often) and the layout list. Each Lost Sanctum layout's markers live in their
own lazily imported chunk. The island data is a run of plain literals in the component, so we cut that run
out and evaluate it with Node; the layout chunks are ES modules we import directly.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CACHE = TOOLS / "cache" / "heist"
OUT = ROOT / "heist"
BASE = "https://aniilog.gg"
UA = "Mozilla/5.0 (AniimoFieldGuide fan project)"
REFRESH = "--refresh" in sys.argv
ICON = 48  # sprite cell size
ISLAND_W = 3072  # island image width in the web build
SANCTUM_W = 1024  # Lost Sanctum layout image width

CATS = {"Travel": "การเดินทาง", "Landmarks": "จุดสำคัญ", "Treasures": "สมบัติ", "Challenges": "ท้าทาย", "Enemies": "ศัตรู"}
LABELS = {
    "egg_teleporter": "จุดเทเลพอร์ต", "egg_evacuation": "จุดอพยพ", "egg_boat": "Egg Boat", "egg_landing": "จุดขึ้นฝั่ง",
    "egg_boat_dock": "ท่า Egg Boat", "egg_sanctum_main": "ทางเข้าหลัก Lost Sanctum", "egg_sanctum_side": "ทางเข้าข้าง Lost Sanctum",
    "egg_giant_egg": "ไข่ยักษ์ Umbrabow", "egg_nest": "รังไข่", "egg_chest": "หีบหายาก", "egg_lesser_chest": "หีบ",
    "egg_loot_pile": "กองของ", "egg_relic": "ของสะสม (Ritual Vessel)", "egg_coin_monsters": "มอนสเตอร์เหรียญ",
    "sanctum_door_main": "ทางเข้าหลัก", "sanctum_door_side": "ทางเข้าข้าง", "sanctum_nest": "รังไข่",
    "sanctum_key_room": "ห้องกุญแจ", "sanctum_rare_chest": "หีบหายาก", "sanctum_chest": "หีบ", "sanctum_loot_pile": "กองของ",
    "sanctum_challenge": "ภารกิจจำกัดเวลา", "sanctum_enemy": "Umbral Aniimo",
}
# Thai for the recurring popup texts; anything else stays in English
TEXT_TH = {
    "A makeshift boat made from a giant Aniimo egg.\nYou can deliver eggs or leave the island here.":
        "เรือที่ทำจากไข่ Aniimo ยักษ์ ส่งไข่หรือออกจากเกาะได้ที่นี่",
    "An egg nurturing an unknown life. Beneath its golden shell, powerful energy surges, awaiting the day of hatching.":
        "ไข่ที่มีชีวิตปริศนาอยู่ข้างใน ใต้เปลือกสีทองมีพลังมหาศาลรอวันฟัก",
    "A special Aniimo nest found only on the Lost Isles. You may be able to dig up rare Aniimo eggs here.":
        "รัง Aniimo ที่มีเฉพาะบน Lost Isles อาจขุดเจอไข่หายากได้ที่นี่",
    "A gate leading to the Lost Sanctum. Legend says mysterious and powerful Aniimo live beyond it.":
        "ประตูสู่ Lost Sanctum ว่ากันว่ามี Aniimo ทรงพลังอาศัยอยู่ข้างใน",
    "A side entrance to the Lost Sanctum that leads straight into its depths. Great opportunities often come with great risks!":
        "ทางเข้าข้างที่พาลงไปส่วนลึกของ Lost Sanctum โอกาสดีมักมาพร้อมความเสี่ยง",
    "An extremely rare chest, there might be something nice hidden in it": "หีบหายากมาก อาจมีของดีซ่อนอยู่",
    "A lesser chest the in-game map leaves unmarked.": "หีบธรรมดาที่แผนที่ในเกมไม่ได้ปักหมุดไว้",
    "A searchable pile the in-game map leaves unmarked.": "กองของที่ค้นได้ แผนที่ในเกมไม่ได้ปักหมุดไว้",
    "A simple key that opens locked rooms in beginner Sanctums.": "กุญแจธรรมดาสำหรับเปิดห้องที่ล็อกใน Sanctum ระดับเริ่มต้น",
}


def curl(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not REFRESH:
        return dest
    subprocess.run(["curl", "-sLg", "-A", UA, "-o", str(dest), url], check=True)
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
        if "sceneId:3004" in src and 'key:"normal"' in src:
            return src
        queue += re.findall(r'\./([\w-]+\.js)', src)
    sys.exit("Egg Heist map chunk not found")


def node(code):
    out = subprocess.run(["node", "--input-type=module", "-e", code], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def island_data(src):
    """Cut the literal declarations from the island metadata to the end of the layout table and evaluate them."""
    start = re.search(r'[\w$]+=\{sceneId:3004,', src).start()
    lay = re.search(r'([\w$]+)=\{\d{5}:\{number:', src[start:])
    end = start + lay.start() + len(lay.group(1)) + 1  # the layout table's opening brace
    depth, q, i = 0, None, end
    while True:  # walk to the end of the layout table's object literal
        c = src[i]
        if q:
            if c == "\\":
                i += 1
            elif c == q:
                q = None
        elif c in "\"'`":
            q = c
        elif c in "{[":
            depth += 1
        elif c in "}]":
            depth -= 1
            if depth == 0:
                break
        i += 1
    run = src[start:i + 1]
    heist = re.search(r'([\w$]+)=\{metadata:[\w$]+,layers:', run).group(1)
    diffs = re.search(r'([\w$]+)=\[\{key:"normal"', run).group(1)
    js = CACHE / "island.js"
    js.write_text(f"const {run};\nexport default {{heist:{heist},diffs:{diffs},layouts:{lay.group(1)}}};\n")
    return node(f"import d from {json.dumps(str(js))};process.stdout.write(JSON.stringify(d))")


def sanctum_chunks(src):
    return dict(re.findall(r'"\.\./\.\./data/sanctum/(\d+)\.json":\(\)=>[\w$]+\(\(\)=>import\("\./([\w-]+\.js)"\)', src))


def load_layout(name):
    mod = CACHE / "sanctum" / (Path(name).stem + ".mjs")
    mod.parent.mkdir(parents=True, exist_ok=True)
    mod.write_text(curl(f"{BASE}/_nuxt/{name}", CACHE / "js" / name).read_text())
    return node(f"import d from {json.dumps(str(mod))};process.stdout.write(JSON.stringify(d))")


class Pack:
    """Collects layers, icons and de-duplicated popup texts shared by every map."""

    def __init__(self):
        self.icons, self.infos, self.iix = [], [], {}

    def icon(self, path):
        if path not in self.icons:
            self.icons.append(path)
        return self.icons.index(path)

    def layers(self, cats):
        out = []
        for c in cats:
            for l in c["layers"]:
                out.append({"id": l["uid"], "c": c["label"], "cth": CATS.get(c["label"], c["label"]), "n": l["label"],
                            "th": LABELS.get(l["uid"], l["label"]), "ic": self.icon(l.get("icon") or "")})
        return out

    def info(self, m):
        p, d = m.get("popup") or {}, m.get("details") or {}
        o = {"t": p.get("title") or m.get("tooltip") or "", "d": (p.get("description") or "").strip()}
        if d.get("species"):
            o["sp"] = [[s["name"], s.get("chance")] for s in d["species"]]
        key = json.dumps(o, sort_keys=True)
        if key not in self.iix:
            self.iix[key] = len(self.infos)
            self.infos.append(o)
        return self.iix[key]

    def markers(self, data, layers):
        lix = {l["id"]: i for i, l in enumerate(layers)}
        out = []
        for m in data["markers"]:
            uid = m["layers"][0]
            if uid in lix:
                row = [lix[uid], round(m["x"] * 10000), round(m["y"] * 10000), self.info(m)]
                if m.get("difficulties"):
                    row.append(m["difficulties"])
                out.append(row)
        return out


def save_image(url, dest, width, box=None):
    im = Image.open(curl(url, CACHE / "img" / Path(url).name)).convert("RGB")
    if box:  # crop Lost Sanctum layouts to their content so the rooms fill the view
        w, h = im.size
        im = im.crop((round(box[0] * w), round(box[1] * h), round(box[2] * w), round(box[3] * h)))
    im.thumbnail((width, width), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=78, method=5)
    return im.size


def main():
    src = find_chunk()
    data = island_data(src)
    pack = Pack()

    heist = data["heist"]
    ilayers = pack.layers(heist["layers"])
    iw, ih = save_image(BASE + heist["metadata"]["image"], OUT / "island.webp", ISLAND_W)
    island = {"w": iw, "h": ih, "layers": ilayers, "m": pack.markers(heist, ilayers)}

    chunks = sanctum_chunks(src)
    layouts, slayers = {}, None
    for sid, meta in sorted(data["layouts"].items()):
        lay = load_layout(chunks[sid])
        if slayers is None:
            slayers = pack.layers(lay["layers"])
        box = meta.get("contentBox") or [0, 0, 1, 1]
        w, h = save_image(BASE + lay["metadata"]["image"], OUT / "s" / f"{sid}.webp", SANCTUM_W, box)
        marks = pack.markers(lay, slayers)
        # marker positions are relative to the full image; move them into the cropped frame
        bw, bh = box[2] - box[0], box[3] - box[1]
        for r in marks:
            r[1] = round((r[1] / 1e4 - box[0]) / bw * 1e4)
            r[2] = round((r[2] / 1e4 - box[1]) / bh * 1e4)
        layouts[sid] = {"n": meta["number"], "w": w, "h": h, "m": marks}

    diffs = [{"k": d["key"], "n": d["label"], "key": (d.get("keyItem") or {}).get("name", ""),
              "lay": [[str(l), d["weights"].get(str(l), 1)] for l in d["layouts"]]} for d in data["diffs"]]

    paths = [curl(f"{BASE}/{i.lstrip('/')}", CACHE / "icons" / Path(i).name) if i else None for i in pack.icons]
    sheet = Image.new("RGBA", (len(paths) * ICON, ICON), (0, 0, 0, 0))
    for i, p in enumerate(paths):
        if p and p.stat().st_size:
            ic = Image.open(p).convert("RGBA")
            ic.thumbnail((ICON, ICON), Image.LANCZOS)
            sheet.alpha_composite(ic, (i * ICON + (ICON - ic.width) // 2, (ICON - ic.height) // 2))
    sheet.save(OUT / "icons.webp", "WEBP", quality=90, method=5)

    th = {s: TEXT_TH[s] for o in pack.infos for s in (o["t"], o["d"]) if s in TEXT_TH}
    payload = {"island": island, "slayers": slayers, "layouts": layouts, "diffs": diffs, "info": pack.infos,
               "icons": len(pack.icons), "cell": ICON, "th": th}
    js = "window.HEIST=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "heist.js").write_text(js)
    print(f"heist.js {len(js)/1e3:.0f} KB · island {len(island['m'])} markers · {len(layouts)} Lost Sanctum layouts "
          f"({sum(len(l['m']) for l in layouts.values())} markers) · {len(pack.infos)} infos · {len(pack.icons)} icons")


if __name__ == "__main__":
    main()
