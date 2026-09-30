#!/usr/bin/env python3
"""Read the game's own data (gamedata/, not in git) and compare it with tools/raw.json.

gamedata/ is the "aniimo_web_package" exported from the game install: pets.json, skills.json,
items.json, tables/*.json and text/<lang>.json. Game text keeps its formulas as
<customRichText(...)> tags; resolve() turns them into the numbers players see.

    python3 tools/game.py     # writes tools/compare/report.md and tools/compare/diff.json
"""
import json
import re
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
GAME = ROOT / "gamedata"
OUT = TOOLS / "compare"


def load(name):
    return json.loads((GAME / name).read_text())


def table(name):
    return load(f"tables/{name}.json")


PETS, SKILLS, ITEMS = load("pets.json"), load("skills.json"), load("items.json")
ELEMENTS = {e["id"]: e for e in load("elements.json").values()}
EN, TH = load("text/en.json"), load("text/th_TH.json")
CALC = {"buff": table("buff_calc_value_data"), "ability": table("ability_calc_value_data"), "timeline": table("timeline_calc_value_data")}
BUFF = table("buff_config_data")
TRAITS = table("pet_character_data")
AGAINST = table("real_element_against")

RICH = re.compile(r"<customRichText\(([^)]*)\)>(?=(%?))")
TAG = re.compile(r"</?(style|color|u|link|b|size|dayTime)(=[^>]*)?>", re.I)


def num(v):
    v = round(v, 3)
    return str(int(v)) if v == int(v) else str(v)


def resolve(s):
    """Game text -> plain text: formulas become numbers, markup is dropped."""
    def one(m):
        p = [x.strip() for x in m.group(1).split(",")]
        try:
            if p[0] == "calcData":
                v = abs(CALC[p[1]][p[2]][p[3]][0]["calcValue"])  # the text already says "reduces"
                return num(v * 100) if "%d" in p or m.group(2) else num(v)
            if p[0] == "buffConfigData":
                return num(BUFF[p[1]][p[2]])
        except (KeyError, IndexError, TypeError):
            pass
        return "?"  # scales with a stat (formulaExplictId); not worked out yet
    s = RICH.sub(one, s or "")
    s = re.sub(r"<br>", " ", TAG.sub("", s), flags=re.I)
    return " ".join(s.split())


def th_norm(s):
    """Game Thai uses NIKHAHIT + SARA AA for SARA AM and zero-width spaces between words."""
    return re.sub("\u0e4d([\u0e48-\u0e4b]?)\u0e32", "\\1\u0e33", (s or "").replace("\u200b", ""))


def en_key(s):
    """Loose match key for English: no spaces before punctuation, typographic quotes folded."""
    s = s.replace("’", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"(\d) (s|m|h)\b", r"\1\2", " ".join(s.split()))
    return re.sub(r"\s+([.,%!?)\]])", r"\1", s).lower()


def loc(d, lang="en"):
    return (d or {}).get(lang) or ""


STAT_MAP = {"HP": "hp_max", "ATK": "atk", "PDEF": "def", "MDEF": "def_mag", "REGEN": "ep_regen_force", "BREAK": "bp_atk"}


def main():
    raw = json.loads((TOOLS / "raw.json").read_text())
    names_th = json.loads((TOOLS / "i18n" / "names_th.json").read_text())
    th_site = json.loads((TOOLS / "i18n" / "th.json").read_text())
    by_en = {}
    for p in PETS.values():
        by_en.setdefault(loc(p["name"]).lower(), p)

    rep = {"aniimo": [], "stats": [], "skills": [], "traits": [], "names_th": [], "items": [], "th": {}, "chart": [], "extra_pets": []}

    # ------------------------------------------------ Aniimo, stats, skills, traits, Thai names
    site_ids = set()
    for a in raw["aniimo"]:
        g = PETS.get(str(a.get("full_id") or "")) or by_en.get(a["name"].lower())
        if not g:
            rep["aniimo"].append({"slug": a["slug"], "name": a["name"], "issue": "not found in game data"})
            continue
        site_ids.add(g["id"])
        if loc(g["name"]) != a["name"]:
            rep["aniimo"].append({"slug": a["slug"], "name": a["name"], "issue": f"game name: {loc(g['name'])}"})
        for k, gk in STAT_MAP.items():
            if a["stats"].get(k) != g["stats"].get(gk):
                rep["stats"].append({"slug": a["slug"], "stat": k, "site": a["stats"].get(k), "game": g["stats"].get(gk)})
        gth = th_norm(loc(g["name"], "th_TH"))
        if names_th.get(a["slug"]) != gth:
            rep["names_th"].append({"slug": a["slug"], "site": names_th.get(a["slug"]), "game": gth})

        gs = {}
        for sk in g["skills"]:
            s = SKILLS.get(str(sk["id"]))
            if s:
                gs[loc(s["name"]).lower()] = (sk, s)
        seen = set()
        for s in a["skills"]:
            hit = gs.get(s["name"].lower())
            if not hit:
                rep["skills"].append({"slug": a["slug"], "skill": s["name"], "issue": "not in game skill list"})
                continue
            seen.add(s["name"].lower())
            sk, gsk = hit
            r = gsk["raw"]
            chk = {"Might": num(r.get("power") or 0), "EP cost": num(r.get("epCost") or 0), "Cooldown": num(r.get("cd") or 0) + "s"}
            for k, v in chk.items():
                sv = s["chips"].get(k)
                if sv is not None and sv != v and not (k == "Might" and r.get("power") in (0, None)):
                    rep["skills"].append({"slug": a["slug"], "skill": s["name"], "issue": f"{k}: site {sv} / game {v}"})
            gd = resolve(EN.get(str(r.get("desc")), ""))
            if gd and en_key(gd) != en_key(s["desc"]):
                rep["skills"].append({"slug": a["slug"], "skill": s["name"], "issue": "desc differs", "site": s["desc"], "game": gd})
        for k, (sk, gsk) in gs.items():
            if k not in seen:
                rep["skills"].append({"slug": a["slug"], "skill": loc(gsk["name"]), "issue": f"in game ({sk['type']}) but not on site"})

        for fid in g["raw"].get("feature") or []:
            t = TRAITS.get(str(fid))
            if not t:
                continue
            gd = resolve(loc(t.get("desc")))
            site = next((x for x in a["traits"] if en_key(x["name"]) == en_key(loc(t.get("name")))), None)
            if not site:
                rep["traits"].append({"slug": a["slug"], "trait": loc(t.get("name")), "issue": "not on site", "game": gd})
            elif en_key(site["desc"]) != en_key(gd):
                rep["traits"].append({"slug": a["slug"], "trait": site["name"], "issue": "desc differs", "site": site["desc"], "game": gd})

    # forms and creatures in the game that the site does not list (many are unreleased)
    listed = site_ids | {int(f["id"]) for a in raw["aniimo"] for f in a["forms"]}
    for p in PETS.values():
        if p["id"] not in listed and p["id"] == p.get("baseFormPet"):
            rep["extra_pets"].append({"id": p["id"], "name": loc(p["name"]), "th": th_norm(loc(p["name"], "th_TH"))})

    # ------------------------------------------------ items
    gi = {}
    for it in ITEMS.values():
        gi.setdefault(en_key(loc(it["name"])), it)
    for it in raw["items"]:
        g = gi.get(en_key(it["name"]))
        if not g:
            rep["items"].append({"name": it["name"], "issue": "not found in game data"})
            continue
        gd = resolve(" ".join(EN.get(str(g["raw"].get(k)), "") for k in ("funcRep", "itemDes")))
        if gd and en_key(gd) != en_key(it["desc"]):
            rep["items"].append({"name": it["name"], "issue": "desc differs", "site": it["desc"], "game": gd})

    # ------------------------------------------------ hand translations vs official Thai
    official = {}
    for k, v in EN.items():
        if k in TH:
            official.setdefault(en_key(resolve(v)), th_norm(resolve(TH[k])))
    same = replace = none = 0
    samples = []
    for en, th in th_site.items():
        o = official.get(en_key(en))
        if o is None:
            none += 1
        elif o == th:
            same += 1
        else:
            replace += 1
            if len(samples) < 40:
                samples.append({"en": en, "site": th, "game": o})
    rep["th"] = {"total": len(th_site), "same": same, "official_differs": replace, "no_official": none, "samples": samples}

    # ------------------------------------------------ type chart
    for atk, row in AGAINST.items():
        for dfn, mult in row.items():
            if mult != 1:
                rep["chart"].append({"atk": ELEMENTS[int(atk)]["key"], "def": ELEMENTS[int(dfn)]["key"], "x": mult})

    OUT.mkdir(exist_ok=True)
    (OUT / "diff.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    t = rep["th"]
    print(f"aniimo matched: {len(site_ids)}/{len(raw['aniimo'])} · name issues {len(rep['aniimo'])}")
    print(f"stat diffs: {len(rep['stats'])} · Thai name diffs: {len(rep['names_th'])}")
    print(f"skill issues: {len(rep['skills'])} · trait issues: {len(rep['traits'])}")
    print(f"items: {len(raw['items'])} site, issues {len(rep['items'])}")
    print(f"th.json: {t['total']} · same {t['same']} · official differs {t['official_differs']} · no official {t['no_official']}")
    print(f"game-only base Aniimo: {len(rep['extra_pets'])} · type chart entries: {len(rep['chart'])}")


if __name__ == "__main__":
    main()


def art(gid):
    """In-game Research Book art for a creature or form id (e.g. 10222, 1022201), or None."""
    for name in (f"UI_Img_ResearchBook_Enter_{gid}.png", f"UI_Img_ResearchBook_Enter_{gid}_Shadow.png"):
        p = GAME / "art" / name
        if p.exists():
            return p
    return None


def stylize(path):
    """Light touch so the site does not carry the game's art 1:1: tones posterized to 32 levels,
    colour lifted a little, and edges where the painting is cut off fade out. Returns a square RGBA image."""
    from PIL import Image, ImageChops, ImageEnhance, ImageOps
    im = Image.open(path).convert("RGBA")
    r, g, b, a = im.split()
    rgb = ImageEnhance.Color(ImageOps.posterize(Image.merge("RGB", (r, g, b)), 5)).enhance(1.08)
    w, h = im.size
    fade = max(8, int(min(w, h) * 0.12))
    ramp = Image.linear_gradient("L").resize((1, fade))  # 0 at the edge -> 255 inside
    mask = Image.new("L", (w, h), 255)
    touches = lambda box: max(a.crop(box).getdata()) > 16
    if touches((0, 0, w, 2)):
        mask.paste(ImageChops.multiply(mask.crop((0, 0, w, fade)), ramp.resize((w, fade))), (0, 0))
    if touches((0, h - 2, w, h)):
        mask.paste(ImageChops.multiply(mask.crop((0, h - fade, w, h)), ramp.transpose(Image.FLIP_TOP_BOTTOM).resize((w, fade))), (0, h - fade))
    side = ramp.transpose(Image.ROTATE_90).resize((fade, h))  # 0 at x=0 -> 255 inside
    if touches((0, 0, 2, h)):
        mask.paste(ImageChops.multiply(mask.crop((0, 0, fade, h)), side), (0, 0))
    if touches((w - 2, 0, w, h)):
        mask.paste(ImageChops.multiply(mask.crop((w - fade, 0, w, h)), side.transpose(Image.FLIP_LEFT_RIGHT)), (w - fade, 0))
    out = Image.merge("RGBA", (*rgb.split(), ImageChops.multiply(a, mask)))
    # the paintings sit at the bottom of a tall transparent canvas: crop to the creature, then square it
    box = out.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        out = out.crop(box)
    w, h = out.size
    s = int(max(w, h) * 1.04)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.alpha_composite(out, ((s - w) // 2, (s - h) // 2))
    return sq


def recommended(raw):
    """The game's recommended build: a held item family (3 rarities) and a rune family (4 rarities)."""
    def name(it):
        return [loc(it["name"]), th_norm(loc(it["name"], "th_TH"))]
    out = {}
    eq = [ITEMS.get(str(i)) for i in raw.get("recommendEquipment") or []]
    if eq and eq[0]:
        out["h"] = name(eq[0])
    gems = raw.get("recommendGemId") or []
    if gems:  # rune ids point at items through their icon (ui_item_<id>)
        want = f"img/ui_item_{gems[-1]}"
        it = next((x for x in ITEMS.values() if (x.get("icon") or "").startswith(want)), None)
        if it:
            out["r"] = name(it)
    return out


def foods():
    """Homeland foods: [Thai name, English name, energy] from homeland_food_item + item names."""
    out = []
    for iid, energy in table("homeland_food_item").items():
        it = ITEMS.get(str(iid))
        if it and energy:
            out.append([th_norm(loc(it["name"], "th_TH")), loc(it["name"]), energy])
    return sorted(out, key=lambda x: -x[2])


def official_th():
    """English game text (resolved, match key) -> official Thai, for every string that has both."""
    out = {}
    for k, v in EN.items():
        t = TH.get(k)
        if t:
            e, t = resolve(v), th_norm(resolve(t))
            if e and "?" not in e and "?" not in t:
                out.setdefault(en_key(e), t)
    for d in (table("pet_research_content_data"), PETS, SKILLS, ITEMS):
        for x in d.values():
            for f in ("desc", "name"):
                v = x.get(f)
                if isinstance(v, dict) and v.get("en") and v.get("th_TH"):
                    out.setdefault(en_key(resolve(v["en"])), th_norm(resolve(v["th_TH"])))
    return out


def apply(raw, th):
    """Game data wins: overwrite raw.json text and numbers in place, put the official Thai in th.
    Returns {slug: official Thai name}. Creatures missing from the game files (not yet
    released when the files were exported) keep their scraped data."""
    research = table("pet_research_content_data")
    by_en = {}
    for p in PETS.values():
        by_en.setdefault(loc(p["name"]).lower(), p)
    names = {}
    for a in raw["aniimo"]:
        g = PETS.get(str(a.get("full_id") or "")) or by_en.get(a["name"].lower())
        if not g:
            continue
        names[a["slug"]] = th_norm(loc(g["name"], "th_TH"))
        gr, mv, sr = g["raw"].get("genderRatio"), g["move"], g["raw"].get("shiny_rate")
        a["bio"] = dict(  # body facts the site had no source for before
            h=g["size"].get("height"), w=g["size"].get("weight"),
            g=[round(gr[0] * 100), round(gr[1] * 100)] if isinstance(gr, list) and len(gr) == 2 else None,  # None: genderless
            mv={k: v for k, v in (("fly", mv.get("canFly")), ("climb", mv.get("canClimb")), ("glide", mv.get("canGlide"))) if v},
            sr=round(1 / sr) if sr else None,
            fs=g["raw"].get("homeFoodCostSpeed"))  # Homeland food energy used per minute
        rec = recommended(g["raw"])
        if rec:
            a["rec"] = rec
        for k, gk in STAT_MAP.items():
            if g["stats"].get(gk) is not None:
                a["stats"][k] = g["stats"][gk]
        r = research.get(str(g["id"]))
        if r and loc(r.get("desc")):
            a["desc"] = resolve(loc(r["desc"]))
        gs = {loc(SKILLS[str(sk["id"])]["name"]).lower(): SKILLS[str(sk["id"])]["raw"] for sk in g["skills"] if str(sk["id"]) in SKILLS}
        for s in a["skills"]:
            r = gs.get(s["name"].lower())
            if not r:
                continue
            c = s["chips"]
            if r.get("power") and re.fullmatch(r"\d+(\.\d+)?", c.get("Might", "0")):  # "7/segment", "84/105/126" say more
                c["Might"] = num(r["power"])
            if "EP cost" in c and r.get("epCost") is not None:
                c["EP cost"] = num(r["epCost"])
            if "Cooldown" in c and r.get("cd") is not None:
                c["Cooldown"] = num(r["cd"]) + "s"
            d = resolve(EN.get(str(r.get("desc")), ""))
            if d and "?" not in d:
                s["desc"] = d
        feats = [TRAITS[str(f)] for f in g["raw"].get("feature") or [] if str(f) in TRAITS]
        for t in a["traits"]:
            f = next((x for x in feats if en_key(loc(x.get("name"))) == en_key(t["name"])), None)
            d = f and resolve(loc(f.get("desc")))
            if d and "?" not in d:
                t["desc"] = d
    gi = {}
    for it in ITEMS.values():
        gi.setdefault(en_key(loc(it["name"])), it)
    for it in raw.get("items", []):
        g = gi.get(en_key(it["name"]))
        if not g:
            continue
        ids = [str(g["raw"].get(k)) for k in ("funcRep", "itemDes") if EN.get(str(g["raw"].get(k)))]
        d = resolve(" ".join(EN[i] for i in ids))  # what it does, then the flavour line
        if d and "?" not in d:
            it["desc"] = d
            t = " ".join(th_norm(resolve(TH.get(i, ""))) for i in ids)
            if all(TH.get(i) for i in ids) and "?" not in t:
                th[d] = t
    # official Thai for every English line the site shows, whether it came from the game or the scrape
    off = official_th()
    for x in collect_text(raw):
        t = off.get(en_key(x))
        if t:
            th[x] = t
    return names


def collect_text(raw):
    A = raw["aniimo"]
    return {x for a in A for x in [a["desc"]] + [s["desc"] for s in a["skills"]] + [t["desc"] for t in a["traits"]]
            + [i["effect"] for i in a["items"]] + [a["spawn"]["conditions"]] + [g["desc"] for g in a["spawn"]["regions"]]
            + [c for r in a["routes"] for c in r["criteria"]]} | {b["desc"] for b in raw["bosses"]} \
        | {it["desc"] for it in raw.get("items", [])} | {x for e in raw.get("events", []) for x in [e["intro"]] + e["rules"]} \
        | {n for it in raw.get("items", []) for x in it["sources"] for n in [x["note"]]} | {t["desc"] for t in raw.get("territories", [])}


def report():
    """tools/compare/report.md: the diff in a form that is easy to read through."""
    d = json.loads((OUT / "diff.json").read_text())
    L = ["# ข้อมูลเกม เทียบกับข้อมูลเว็บตอนนี้ (raw.json จาก AniiDex)", ""]

    def sec(title, rows, fmt, limit=400):
        L.extend([f"## {title} ({len(rows)})", ""])
        L.extend("- " + fmt(r) for r in rows[:limit])
        L.append("")
    sec("Aniimo ที่ไม่มีในไฟล์เกม", d["aniimo"], lambda r: f"{r['name']} — {r['issue']}")
    sec("ค่าสถานะที่ต่างกัน", d["stats"], lambda r: f"{r['slug']} {r['stat']}: เว็บ {r['site']} / เกม {r['game']}")
    sec("ชื่อไทยที่ต่างกัน", d["names_th"], lambda r: f"{r['slug']}: เว็บ {r['site']} / เกม {r['game']}")
    sec("สกิล", d["skills"], lambda r: f"{r['slug']} · {r['skill']} — {r['issue']}" + (f"\n  - เว็บ: {r['site']}\n  - เกม: {r['game']}" if "site" in r else ""))
    sec("Trait", d["traits"], lambda r: f"{r['slug']} · {r['trait']} — {r['issue']}" + (f"\n  - เว็บ: {r.get('site', '')}\n  - เกม: {r['game']}"))
    sec("ไอเท็ม", d["items"], lambda r: f"{r['name']} — {r['issue']}" + (f"\n  - เว็บ: {r['site']}\n  - เกม: {r['game']}" if "site" in r else ""))
    t = d["th"]
    L.extend([f"## คำแปลไทย (th.json {t['total']} ข้อความ)", "",
              f"- ตรงกับคำแปลทางการ: {t['same']}", f"- มีคำแปลทางการแต่ต่างกัน: {t['official_differs']}", f"- ไม่มีในเกม: {t['no_official']}", ""])
    L.extend(f"- {r['en']}\n  - เว็บ: {r['site']}\n  - เกม: {r['game']}" for r in t["samples"])
    L.append("")
    sec("Aniimo ที่มีในไฟล์เกมแต่ไม่มีบนเว็บ (หลายตัวยังไม่เปิด อย่าเผยแพร่)", d["extra_pets"], lambda r: f"{r['id']} {r['name']} ({r['th']})")
    sec("ตารางธาตุจากเกม (ตัวคูณที่ไม่ใช่ 1)", d["chart"], lambda r: f"{r['atk']} → {r['def']}: ×{r['x']}")
    (OUT / "report.md").write_text("\n".join(L))


if __name__ == "__main__":
    report()
