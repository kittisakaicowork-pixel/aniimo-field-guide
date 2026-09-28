"""Pattern translations for templated game text (item sources, map markers, crafting notes).

Exact translations in th.json always win; these rules only fill strings th.json lacks, so new items
from a weekly scrape that follow a known template come out in Thai without manual work.
"""
import re

SHOP = [
    (r"the Outpost vendor \(Item Exchange\), (.+)", r"พ่อค้าด่านหน้า (แลกไอเท็ม) ที่ \1"),
    (r"the Shop \(Item Exchange\)", "ร้านค้า (แลกไอเท็ม)"),
    (r"the Shop \((.+)\)", r"ร้านค้า (\1)"),
    (r"the Shop · (.+)", r"ร้านค้า · \1"),
    (r"the Shop", "ร้านค้า"),
]


def shop(s):
    for a, b in SHOP:
        if re.fullmatch(a, s):
            return re.sub(a, b, s)
    return s


def regions(s):
    return s.replace(" and ", ", ")


RULES = [
    (r"(\d[\d,]*) (.+?) per trade at (.+)\.", lambda m: f"{m[2]} {m[1]} ชิ้นต่อการแลก 1 ครั้งที่{shop(m[3])}"),
    (r"(\d[\d,]*) (.+?) in (\d+) % of dispatch rewards\.", lambda m: f"{m[2]} {m[1]} ชิ้น พบใน {m[3]}% ของรางวัลส่ง Aniimo ออกสำรวจ"),
    (r"(\d[\d,]*) per Branch level: (\d[\d,]*) over levels (\d+)–(\d+)\.",
     lambda m: f"{m[1]} ต่อเลเวล Branch รวม {m[2]} ในเลเวล {m[3]}–{m[4]}"),
    (r"(\d[\d,]*) per Branch level, (.+): (\d[\d,]*) over levels (\d+)–(\d+)\.",
     lambda m: f"{m[1]} ต่อเลเวล Branch ({m[2].replace(' at levels ', ' ที่เลเวล ').replace(' and ', ', ')}) รวม {m[3]} ในเลเวล {m[4]}–{m[5]}"),
    (r"(\d[\d,]*) per clear in (.+) Territory\.", lambda m: f"{m[1]} ต่อการเคลียร์ดันเจี้ยน {regions(m[2])}"),
    (r"(\d[\d,]*) per purchase\.", lambda m: f"{m[1]} ต่อการซื้อ 1 ครั้ง"),
    (r"Limited offer: (\d+) purchases\.", lambda m: f"จำกัดการซื้อ {m[1]} ครั้ง"),
    (r"Always includes (\d[\d,]*) (.+)\.", lambda m: f"ได้ {m[2]} {m[1]} แน่นอน"),
    (r"(One|Two|3) of its 3 pick-one bundles includes? (\d[\d,]*) (.+)\.",
     lambda m: f"{ {'One': '1', 'Two': '2', '3': 'ทั้ง 3'}[m[1]]} ใน 3 ชุดให้เลือกมี {m[3]} {m[2]}"),
    (r"In (\d+) chests? across (.+)\.", lambda m: f"อยู่ในหีบ {m[1]} ใบ ที่ {regions(m[2])}"),
    (r"Only while a limited-time event runs: one spot in (.+)\.", lambda m: f"เฉพาะช่วงอีเวนต์จำกัดเวลา: 1 จุดที่ {m[1]}"),
    (r"Only while a limited-time event runs: (\d+) spots across (.+)\.",
     lambda m: f"เฉพาะช่วงอีเวนต์จำกัดเวลา: {m[1]} จุดที่ {regions(m[2])}"),
    (r"(.+) from today’s investigation list lives near this tracking point\. Catch the target Aniimo( at night)? to complete the investigation and earn points!",
     lambda m: f"{m[1]} ในรายการสำรวจวันนี้อาศัยอยู่แถวจุดติดตามนี้ จับ Aniimo เป้าหมาย{'ตอนกลางคืน' if m[2] else ''}ให้ได้เพื่อทำการสำรวจให้สำเร็จและรับคะแนน"),
    (r"(.+) from today’s Field Notes list can be found living near this Track point\. Catch the corresponding Aniimo to complete the Field Notes and earn score rewards!",
     lambda m: f"{m[1]} ในรายการบันทึกนิเวศวันนี้อาศัยอยู่แถวจุดติดตามนี้ จับ Aniimo ตัวนั้นเพื่อทำบันทึกให้สำเร็จและรับรางวัลคะแนน"),
    (r"Exclusive resonance material for the (.+) family\. A Dewdrop Crystal imbued with the emotions of Aniimo of the \1 family\. Some say it carries their blessings and legacy\.",
     lambda m: f"วัสดุ Resonance เฉพาะสาย {m[1]} เป็น Dewdrop Crystal ที่เปี่ยมด้วยความรู้สึกของ Aniimo สาย {m[1]} ว่ากันว่าบรรจุพรและมรดกของพวกมันไว้"),
    (r"(?:You can |Can )?(?:consume|spend|Consume|Spend|Primegy can be consumed to) ?(?:Primegy )?to Craft (.+?)(?:'s)? Dewdrop Crystals?",
     lambda m: f"ใช้ Primegy สร้าง {m[1]} Dewdrop Crystal"),
    (r"Primegy can be consumed to Craft (.+?) Dewdrop Crystal", lambda m: f"ใช้ Primegy สร้าง {m[1]} Dewdrop Crystal"),
    (r"Dewdrop Crystal that consumes Primegy to Craft (.+)", lambda m: f"ใช้ Primegy สร้าง {m[1]} Dewdrop Crystal"),
    (r"Consumes Stamina to craft (.+) Dewdrop Crystal", lambda m: f"ใช้ Stamina สร้าง {m[1]} Dewdrop Crystal"),
    (r"Use in the Outpost Hatchinators to hatch powerful Prismana Form Aniimo\. An egg containing the power of Prismana (.+)\. It is one of many Prismana eggs collected by Polaris Institute during the Prismana Flow caused by the Bloom Festival ten years ago\.",
     lambda m: f"ใช้ในเครื่องฟักไข่ที่ด่านหน้าเพื่อฟัก Aniimo ร่าง Prismana ที่แข็งแกร่ง ไข่ที่มีพลังของ Prismana {m[1]} เป็นหนึ่งในไข่ Prismana ที่ Polaris Institute เก็บรวบรวมไว้ช่วงกระแส Prismana จากเทศกาล Bloom เมื่อสิบปีก่อน"),
    (r"Use in the Outpost Hatchinators to hatch Prismana Form Aniimo with a Perfect Potential rating\. An Egg left behind by (?:a )?Prismana (.+)\. It contains vibrant life force\.",
     lambda m: f"ใช้ในเครื่องฟักไข่ที่ด่านหน้าเพื่อฟัก Aniimo ร่าง Prismana ศักยภาพ Perfect ไข่ที่ Prismana {m[1]} ทิ้งไว้ เปี่ยมด้วยพลังชีวิต"),
    (r"Hatches 1 of the following Aniimo : (.+?) \. Brimming with vibrant life, this Egg nurtures an exceptionally gifted Aniimo\. Guaranteed to hatch an Aniimo with Perfect potential\.",
     lambda m: f"ฟักได้ 1 ตัวจาก: {m[1].replace(' , or ', ', ').replace(' or ', ', ').replace(' , ', ', ')} ไข่ที่เปี่ยมด้วยพลังชีวิต ฟักได้ Aniimo ศักยภาพ Perfect แน่นอน"),
    (r"Alpha Aniimo: (.+)", r"Alpha Aniimo: \1"),
    (r"Omega Aniimo: (.+)", r"Omega Aniimo: \1"),
    (r"RV Park: (.+)", r"ที่จอด RV: \1"),
    (r"(Lumin Collection|Lumin Marking|Runaway Amber|Sanctum): (.+)", r"\1: \2"),
]


def translate(s, th):
    """Return a Thai rendering of s from th.json or a rule, else None."""
    if s in th:
        return th[s]
    m = re.fullmatch(r"(.+?)\s*\n\s*(?:Respawn|Refresh) [Ii]nterval: (\d+)(?:s| seconds)( \(spawns at night\))?", s, re.S)
    if m:
        body = translate(m.group(1), th)
        if body is not None:
            return f"{body}\nเกิดใหม่ทุก {m.group(2)} วินาที" + (" (เกิดตอนกลางคืน)" if m.group(3) else "")
        return None
    for pat, rep in RULES:
        m = re.fullmatch(pat, s, re.S)
        if m:
            return rep(m) if callable(rep) else m.expand(rep)
    return None
