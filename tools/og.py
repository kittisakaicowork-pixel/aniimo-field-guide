"""Builds og.png, the 1200x630 preview image shown when the site link is shared (Facebook, LINE, X).

Run from the repository root: python3 tools/og.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
FONT = "/System/Library/Fonts/Supplemental/SukhumvitSet.ttc"  # macOS; index 4 = Bold
ART = ["emberpup", "fulmintis", "luminelle", "sparkelf"]


def font(size, index=4):
    return ImageFont.truetype(FONT, size, index=index)


def main():
    img = Image.new("RGB", (W, H))
    top, bottom = (39, 33, 58), (122, 90, 216)
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = min(1, (y / H) * 0.7 + (x / W) * 0.5)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))

    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((620, 40, 1260, 680), fill=150)
    img.paste((181, 156, 255), mask=glow.filter(ImageFilter.GaussianBlur(120)))

    pos = [(640, 250, 330), (880, 70, 300), (910, 300, 270), (660, 20, 230)]
    for name, (x, y, s) in zip(ART, pos):
        art = Image.open(ROOT / "img" / f"{name}.webp").convert("RGBA").resize((s, s), Image.LANCZOS)
        shadow = Image.new("RGBA", art.size, (20, 12, 40, 0))
        shadow.putalpha(art.getchannel("A").point(lambda a: a * 0.45).filter(ImageFilter.GaussianBlur(14)))
        img.paste(shadow, (x + 10, y + 16), shadow)
        img.paste(art, (x, y), art)

    d = ImageDraw.Draw(img)
    d.rounded_rectangle((64, 70, 318, 116), radius=23, fill=(255, 255, 255))
    d.text((88, 76), "ANIIMO FIELD GUIDE", font=font(24), fill=(122, 90, 216))
    d.text((60, 150), "Aniimo", font=font(112), fill=(255, 255, 255))
    d.text((64, 285), "คู่มือเกมภาษาไทย", font=font(60), fill=(236, 228, 255))
    lines = ["รายชื่อ Aniimo · สกิล · ร่างพิเศษ", "แผนที่ Idyll · อีเวนต์ · จัดทีม · Tier List"]
    for i, t in enumerate(lines):
        d.text((66, 395 + i * 48), t, font=font(34, 2), fill=(255, 255, 255))
    d.text((66, 540), "kittisakaicowork-pixel.github.io/aniimo-field-guide", font=font(24, 2), fill=(214, 202, 255))

    img.save(ROOT / "og.png", optimize=True)
    print("wrote og.png", (ROOT / "og.png").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
