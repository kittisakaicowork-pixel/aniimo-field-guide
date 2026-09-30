#!/usr/bin/env python3
"""Aniimo transmog sets (only Irisalis has them so far) -> tools/sets.json and img/sets/.

Everything but the pictures comes from the game: set names and quality (pet_transmog_suit_perview_data), the four
pieces of each set (pet_transmog_suits_data), piece and colour names (pet_transmog_solt_data) and roll odds
(pet_transmog_typeset_data, one column per transmog level). The renders of each set in each colour are AniiDex's
(owner's permission, credited), fetched one at a time through polite.py and matched to colours by their alt text.

    python3 tools/sets.py
"""
import html
import json
import re
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))
import game  # noqa: E402
import polite  # noqa: E402

SIZE = "512x512"


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def norm(s):
    """Colour names differ between tables and pages in zero-width spaces, sara am spelling and spacing."""
    return game.th_norm(s).replace(" ", "")


def short(name):
    """'Floral Glow - Cherry-Blossom Afterglow' / 'Sunflare Rose · Radiant Gold' -> the colour part."""
    return re.split(r" [-·] ", name)[-1]


def main():
    raw = json.loads((TOOLS / "raw.json").read_text())
    by_name = {a["name"].lower(): a for a in raw["aniimo"]}
    slots = game.table("pet_transmog_solt_data")
    odds_all = game.table("pet_transmog_typeset_data")
    pieces_all = game.table("pet_transmog_suits_data")
    out = []
    for pid, suits in game.table("pet_transmog_suit_perview_data").items():
        pet = game.PETS.get(pid) or {}
        a = by_name.get(pet.get("name", {}).get("en", "").lower())
        if not a or a["unreleased"]:
            continue
        odds = {k: v for t in odds_all.get(pid, {}).values() if isinstance(t, dict) for k, v in t.items()}

        def piece(sid):
            s = slots[str(sid)]
            o = odds.get(str(sid)) or []
            return dict(id=sid, t=s["type"], tn=s["typename"]["th_TH"], th=game.th_norm(short(s["name"]["th_TH"])),
                        en=short(s["name"]["en"]), q=s["quality"], o=[round(x * 100, 2) for x in o] if any(o) else [])

        colours = [piece(int(k)) for k, s in slots.items() if s["type"] == 1 and s.get("petId") == int(pid) and k != "101"]
        colours.sort(key=lambda c: (c["q"], c["id"] != 117, c["id"]))
        by_colour = {norm(c["th"]): c["id"] for c in colours}

        page = TOOLS / "cache" / "pages" / "sets" / f"{a['slug']}.html"
        polite.get(f"https://aniidex.com/th/aniimo/sets/{a['slug']}/", page)
        src = page.read_text() if page.exists() else ""
        # every render: its file path and the colour named in its alt text
        renders = {}
        for tag in re.findall(r"<img[^>]+>", src):
            m = re.search(r'src="[^"]*?(/images/aniimo/outfits/[^"]+?\.webp)"', tag)
            alt = re.search(r'alt="([^"]*)"', tag)
            if m and alt and "-off." in m.group(1):
                renders[m.group(1)] = html.unescape(alt.group(1)).split(" · ")[-1]

        sets = []
        for k in sorted(suits, key=int):
            su = suits[k]
            en, th = su["name"]["en"], game.th_norm(su["name"]["th_TH"])
            folder = f"/images/aniimo/outfits/{pid}/{slug(en)}/"
            imgs = {}
            for f, colour in sorted(renders.items()):
                cid = by_colour.get(norm(colour))
                if not f.startswith(folder) or not cid:
                    continue
                dest = ROOT / "img" / "sets" / slug(en) / f"{cid}.webp"
                if polite.get(f"https://aniidex.com/_ipx/q_90&s_{SIZE}{f}", dest):
                    imgs[cid] = str(dest.relative_to(ROOT))
            bust = next(iter(re.findall(rf"{re.escape(folder)}bust\.[0-9a-f]+\.webp", src)), "")
            bdest = ROOT / "img" / "sets" / slug(en) / "bust.webp"
            bust = str(bdest.relative_to(ROOT)) if bust and polite.get(f"https://aniidex.com/_ipx/q_90&s_160x160{bust}", bdest) else ""
            ids = pieces_all.get(pid, {}).get(k, [])
            sets.append(dict(k=slug(en), en=en, th=th, q=su.get("quality"), base=bool(su.get("isHide")), bust=bust,
                             pieces=[piece(i) for i in ids], imgs=imgs))
        sets.sort(key=lambda s: (-s["q"], s["k"]))
        base = game.table("pet_transmog_base_data")
        cost = game.ITEMS.get(str(base["need_item_id"])) or game.ITEMS.get(base["need_item_id"]) or {}
        rule = dict(item=[game.th_norm(cost.get("name", {}).get("th_TH", "")), cost.get("name", {}).get("en", "")],
                    lock=[base["cost_lock"][str(i)] for i in range(len(base["cost_lock"]))], max=base["lock_max_num"])
        out.append(dict(slug=a["slug"], colours=colours, sets=sets, rule=rule))
    (TOOLS / "sets.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    for x in out:
        print(x["slug"], len(x["sets"]), "sets,", len(x["colours"]), "colours,",
              sum(len(s["imgs"]) for s in x["sets"]), "renders")


if __name__ == "__main__":
    main()
