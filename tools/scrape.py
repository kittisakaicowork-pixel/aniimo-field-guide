#!/usr/bin/env python3
"""Fetch and parse Aniimo data from AniiDex into tools/raw.json.

Pages are cached under tools/cache/pages; pass --refresh to re-download them
(do this after a game update). Parsing never hits the network for cached pages.

    python3 tools/scrape.py            # parse from cache, fetch only what is missing
    python3 tools/scrape.py --refresh  # re-download every page first
    python3 tools/scrape.py --check    # only check for new redeem codes and official news
    python3 tools/scrape.py --daily    # daily job: re-download the list pages and events, plus a few of the oldest pages
"""
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

import polite

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "pages"
BASE = "https://aniidex.com"
UA = "Mozilla/5.0 (AniimoFieldGuide fan project)"
REFRESH = "--refresh" in sys.argv
DAILY = "--daily" in sys.argv
# --daily: pages that change between game updates are fetched again every day; every other page is fetched
# again once it is STALE_DAYS old, at most STALE_BUDGET a day, so the whole site turns over about every two weeks
# while AniiDex sees a small, steady load.
DAILY_PATHS = ("/aniimo/", "/aniimo/forms/", "/aniimo/sparkling/", "/bosses/", "/events/", "/sitemap-en.xml")
STALE_DAYS, STALE_BUDGET = 14, 80
_stale_left = [STALE_BUDGET]


def _due(path, dest):
    if REFRESH:
        return True
    if not DAILY:
        return False
    if path in DAILY_PATHS or path.startswith("/events/"):
        return True
    if time.time() - dest.stat().st_mtime > STALE_DAYS * 86400 and _stale_left[0] > 0:
        _stale_left[0] -= 1
        return True
    return False

ELEMENT_ALIASES = {"Electric": "Lightning", "Rock": "Earth", "Holy": "Light"}


def fetch(path, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 5000 and not _due(path, dest):
        return dest.read_text()
    url = BASE + urllib.parse.quote(path, safe="/-_.~%")
    old = dest.with_suffix(".old")
    if dest.exists():
        dest.replace(old)  # fetch again, but keep the old copy if the fetch fails
    polite.get(url, dest)  # low rate, never player profiles (the owner's terms)
    if not dest.exists() or dest.stat().st_size < 5000:
        if old.exists():
            old.replace(dest)
    elif old.exists():
        old.unlink()
    return dest.read_text() if dest.exists() else ""


def text(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def element(name):
    name = ELEMENT_ALIASES.get(name, name)
    return name.lower()


# ---------------------------------------------------------------- list page
def parse_list(page):
    out = []
    for m in re.finditer(r'<a href="/aniimo/([^/]+)/" class="character-card([^"]*)"(.*?)</a>', page, re.S):
        slug, cls, b = m.groups()
        name = html.unescape(re.search(r'class="char-name"[^>]*>([^<]+)', b).group(1).strip())
        num = re.search(r"char-num[^>]*>#(\d+)", b)
        sub = re.search(r'class="char-sub"[^>]*>(.*?)</span><span class="level-pills"', b, re.S)
        # role and stage: "DPS · Lumin" before Oct 2026, now one char-meta span each ("BREAK", "Lumin Stage")
        metas = [text(x) for x in re.findall(r'class="char-meta"[^>]*>(.*?)</span>(?=<span class="char-meta"|$)', sub.group(1), re.S)] if sub else []
        if len(metas) >= 2:
            role, stage = metas[0], re.sub(r"\s*Stage$", "", metas[1])
        else:
            role, _, stage = text(sub.group(1)).partition(" · ") if sub else ("", "", "")
        role = {"BREAK": "Break", "REGEN": "Regen", "SUPPORT": "Support", "HEAL": "Heal"}.get(role.upper(), role) if role.upper() != "DPS" else "DPS"
        head = re.search(r"images/aniimo/(UI_PetHead_\d+\.webp)", b)
        work = []
        for t in re.findall(r'class="level-pill" title="([^"]+)"', b):
            k, _, lv = t.partition(" · ")
            work.append([k, int(re.search(r"(\d+)", lv).group(1))])
        out.append(dict(slug=slug, name=name, no=num.group(1) if num else "", role=role.replace("No role", "—"),
                        stage=stage, head=head.group(1) if head else "", unreleased="is-delisted" in cls, work=work))
    return out


# ------------------------------------------------------------- detail pages
def parse_detail(page, names):
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    d = {}
    d["elements"] = [element(e) for e in re.findall(r'alt="Aniimo [^"]*? ([A-Za-z]+) element" class="tag-icon"', page)]
    m = re.search(r'class="overview-description[^"]*"[^>]*>(.*?)</p>', page, re.S)
    d["desc"] = text(m.group(1)) if m else ""
    m = re.search(r"images/aniimo/full-body-shadow/(\d+)/", page)
    d["full_id"] = m.group(1) if m else ""
    m = re.search(r"Stats HP (\d+) ATK (\d+) P\.DEF (\d+) REGEN (\d+) M\.DEF (\d+) BREAK (\d+)", t)
    d["stats"] = dict(zip(["HP", "ATK", "PDEF", "REGEN", "MDEF", "BREAK"], map(int, m.groups()))) if m else {}

    # skills: loadout order, then the matching base ability card
    skills = []
    nav = re.search(r'<nav class="ab-loadout".*?</nav>', page, re.S)
    if nav:
        for sm in re.finditer(r'href="#ability-(\d+)".*?images/skills/([^"&]+?\.webp).*?ab-loadout__name[^>]*>([^<]+)<.*?ab-loadout__kind[^>]*>([^<]+)<', nav.group(0), re.S):
            aid, icon, name, kind = sm.groups()
            card = re.search(r'<article id="ability-' + aid + r'" class="ab-card">(.*?)</article>', page, re.S)
            b = card.group(1) if card else ""
            el = re.search(r"ab-pill--element[^>]*>.*?>([A-Za-z]+)</span>", b, re.S)
            dmg = re.search(r"ab-pill--(physical|magical)", b)
            chips = {text(k): text(v) for k, v in re.findall(r'class="ab-chip"><span>(.*?)</span><b>(.*?)</b>', b)}
            det = re.search(r'ab-card__details-label">Details</span><p>(.*?)</p>', b, re.S)
            skills.append(dict(name=html.unescape(name.strip()), kind=kind.strip(), element=element(el.group(1)) if el else "",
                               dmg=dmg.group(1) if dmg else "", rare="ab-pill--rare" in b,
                               tags=[text(x) for x in re.findall(r'ab-pill--tag">(.*?)</span>', b)],
                               chips=chips, desc=text(det.group(1)) if det else "", icon=icon))
    d["skills"] = skills
    # materials that upgrade this Aniimo's skills (one entry per upgradable skill)
    d["skill_upgrades"] = [[text(n), int(re.sub(r"\D", "", c) or 0)] for n, c in re.findall(
        r'class="ab-upgrade-link__item".*?<span[^>]*>(.*?)</span><b[^>]*>(.*?)</b>', page, re.S)]

    d["traits"] = [dict(name=text(a), kind=text(b), desc=text(c)) for a, b, c in re.findall(
        r'class="ab-trait-icon" alt="[^"]*" [^>]*>.*?<h4>(.*?)</h4>.*?ab-pill--kind[^>]*>(.*?)</span>.*?Details</span><p>(.*?)</p>', page, re.S)][:3]
    d["partners"] = list(dict.fromkeys(re.findall(r'href="/aniimo/([^/"]+)/" rel="noopener noreferrer" target="_blank" class="partner-link"', page)))

    # recommended held items: name + shared passive effect
    items = []
    for im in re.finditer(r'<li class="item-row"(.*?)</li>', page, re.S):
        b = im.group(1)
        n = re.search(r'class="name-link"[^>]*>(.*?)<span', b, re.S)
        eff = re.search(r'Passive effect</h3>(.*?)</div>', b, re.S)
        if n:
            items.append(dict(name=text(n.group(1)), effect=text(eff.group(1)) if eff else ""))
    d["items"] = items

    # real evolution routes
    routes = []
    for rm in re.finditer(r'<section class="route-entry"[^>]*>(.*?)</section>', page, re.S):
        b = rm.group(1)
        ends = re.findall(r'href="/aniimo/([^/"]+)/"', re.search(r"<h4[^>]*>(.*?)</h4>", b, re.S).group(1))
        if len(ends) < 2:
            continue
        crit = [text(c) for c in re.findall(r"<li[^>]*>(.*?)</li>", b, re.S)]
        cost = [dict(item=a, n=int(n)) for a, n in re.findall(r'title="([^"·]+?) · [^"]*?(\d+) required"', b)]
        routes.append(dict(src=ends[0], dst=ends[1], criteria=crit, cost=cost))
    d["routes"] = routes

    # spawn locations and encounter conditions
    spawn = {"conditions": "", "regions": []}
    sp = re.search(r'Spawn Locations</h3>(.*?)(?:</section>\s*</div>\s*</div>|$)', page, re.S)
    if sp:
        b = sp.group(1)
        c = re.search(r'<div class="encounter-conditions"[^>]*>.*?<p class=""[^>]*>(.*?)</p>', b, re.S)
        spawn["conditions"] = text(c.group(1)) if c else ""
        for rm in re.finditer(r'<h4 class="region-name"[^>]*>(.*?)</h4>.*?region-level-badge"[^>]*>(.*?)</div>.*?<p class="region-desc"[^>]*>(.*?)</p>', b, re.S):
            spawn["regions"].append(dict(name=text(rm.group(1)), level=text(rm.group(2)).replace("Lv. ", ""), desc=text(rm.group(3))))
    d["spawn"] = spawn
    return d


# ---------------------------------------------------------------- forms page
def parse_forms(page):
    groups = {}
    for g in re.finditer(r'<section class="form-group"(.*?)</section>', page, re.S):
        b = g.group(1)
        slug = re.search(r'href="/aniimo/([^/]+)/" class="form-group-name"', b).group(1)
        forms = []
        for p in re.finditer(r'<a href="/aniimo/[^"?]+/\?form=(\d+)" class="form-poster ([^"]*)"(.*?)</a>', b, re.S):
            fid, cls, pb = p.groups()
            img = re.search(r'src="/_ipx/[^"]*?/(images/aniimo/full-body-shadow/[^"]+\.webp)"', pb)
            cap = re.search(r"poster-caption[^>]*><b[^>]*>([^<]+)", pb).group(1)
            kind = ("prismana" if "rainbow" in cls else "night" if "night" in cls else "snow" if "snow" in cls
                    else "thunder" if "thunderstorm" in cls else "rain" if ("rain" in cls and "region" not in cls) else "region")
            forms.append(dict(id=fid, kind=kind, name=html.unescape(cap),
                              elements=[element(e) for e in re.findall(r'class="poster-element"[^>]*title="([^"]+)"', pb)],
                              has_image=bool(img)))
        groups[slug] = forms
    return groups


# ------------------------------------------------------------------- bosses
def parse_bosses(page):
    out = []
    for m in re.finditer(r'<a href="/bosses/([^/]+)/" class="boss-card"(.*?)</a>', page, re.S):
        slug, b = m.groups()
        dl = re.search(r'<dl class="boss-matchups">(.*?)</dl>', b, re.S).group(1)
        weak, strong = (re.findall(r'title="([A-Za-z]+)"', part) for part in dl.split("Strong against"))
        head = re.search(r"images/aniimo/(UI_PetHead_\d+)\.webp", b)
        lvl = re.search(r"Lv\. ([\d–-]+)|Level —", text(b))
        out.append(dict(slug=slug, name=text(re.search(r"<h2>(.*?)</h2>", b).group(1)),
                        kind="Omega" if "omega" in slug else "Alpha",
                        level=lvl.group(1) if lvl and lvl.group(1) else "",
                        weak=[element(x) for x in weak], strong=[element(x) for x in strong],
                        head=head.group(1) if head else ""))
    return out


def parse_boss_detail(page):
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    d = {}
    m = re.search(r"Lv\. [\d–-]+ (?:[A-Z][\w ]+?) (.*?) Respawn Interval: ([\ds]+)", t)
    d["desc"], d["respawn"] = (m.group(1), m.group(2)) if m else ("", "")
    m = re.search(r"Element (\w+) Region (.+?) Spawn level", t)
    d["element"], d["region"] = (element(m.group(1)), m.group(2)) if m else ("", "")
    m = re.search(r"Claim cost (\d+) Primegy", t)
    d["claim"] = int(m.group(1)) if m else None
    rows = re.findall(r"(\d+) ([\d,]+) (\d+) (\d+) (\d+) (\d+) (\d+)(?= \d+ [\d,]+ | Location)", t)
    d["stats"] = [dict(zip(["lv", "HP", "ATK", "PDEF", "REGEN", "MDEF", "BREAK"], [int(x.replace(",", "")) for x in r])) for r in rows]
    fc = re.search(r"First clear (.*?) Every clear", t)
    ec = re.search(r"Every clear (?:Scales over \d+ progression steps )?(.*?) Related encounters", t)
    parse = lambda s: [x.strip() for x in s.split("›") if x.strip()] if s else []
    d["first_clear"] = parse(fc.group(1) if fc else "")
    d["every_clear"] = parse(ec.group(1) if ec else "")
    return d


# --------------------------------------------------------------- sparkling
def parse_sparkling(page, base, forms):
    """Which forms have Sparkling art: every released base form the page lists, plus Prismana forms.
    Regional/weather forms also exist in the game; build.py probes those per image."""
    head = re.sub(r"<[^>]+>", " ", page)
    head = head[:head.find("Card Size")]
    listed = [a["slug"] for a in base if re.search(r"\b" + re.escape(a["name"]) + r"\b", head)]
    return listed

# ------------------------------------------------------------------- items
def parse_item(page):
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    d = {}
    m = re.search(r'<h1[^>]*>(.*?)</h1>', page, re.S)
    d["name"] = text(m.group(1)) if m else ""
    m = re.search(r"Items / (.+?) (Common|Uncommon|Rare|Epic|Legendary|Prismatic) (.+?) " + re.escape(d["name"]) + r" (.*?) How to Obtain", t)
    if m:
        d["quality"], d["category"], d["desc"] = m.group(2), m.group(3), m.group(4)
    else:
        d["quality"] = d["category"] = d["desc"] = ""
    icon = re.search(r"images/items/(ui_item_[\w]+\.webp)", page)
    d["icon"] = icon.group(1) if icon else ""
    sources = []
    for row in re.findall(r'<div class="obtain-row"[^>]*>(.*?)(?=<div class="obtain-row"|</div>\s*</section>|$)', page, re.S):
        badge = re.search(r'type-badge[^>]*>(.*?)</span>', row, re.S)
        alt = re.search(r'class="obtain-source-icon"[^>]*alt="([^"]*)"|alt="([^"]*)"[^>]*class="obtain-source-icon"', row)
        detail = re.search(r'class="obtain-detail"[^>]*>(.*?)</span>', row, re.S)
        cost = re.findall(r'class="cost-amount"[^>]*>(.*?)</span>.*?class="cost-label"[^>]*>(.*?)</span>', row, re.S)
        where = re.search(r"<figcaption[^>]*>(.*?)</figcaption>", row, re.S)
        note = re.search(r'class="obtain-note"[^>]*>(.*?)</p>', row, re.S)
        src = dict(kind=text(badge.group(1)) if badge else (text(alt.group(1) or alt.group(2)) if alt else ""),
                   detail=text(detail.group(1)) if detail else "",
                   cost=[[text(a), text(b)] for a, b in cost], where=text(where.group(1)) if where else "",
                   note=text(note.group(1)) if note else "")
        if src["detail"] or src["kind"]:
            sources.append(src)
    d["sources"] = sources
    return d


ITEM_DESC_CUTS = [" Overview", " Stands in for", " Basic Held Item Core Enhancement", " Common Held Item Core Enhancement",
                  " Advanced Held Item Core Enhancement", " Effects CP", " Resonance Raises the resonance"]


def clean_item_desc(desc, name):
    """Drop the stat tables AniiDex appends to some descriptions."""
    for cut in ITEM_DESC_CUTS:
        desc = desc.split(cut)[0]
    desc = desc.strip()
    return "" if desc == name else desc


# ------------------------------------------------------------------ events
def parse_events_index(page):
    """AniiDex /events/ since Oct 2026: "Live Now" (Events, then Gameplay), "Upcoming" week groups and "Past",
    each a list of ev-card links. Older layout (text "Events N Gameplay N" / "Coming up" / "Past events") is
    still read when the new headings are missing."""
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    live_at, up_at, past_at = (body.find(h) for h in ("Event List: Live Now", "Upcoming Aniimo Events", "Past Aniimo Events"))
    if live_at < 0 or up_at < 0:
        return _parse_events_index_old(page)
    end = past_at if past_at > 0 else len(body)
    links = lambda part: list(dict.fromkeys(re.findall(r'href="/events/([^/"]+)/"', part)))
    live = body[live_at:up_at]
    g = live.find("<h3>Gameplay")
    events, gameplay = (links(live[:g]), links(live[g:])) if g > 0 else (links(live), [])
    upcoming, up_slugs = [], []
    for card in re.findall(r'<a href="/events/([^/"]+)/" class="ev-card(.*?)</a>', body[up_at:end], re.S):
        slug, c = card
        name = re.search(r'class="ev-card__name"[^>]*>(.*?)</b>', c, re.S)
        when = re.search(r"(\d+ [A-Z][a-z]+ – \d+ [A-Z][a-z]+)", text(c))
        if name and when:
            upcoming.append(dict(name=text(name.group(1)), dates=when.group(1)))
        up_slugs.append(slug)
    past = links(body[end:]) if past_at > 0 else []
    seen = set(events + gameplay)
    slugs = events + gameplay + [x for x in dict.fromkeys(up_slugs) if x not in seen] + [x for x in past if x not in seen and x not in up_slugs]
    return slugs, len(events), upcoming, set(past) - seen - set(up_slugs)


def _parse_events_index_old(page):
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    slugs = list(dict.fromkeys(re.findall(r'href="/events/([^/"]+)/"', page)))
    m = re.search(r"Events (\d+) Gameplay (\d+)", t)
    n_events = int(m.group(1)) if m else 0
    upcoming = [dict(name=a.strip(), dates=b) for a, b in re.findall(
        r"([A-Z][\w’'!?:,. -]+?)(?: [\d,]+)*(?: Starts in [\dhdm ]+)? (\d+ [A-Z][a-z]+ – \d+ [A-Z][a-z]+)", t[t.find("Coming up"):])]
    past_at = page.find("Past events")
    past = {m.group(1) for m in re.finditer(r'href="/events/([^/"]+)/"', page) if past_at > 0 and m.start() > past_at}
    for u in upcoming:
        u["name"] = re.sub(r"^.*?server reset\. ", "", u["name"])
    upcoming = [u for u in upcoming if not u["name"].startswith("Past events")]
    return slugs, n_events, upcoming, past


def parse_event(page):
    """Structured fields come from the page's own markup; only the date table is read from text."""
    d = {}
    h1 = re.search(r'<(h1|p) class="st-title"[^>]*>(.*?)</\1>', page, re.S)  # <h1> before Oct 2026, now <p>
    d["title"] = text(re.sub(r'<span class="st-title__game"[^>]*>.*?</span>', "", h1.group(2))) if h1 else ""
    run = re.search(r'<p class="st-run"[^>]*>(.*?)</p>', page, re.S)
    d["run"] = text(run.group(1)) if run else ""
    pill = re.search(r'class="pill pill--time"[^>]*>(.*?)</span>', page, re.S)
    pill = text(pill.group(1)) if pill else ""
    d["ends_in"] = pill.replace("Event Ending In", "").strip() if "Ending" in pill else ""
    d["starts_in"] = pill.replace("Starts in", "").strip() if "Starts in" in pill else ""
    desc = re.search(r'<p class="st-desc"[^>]*>(.*?)</p>', page, re.S)
    d["intro"] = text(desc.group(1)) if desc else ""
    box = re.search(r'<div class="st-rewards"[^>]*>(.*?)</div>\s*</div>', page, re.S)
    d["rewards"] = [[n, name] for name, n in re.findall(r'class="gcard[^"]*"[^>]*title="([^"]+?) ×([\d,]+)"', box.group(1) if box else "")]
    rules = " ".join(text(r) for r in re.findall(r'<p class="ev-rule"[^>]*>(.*?)</p>', page, re.S))
    d["rules"] = [r.strip() for r in re.split(r" (?=\d+\. )", " " + rules) if r.strip()]
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    dates_txt = t[t.find(" Dates ") + 7:t.find(" Coming up")] if " Dates " in t else ""
    dates_txt = re.sub(r"^.*?server reset\. ", "", dates_txt)
    d["dates"] = [dict(name=a.strip(), dates=b, status=c) for a, b, c in re.findall(
        r"([A-Z][\w’'!?:,. -]+?)(?: [\d,]+)? (\d+ [A-Z][a-z]+ – \d+ [A-Z][a-z]+) (Ended|Live|Next)", dates_txt)]
    return d


# ------------------------------------------------------ territories / rush
def _page_text(page):
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    return t[t.find("Sign in") + 8:t.find("Aniidex is an unofficial")]


def _rewards(seg):
    return [x.strip() for x in seg.split("›") if x.strip()]


def _matchups(page):
    """Weak/strong element dots from the info box at the end of the page."""
    i = page.rfind("Weak to")
    j = page.find("Strong against", i)
    if i < 0 or j < 0:
        return [], []
    end = page.find("</dd>", j) if page.find("</dd>", j) > 0 else len(page)
    return ([element(x) for x in re.findall(r'title="([A-Za-z]+)"', page[i:j])],
            [element(x) for x in re.findall(r'title="([A-Za-z]+)"', page[j:end])])


def parse_territory(page):
    t = _page_text(page)
    d = {}
    m = re.search(r"Territory Lv\. (\d+) (.+?) Territory (.*?) Combat stats", t)
    d["level"], d["name"], d["desc"] = (int(m.group(1)), m.group(2) + " Territory", m.group(3)) if m else (0, "", "")
    m = re.search(r"Repeat clear (.*?) Helper rewards (.*?) Rare reward \((\d+)% chance\) (.*?) Related encounters", t)
    d["repeat"], d["helper"], d["rare_chance"], d["rare"] = (_rewards(m.group(1)), _rewards(m.group(2)), int(m.group(3)), _rewards(m.group(4))) if m else ([], [], 0, [])
    m = re.search(r"Element (\w+) Standard level (\d+) Players ([\d–-]+) players", t)
    d["element"], d["players"] = (element(m.group(1)), m.group(3)) if m else ("", "")
    d["weak"], d["strong"] = _matchups(page)
    return d


def parse_boss_rush(page):
    t = _page_text(page)
    d = {}
    m = re.search(r"Boss Rush Lv\. (\d+) (.+?) \2 in Boss Rush\. (.*?) (?:Stage variants|Combat stats)", t)
    d["level"], d["name"], d["approach"] = (int(m.group(1)), m.group(2), m.group(3)) if m else (0, "", "")
    m = re.search(r"Stage variants The same boss appears .*? approach\. (.*?) Combat stats by level", t)
    d["variants"] = [v.strip() for v in re.split(r" Cycle level \d+ ?", m.group(1)) if v.strip()] if m else []
    m = re.search(r"(\d+) ([\d,]+) (\d+) (\d+) (\d+) (\d+) (\d+) Related encounters", t)
    d["stats"] = dict(zip(["lv", "HP", "ATK", "PDEF", "REGEN", "MDEF", "BREAK"], [int(x.replace(",", "")) for x in m.groups()])) if m else {}
    m = re.search(r"Element (\w+)", t)
    d["element"] = element(m.group(1)) if m else ""
    m = re.search(r"Bring Favoured (.*?)(?: Less suited (.*?))? Species", t)
    d["favoured"], d["less"] = (m.group(1).strip(), (m.group(2) or "").strip()) if m else ("", "")
    d["weak"], d["strong"] = _matchups(page)
    return d


def check_codes():
    """Compare Game8's active code list with tools/manual.json and print what changed.
    Codes are kept by hand in manual.json because rewards need a human check."""
    try:
        page = subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0 (Macintosh) Chrome/128", "https://game8.co/games/Aniimo/archives/619365"],
                              capture_output=True, text=True, timeout=60).stdout
    except Exception as e:  # network trouble should not stop a data build
        print("codes: could not reach Game8:", e)
        return
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S))
    m = re.search(r"active redeem codes: (.*?) , as of ([A-Z][a-z]+ \d+, \d{4})", t)
    if not m:
        print("codes: Game8 page layout changed; check codes by hand")
        return
    live = {c.strip(" ,") for c in re.split(r" , | and ", m.group(1).replace(", and ", " , ")) if c.strip(" ,")}
    manual = json.loads((ROOT / "manual.json").read_text())
    have = {c["code"] for c in manual["codes"] if not c["expired"]}
    new, gone = sorted(live - have), sorted(have - live)
    print(f"codes (Game8, {m.group(2)}): {len(live)} active" + (f" · NEW: {', '.join(new)}" if new else "") + (f" · no longer listed: {', '.join(gone)}" if gone else " · manual.json is up to date"))


OFFICIAL_NEWS = "https://worldx-office-api.aniimo.com/api/information/new_center_data?region=en"


def check_news():
    """List official aniimo.com announcements that are not in tools/manual.json "news_seen" yet.
    News is summarised by hand in content.js; add the id to news_seen once it is covered (or skipped)."""
    try:
        out = subprocess.run(["curl", "-sL", "-A", UA, OFFICIAL_NEWS], capture_output=True, text=True, timeout=60).stdout
        posts = {x["id"]: x for g in json.loads(out)["data"] for x in g["list"]}
    except Exception as e:  # network trouble or an API change should not stop a data build
        print("news: could not read the official news list:", e)
        return
    seen = set(json.loads((ROOT / "manual.json").read_text()).get("news_seen", []))
    new = sorted((x for i, x in posts.items() if i not in seen), key=lambda x: x["showTime"], reverse=True)
    print(f"news (aniimo.com): {len(posts)} posts" + (f" · NEW: {len(new)}" if new else " · content.js is up to date"))
    for x in new:
        title = " ".join(x["title"].split())
        print(f"  {x['showTime'][:10]}  {title}\n             https://www.aniimo.com/newslist/detail/{x['id']}")


def main():
    if "--check" in sys.argv:
        check_codes()
        check_news()
        return
    list_page = fetch("/aniimo/", CACHE / "list.html")
    base = parse_list(list_page)
    names = {a["slug"]: a["name"] for a in base}
    for i, a in enumerate(base):
        page = fetch(f"/aniimo/{a['slug']}/", CACHE / "aniimo" / f"{a['slug']}.html")
        a.update(parse_detail(page, names))
    forms = parse_forms(fetch("/aniimo/forms/", CACHE / "forms.html"))
    for a in base:
        a["forms"] = forms.get(a["slug"], [])
    sparkling = parse_sparkling(fetch("/aniimo/sparkling/", CACHE / "sparkling.html"), base, forms)
    bosses = parse_bosses(fetch("/bosses/", CACHE / "bosses.html"))
    for b in bosses:
        b.update(parse_boss_detail(fetch(f"/bosses/{b['slug']}/", CACHE / "bosses" / f"{b['slug']}.html")))
        species = b["name"].split()[-1]
        if b["desc"].startswith(species + " "):
            b["desc"] = b["desc"][len(species) + 1:]
    items = []
    index = {x["slug"]: x for x in json.loads((ROOT / "items_all.json").read_text())} if (ROOT / "items_all.json").exists() else {}
    featured = json.loads((ROOT / "items.json").read_text())
    for slug in list(dict.fromkeys(featured + list(index))):
        it = parse_item(fetch(f"/items/{slug}/", CACHE / "items" / f"{slug}.html"))
        it["slug"] = slug
        it["featured"] = slug in featured
        if slug in index:
            it["group"], it["sub"] = index[slug]["cat"], index[slug]["sub"]
        it["desc"] = clean_item_desc(it["desc"], it["name"])
        if it["name"] and it["category"]:  # pages without a record (moved or removed items) are skipped
            items.append(it)
    slugs, n_events, upcoming, past = parse_events_index(fetch("/events/", CACHE / "events.html"))
    events = []
    for i, slug in enumerate(slugs):
        ev = parse_event(fetch(f"/events/{slug}/", CACHE / "events" / f"{slug}.html"))
        kind = "ended" if slug in past else "upcoming" if ev["starts_in"] else "event" if i < n_events else "gameplay"
        ev.update(slug=slug, kind=kind)
        events.append(ev)
    art = {}  # event card pictures from the list page (home page strip)
    for slug, src in re.findall(r'<a href="/events/([^/"]+)/" class="ev-card"><img[^>]*?src="(/images/events/[^"]+)"', fetch("/events/", CACHE / "events.html")):
        art.setdefault(slug, src)
    for ev in events:
        ev["art"] = art.get(ev["slug"], "")
    manual = json.loads((ROOT / "manual.json").read_text())
    sm = fetch("/sitemap-en.xml", CACHE / "sitemap-en.xml")
    territories = []
    for slug in sorted(set(re.findall(r"aniidex.com/bosses/([a-z-]+-territory)/", sm))):
        t = parse_territory(fetch(f"/bosses/{slug}/", CACHE / "territories" / f"{slug}.html"))
        t["slug"] = slug
        territories.append(t)
    boss_rush = []
    for slug in manual.get("boss_rush", []):
        b = parse_boss_rush(fetch(f"/bosses/{slug}/", CACHE / "bossrush" / f"{slug}.html"))
        b["slug"] = slug
        boss_rush.append(b)
    raw = dict(aniimo=base, sparkling=sparkling, bosses=bosses, items=items, events=events, upcoming=upcoming,
               territories=territories, boss_rush=boss_rush, scraped_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               scraped=time.strftime("%Y-%m-%d"))
    check_codes()
    check_news()
    (ROOT / "raw.json").write_text(json.dumps(raw, ensure_ascii=False, indent=1))
    print(f"{len(base)} Aniimo, {sum(len(a['forms']) for a in base)} forms, "
          f"{sum(len(a['skills']) for a in base)} skills, {len(sparkling)} with Sparkling, {len(bosses)} bosses, "
          f"{len(items)} items, {len(events)} events")


if __name__ == "__main__":
    main()
