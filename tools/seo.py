"""Build crawlable pages for search engines and link previews.

The site itself is one page that switches views with #hash links, so search engines only ever see the
home page. This writes a small real page for every Aniimo (a/<slug>/), every news post (p/news/<id>/)
and the main topics (p/<topic>/), each with its own title, description, preview image and text,
plus sitemap.xml. Every page links into the full guide.

    python3 tools/seo.py          # run after build.py / content changes
"""
import html
import json
import re
import shutil
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://kittisakaicowork-pixel.github.io/aniimo-field-guide/"
TODAY = date.today().isoformat()
E = html.escape

ELEM = {"fire": "ไฟ", "water": "น้ำ", "grass": "พืช", "lightning": "สายฟ้า", "ice": "น้ำแข็ง", "earth": "ดิน",
        "wind": "ลม", "light": "แสง", "dark": "มืด"}
ECOL = {"fire": "#E0613E", "water": "#3B7BD6", "grass": "#4A9E5C", "lightning": "#D09C12", "ice": "#34A9C2",
        "earth": "#A2724A", "wind": "#3FAE93", "light": "#C9A12A", "dark": "#7457B5"}
SLOT = {"atk": "โจมตีปกติ", "s1": "สกิล 1", "s2": "สกิล 2", "s3": "สกิล 3", "s4": "สกิล 4", "ult": "อัลติเมต"}
WORK = {"Hauling": "ขนของ", "Artisanship": "งานช่าง", "Leisure": "สันทนาการ", "Perfumery": "ทำน้ำหอม"}
STAT = [("HP", "HP"), ("ATK", "ATK"), ("PDEF", "P.DEF"), ("MDEF", "M.DEF"), ("REGEN", "REGEN"), ("BREAK", "BREAK")]

# topic pages: (path, title, description, #view in the guide)
TOPICS = [
    ("dex", "รายชื่อ Aniimo ทุกตัว ภาษาไทย", "รายชื่อ Aniimo ทุกตัวพร้อมชื่อไทย ธาตุ ค่าสถานะ สกิล สายวิวัฒนาการ และจุดเกิด", "dex"),
    ("tier", "Tier List Aniimo อันดับความแรงล่าสุด", "จัดอันดับ Aniimo ที่แรงที่สุดในเวอร์ชันล่าสุด S A B C D พร้อมโหวตจากผู้เล่น", "tier"),
    ("codes", "โค้ด Aniimo ล่าสุด ใช้ได้วันนี้", "โค้ดแลกของ Aniimo ที่ยังใช้ได้ พร้อมรางวัล Glimmer Aniipod และวิธีแลกโค้ด", "codes"),
    ("map", "แผนที่ Aniimo ทวีป Idyll แบบโต้ตอบ", "แผนที่ Idyll หีบ ไข่ วัตถุดิบ บอส Alpha Omega ดวล Pathfinder และ Sanctum กว่า 4,334 จุด", "map"),
    ("events", "อีเวนต์ Aniimo ตอนนี้และที่กำลังจะมา", "อีเวนต์ Aniimo ที่เปิดอยู่ ตารางอีเวนต์ล่วงหน้า และนับถอยหลังตามเวลาไทย", "events"),
    ("beginner", "คู่มือมือใหม่ Aniimo สิ่งที่ต้องรู้ก่อนเล่น", "ตัวเลือกที่ย้อนไม่ได้ เช็กลิสต์ช่วงแรก ควรทำและไม่ควรทำ สำหรับผู้เล่น Aniimo มือใหม่", "beginner"),
    ("daily", "เช็กลิสต์รายวัน Aniimo งานที่ต้องทำทุกวัน", "งานรายวันและรายสัปดาห์ของ Aniimo เวลารีเซ็ต 03:00 น. เวลาไทย ติ๊กได้และซิงก์ข้ามเครื่อง", "daily"),
    ("team", "จัดทีม Aniimo วิเคราะห์จุดแข็งจุดอ่อน", "เครื่องมือจัดทีม Aniimo ดูธาตุที่แพ้ทาง สีสกิล และแชร์ทีมเป็นลิงก์", "team"),
    ("heist", "Operation: Egg Heist คู่มือและแผนที่ Lost Isles", "วิธีเล่น Egg Heist ทุกระดับความยาก เงื่อนไขหนี แผนที่ Lost Isles และห้อง Lost Sanctum ทุกแบบ", "heist"),
    ("eggs", "จุดเกิดไข่ Aniimo และชนิดไข่ทั้งหมด", "ไข่ที่วางอยู่ในทวีป Idyll แยกตามภูมิภาค ชนิดไข่ทุกแบบ และวิธีฟักไข่", "eggs"),
    ("helditems", "Held Item และ Rune Aniimo ผลและตัวที่เหมาะ", "Held Item ทุกชิ้น ผล ตัวที่แนะนำให้ถือ และวิธีหา รวมถึง Rune ทุกค่าพลัง", "helditems"),
    ("homeland", "Homeland Aniimo ตัวไหนเหมาะกับงานไหน", "รายชื่อ Aniimo ตามงานในบ้าน ขนของ งานช่าง งานธาตุ เรียงตามเลเวลงาน", "homeland"),
    ("whisperwake", "Whisperwake Isles พื้นที่ใหม่ Aniimo", "Whisperwake Isles เปิด 29 ต.ค. 2026 Aniimo ใหม่ 10 ชนิด และธาตุที่ควรเตรียม", "whisperwake"),
    ("bosses", "บอส Alpha และ Omega Aniimo จุดอ่อนและตัวที่ควรใช้", "บอส Alpha และ Omega ทุกตัว ธาตุที่แพ้ทาง และ Aniimo ที่ควรใช้สู้", "bosses"),
    ("guide", "ข้อมูลเกม Aniimo สเปก ปุ่มควบคุม และมือถือ", "ข้อมูลเกม Aniimo สเปกคอมและมือถือ ปุ่มควบคุม PC PS5 Xbox การตั้งค่าที่แนะนำ", "guide"),
]

CSS = """:root{--bg:#EEF7FF;--card:#FFFFFF;--ink:#172238;--ink2:#56678A;--line:#D3E5F4;--accent:#0A84D6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 "IBM Plex Sans Thai","Noto Sans Thai",system-ui,sans-serif}h1,h2,header a{font-family:"Nunito","Mitr",system-ui,sans-serif}
a{color:var(--accent)}main{max-width:880px;margin:0 auto;padding:20px 16px 60px}header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
header a{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font-weight:700}header img{width:32px;height:32px;border-radius:8px}
h1{font-size:2rem;line-height:1.2;margin:.4em 0 .2em}h2{font-size:1.2rem;margin:1.6em 0 .5em}.muted{color:var(--ink2)}
.hero{display:grid;grid-template-columns:260px 1fr;gap:20px;align-items:center}.hero img{width:100%;height:auto;aspect-ratio:1;object-fit:contain;border-radius:20px;background:radial-gradient(circle,#dff1ff,#b9ddfa)}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{display:inline-block;padding:2px 10px;border-radius:999px;background:var(--card);border:1px solid var(--line);font-size:.85rem}
table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin:10px 0}
.cta{display:inline-block;margin:18px 0;padding:12px 22px;border-radius:999px;background:linear-gradient(135deg,#34B4FF,#0A84D6 55%,#0A63C4);color:#fff;font-weight:700;text-decoration:none}
ul.grid{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}ul.grid a{display:block;padding:8px 10px;background:var(--card);border:1px solid var(--line);border-radius:12px;text-decoration:none;color:var(--ink)}
footer{max-width:880px;margin:0 auto;padding:20px 16px;color:var(--ink2);font-size:.85rem}
@media (max-width:640px){.hero{grid-template-columns:1fr}.hero img{max-width:240px}}"""


def dump():
    code = """
    global.window={};require('./data.js');require('./content.js');const w=window;
    process.stdout.write(JSON.stringify({A:w.ANIIMO,SK:w.SKILLS,EVO:w.EVO,CODES:w.CODES,TH:w.TH,NTH:w.NAMES_TH,NEWS:w.NEWS,
      WW:w.WHISPERWAKE,UP:w.UPCOMING,EVENTS:w.EVENTS,ITEMS:w.ITEMS&&w.ITEMS.list,META:w.META}))"""
    return json.loads(subprocess.run(["node", "-e", code], cwd=ROOT, check=True, capture_output=True, text=True).stdout)


def tiers():
    src = (ROOT / "index.html").read_text()
    block = src[src.index("const T={"):src.index("};", src.index("const T={"))]
    out = {}
    for t, names in re.findall(r"([SABCD]):\[([^\]]*)\]", block):
        for n in re.findall(r"'([^']+)'", names):
            out.setdefault(n.lower(), t)
    return out


def page(path, title, desc, body, image=None, jsonld=None, prefix="../../"):
    url = SITE + path
    img = image or SITE + "og.png"
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ""
    doc = f"""<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}"><link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="AniiGuide"><meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{img}">
<meta property="og:locale" content="th_TH"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#1E9BEB">
<link rel="icon" href="{prefix}icon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@900&family=Mitr:wght@500&display=swap">{ld}<style>{CSS}</style></head><body>
<header><a href="{prefix}"><img src="{prefix}icon.svg" alt="">AniiGuide</a></header>
<main>{body}</main>
<footer>คู่มือเกม Aniimo ภาษาไทย (แฟนเมด ไม่เกี่ยวข้องกับ Pawprint Studio) · ข้อมูลเกมใช้โดยได้รับอนุญาตจาก AniiDex · <a href="{prefix}">เปิดคู่มือเต็ม</a></footer>
</body></html>"""
    out = ROOT / path / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc)
    return url


def main():
    d = dump()
    th, nth, tier = d["TH"], d["NTH"], tiers()
    t = lambda s: th.get(s, s) if s else ""
    A = d["A"]
    by = {a["slug"]: a for a in A}
    name = lambda a: f'{nth[a["slug"]]} ({a["name"]})' if nth.get(a["slug"]) else a["name"]
    short = lambda a: nth.get(a["slug"]) or a["name"]
    for old in ("a", "p"):
        shutil.rmtree(ROOT / old, ignore_errors=True)
    urls = [SITE]

    # one page per Aniimo
    for a in A:
        slug, released = a["slug"], not a.get("u")
        els = " / ".join(ELEM.get(e, e) for e in a["e"])
        desc_th = t(a["d"])
        stats = "".join(f"<tr><th>{lab}</th><td>{a['s'].get(k, '—')}</td></tr>" for k, lab in STAT)
        skills = "".join(
            f"<tr><td>{E(SLOT.get(s[1], s[1]))}</td><td><b>{E(s[0])}</b> <span class='chip' style='border-color:{ECOL.get(s[2], '#555')}'>{E(ELEM.get(s[2], s[2] or '—'))}</span><br><span class='muted'>{E(t(s[9]))}</span></td></tr>"
            for s in (d["SK"].get(slug) or {}).get("s", []))
        evo = [(x, y, c) for x, y, c, _ in d["EVO"] if slug in (x, y) and x in by and y in by]
        evo_html = "".join(f"<li><a href='../{x}/'>{E(short(by[x]))}</a> → <a href='../{y}/'>{E(short(by[y]))}</a> <span class='muted'>({E(', '.join(t(z) for z in c))})</span></li>" for x, y, c in evo)
        spawns = (a.get("sp") or {}).get("r") or []
        where = "".join(f"<li>{E(r)} <span class='muted'>Lv. {E(lv)}</span></li>" for r, lv in spawns)
        held = "".join(f"<li><b>{E(n)}</b> <span class='muted'>{E(t(x))}</span></li>" for n, x in a.get("it") or [])
        work = ", ".join(f"{WORK.get(k) or 'งานธาตุ' + ELEM.get(k.lower(), k)} Lv.{lv}" for k, lv in a.get("w") or [])
        same = [b for b in A if b is not a and not b.get("u") and set(b["e"]) & set(a["e"])][:12]
        title = f"{name(a)} Aniimo — ธาตุ{els} สกิล ค่าสถานะ วิวัฒนาการ"
        desc = f"{short(a)} (#{a['no']}) Aniimo ธาตุ{els} บทบาท {a['r']} ระดับ {a['st']}. {desc_th[:120]}"
        tr_ = tier.get(a["name"].lower())
        body = f"""<p class="muted"><a href="../../p/dex/">รายชื่อ Aniimo</a> › #{E(a['no'])}</p>
<div class="hero"><img src="../../{E(a['i'])}" alt="{E(a['name'])}" width="512" height="512">
<div><h1>{E(name(a))}</h1><div class="chips"><span class="chip">#{E(a['no'])}</span><span class="chip">ธาตุ{E(els)}</span><span class="chip">{E(a['st'])}</span><span class="chip">{E(a['r'])}</span>{f"<span class='chip'>Tier {tr_}</span>" if tr_ else ''}{'' if released else "<span class='chip'>ยังไม่เปิดให้จับ</span>"}</div>
<p>{E(desc_th)}</p><a class="cta" href="../../#{slug}">ดูรายละเอียดเต็ม ร่างพิเศษ และร่างเปล่งประกาย</a></div></div>
<h2>ค่าสถานะพื้นฐาน</h2><table>{stats}</table>
{f'<h2>สกิล</h2><table>{skills}</table>' if skills else ''}
{f'<h2>สายวิวัฒนาการ</h2><ul>{evo_html}</ul>' if evo_html else ''}
{f'<h2>จุดเกิด</h2><ul>{where}</ul>' if where else ''}
{f'<h2>Held Item ที่แนะนำ</h2><ul>{held}</ul>' if held else ''}
{f'<h2>งานใน Homeland</h2><p>{E(work)}</p>' if work else ''}
{f'<h2>Aniimo ธาตุเดียวกัน</h2><ul class="grid">' + ''.join(f"<li><a href='../{b['slug']}/'>{E(short(b))}</a></li>" for b in same) + '</ul>' if same else ''}"""
        ld = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "inLanguage": "th",
              "about": {"@type": "Thing", "name": a["name"], "alternateName": nth.get(slug)},
              "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
                  {"@type": "ListItem", "position": 1, "name": "AniiGuide", "item": SITE},
                  {"@type": "ListItem", "position": 2, "name": "รายชื่อ Aniimo", "item": SITE + "p/dex/"},
                  {"@type": "ListItem", "position": 3, "name": short(a), "item": SITE + f"a/{slug}/"}]}}
        urls.append(page(f"a/{slug}/", title, desc, body, SITE + a["i"], ld))

    # news posts
    for n in d["NEWS"]:
        secs = "".join(f"<h2>{E(s['h'])}</h2><ul>" + "".join(f"<li>{E(i)}</li>" for i in s["items"]) + "</ul>" for s in n["sections"])
        body = f"""<p class="muted"><a href="../">ข่าว Aniimo</a> › {E(n['date'])}</p><h1>{E(n['title'])}</h1><p><b>{E(n['lede'])}</b></p>{secs}
<p class="muted">ที่มา: <a href="{E(n['source'])}" rel="noopener">{E(n['source'])}</a></p><a class="cta" href="../../../#news-{E(n['id'])}">อ่านในคู่มือเต็ม</a>"""
        ld = {"@context": "https://schema.org", "@type": "NewsArticle", "headline": n["title"], "datePublished": n["date"],
              "inLanguage": "th", "description": n["lede"], "publisher": {"@type": "Organization", "name": "AniiGuide"}}
        urls.append(page(f"p/news/{n['id']}/", f"{n['title']} | ข่าว Aniimo", n["lede"], body, None, ld, "../../../"))
    body = "<h1>ข่าวและแพตช์โน้ต Aniimo</h1><p class='muted'>สรุปข่าวทางการเป็นภาษาไทย</p><ul>" + "".join(
        f"<li><a href='{n['id']}/'>{E(n['title'])}</a> <span class='muted'>{E(n['date'])}</span></li>" for n in d["NEWS"]) + "</ul><a class='cta' href='../../#news'>เปิดหน้าข่าวในคู่มือ</a>"
    urls.append(page("p/news/", "ข่าว Aniimo ล่าสุด อัปเดตและแพตช์โน้ตภาษาไทย", "สรุปข่าว Aniimo อัปเดต แพตช์โน้ต และประกาศทางการเป็นภาษาไทย", body))

    # topic pages with real lists where the data has them
    released = [a for a in A if not a.get("u")]
    extra = {
        "dex": "<ul class='grid'>" + "".join(f"<li><a href='../../a/{a['slug']}/'>#{a['no']} {E(short(a))}</a></li>" for a in released) + "</ul>",
        "codes": "<table>" + "".join(f"<tr><td><code>{E(c['code'])}</code></td><td>{E(c['reward'])}</td></tr>" for c in d["CODES"]["codes"] if not c["expired"]) + "</table>"
                 + f"<p class='muted'>เช็กล่าสุด {E(d['CODES'].get('codes_checked', ''))} · แลกโค้ดที่ Settings → Account → Gift Code Redemption</p>",
        "tier": "".join(f"<h2>Tier {k}</h2><ul class='grid'>" + "".join(f"<li><a href='../../a/{a['slug']}/'>{E(short(a))}</a></li>" for a in released if tier.get(a['name'].lower()) == k) + "</ul>" for k in "SABCD"),
        "whisperwake": "<ul class='grid'>" + "".join(f"<li><a href='../../a/{s}/'>{E(by[s]['name'])}</a></li>" for s in (d["WW"] or {}).get("slugs", []) if s in by) + "</ul>"
                       + "".join(f"<p>{E(x)}</p>" for x in (d["WW"] or {}).get("confirmed", [])),
        "events": "<ul>" + "".join(f"<li>{E(u['name'])} <span class='muted'>{E(u['dates'])}</span></li>" for u in d["UP"] or []) + "</ul>",
        "helditems": "<ul>" + "".join(f"<li><b>{E(i['n'])}</b> <span class='muted'>{E(i['q'])}</span></li>" for i in d["ITEMS"] if i["c"] == "Held Item") + "</ul>",
    }
    for key, title, desc, view in TOPICS:
        body = f"<h1>{E(title)}</h1><p>{E(desc)}</p><a class='cta' href='../../#{view}'>เปิดหน้านี้ในคู่มือ</a>{extra.get(key, '')}"
        urls.append(page(f"p/{key}/", title + " | AniiGuide", desc, body))

    sm = "".join(f"<url><loc>{u}</loc><lastmod>{TODAY}</lastmod></url>" for u in urls)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>\n')
    # robots.txt only counts at the domain root, which this project site does not own; submit the sitemap
    # in Google Search Console instead
    print(f"{len(urls)} pages · sitemap.xml")


if __name__ == "__main__":
    main()
