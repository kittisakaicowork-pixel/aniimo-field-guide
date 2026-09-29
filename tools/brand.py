"""Draw the AniiGuide brand images: app icons (icon-192.png, icon-512.png) and the link preview (og.png).

The mark is two rounded "i" pillars with a pink and a mint dot on a sky-blue tile (icon.svg is the same
drawing for browsers). Wordmark font: Nunito (SIL Open Font License, tools/fonts/). Thai text uses the
macOS Sukhumvit Set font, so run this on a Mac:  python3 tools/brand.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NUNITO = ROOT / "tools" / "fonts" / "Nunito.ttf"
THAI = "/System/Library/Fonts/Supplemental/SukhumvitSet.ttc"
NAVY = (20, 34, 58)


def nunito(size, weight=900):
    f = ImageFont.truetype(str(NUNITO), size)
    f.set_variation_by_axes([weight])
    return f


def gradient(w, h, stops, diagonal=0.35):
    """Vertical-ish gradient through (position, rgb) stops."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = min(1, max(0, y / h + (x / w - 0.5) * diagonal))
            for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
                if t <= p1:
                    k = (t - p0) / (p1 - p0) if p1 > p0 else 0
                    px[x, y] = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
                    break
    return img


def disc(size, c0, c1):
    """A glossy dot: diagonal gradient, circular alpha."""
    g = gradient(size, size, [(0, c0), (1, c1)], diagonal=1)
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    g.putalpha(m)
    return g


def sparkle(draw, cx, cy, r, fill):
    k = r * 0.28
    pts = [(cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k), (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k)]
    draw.polygon(pts, fill=fill)


def mark(size, rounded):
    """The icon at `size` px, drawn 4x and scaled down for smooth edges."""
    S = size * 4
    u = S / 512
    tile = gradient(S, S, [(0, (102, 211, 255)), (0.55, (30, 155, 235)), (1, (10, 99, 196))])
    glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(glow).ellipse((-0.1 * S, -0.25 * S, 0.7 * S, 0.45 * S), fill=110)
    tile.paste((255, 255, 255), mask=glow.filter(ImageFilter.GaussianBlur(S * 0.12)))
    d = ImageDraw.Draw(tile)
    for x in (160, 278):
        d.rounded_rectangle((x * u, 198 * u, (x + 74) * u, 416 * u), radius=37 * u, fill=(255, 255, 255))
    for cx, c0, c1 in ((197, (255, 138, 208), (255, 92, 147)), (315, (183, 251, 255), (95, 224, 216))):
        r = int(41 * u)
        tile.paste(dot := disc(2 * r, c0, c1), (int(cx * u - r), int(136 * u - r)), dot)
        d.ellipse(((cx - 24) * u, 111 * u, (cx - 2) * u, 133 * u), fill=(255, 255, 255))
    sparkle(d, 404 * u, 132 * u, 40 * u, (255, 255, 255))
    sparkle(d, 104 * u, 378 * u, 26 * u, (235, 247, 255))
    if rounded:
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=116 * u, fill=255)
        tile.putalpha(m)
    return tile.resize((size, size), Image.LANCZOS)


def wordmark(draw, img, x, y, size, color):
    """ANIIGUIDE with the two I's drawn as pillars under pink / mint dots, like the icon."""
    f = nunito(size)
    left, _, _, bottom = draw.textbbox((0, 0), "AN", font=f)
    cap_top = draw.textbbox((0, 0), "A", font=f)[1]
    draw.text((x, y), "AN", font=f, fill=color)
    cx = x + draw.textlength("AN", font=f) + size * 0.06
    w, h = size * 0.2, bottom - cap_top
    for c0, c1 in (((255, 138, 208), (255, 92, 147)), ((183, 251, 255), (95, 224, 216))):
        draw.rounded_rectangle((cx, y + cap_top + h * 0.28, cx + w, y + bottom), radius=w / 2, fill=color)
        r = int(w * 0.62)
        dot = disc(2 * r, c0, c1)
        img.paste(dot, (int(cx + w / 2 - r), int(y + cap_top - r * 0.2)), dot)
        cx += w + size * 0.1
    draw.text((cx + size * 0.02, y), "GUIDE", font=f, fill=color)
    return cx + size * 0.02 + draw.textlength("GUIDE", font=f)


def og():
    W, H = 1200, 630
    img = gradient(W, H, [(0, (236, 247, 255)), (0.6, (205, 233, 255)), (1, (160, 212, 255))], diagonal=0.6).convert("RGBA")
    haze = Image.new("L", (W, H), 0)
    ImageDraw.Draw(haze).ellipse((640, -120, 1360, 560), fill=160)
    img.paste((255, 214, 238), mask=haze.filter(ImageFilter.GaussianBlur(120)))
    hero = Image.open(ROOT / "img" / "hero.webp").convert("RGB")
    hero = hero.resize((round(hero.width * 630 / hero.height), 630), Image.LANCZOS)
    crop = hero.crop((hero.width - 620, 0, hero.width, 630))
    fade = Image.linear_gradient("L").rotate(90).resize((620, 630))  # transparent on the left, solid on the right
    fade = fade.point(lambda v: min(255, int(v * 1.6)))
    img.paste(crop, (W - 620, 0), fade)
    d = ImageDraw.Draw(img)
    icon = mark(120, rounded=True)
    img.paste(icon, (64, 70), icon)
    wordmark(d, img, 204, 88, 74, NAVY)
    th = ImageFont.truetype(THAI, 58, index=5)
    d.text((66, 250), "คู่มือเกม Aniimo", font=th, fill=NAVY)
    d.text((66, 322), "ภาษาไทย ครบในที่เดียว", font=th, fill=(10, 110, 210))
    sm = ImageFont.truetype(THAI, 30, index=2)
    for i, t in enumerate(["รายชื่อ Aniimo · แผนที่ · อีเวนต์ · จัดทีม", "Tier List · โค้ดล่าสุด · เช็กลิสต์รายวัน"]):
        d.text((68, 436 + i * 44), t, font=sm, fill=(52, 72, 104))
    d.text((68, 548), "kittisakaicowork-pixel.github.io/aniimo-field-guide", font=ImageFont.truetype(THAI, 22, index=2), fill=(90, 110, 140))
    img.convert("RGB").save(ROOT / "og.png", optimize=True)


def main():
    for s in (192, 512):
        mark(s, rounded=False).save(ROOT / f"icon-{s}.png", optimize=True)  # full tile: phones apply their own mask
    og()
    print("icon-192.png, icon-512.png, og.png")


if __name__ == "__main__":
    main()
