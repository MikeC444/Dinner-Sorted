"""Draws the Dinner Sorted app icons (logo option 2: serving dome with a tick) with Pillow.

Run:  python3 scripts/make-icons.py
Writes assets/icon.png, android-icon-foreground.png, android-icon-monochrome.png, splash-icon.png, favicon.png
"""
from PIL import Image, ImageDraw

CREAM = (251, 247, 242, 255)
PAPRIKA = (194, 65, 12, 255)
INK = (34, 27, 22, 255)
SS = 4  # supersampling for smooth edges


def draw_mark(size, bg, dome=PAPRIKA, base=INK, tick=None, scale=1.0, mono=False):
    """Draws the mark in a 120-unit grid, centred and scaled within `size`."""
    big = size * SS
    img = Image.new('RGBA', (big, big), bg)
    d = ImageDraw.Draw(img)
    u = big / 120 * scale
    off = (big - 120 * u) / 2

    def p(x, y):
        return (off + x * u, off + y * u)

    col_dome = INK if mono else dome
    col_base = INK if mono else base
    tick_col = tick if tick else bg
    # handle
    cx, cy = p(60, 34)
    r = 6 * u
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col_dome)
    # dome: half circle radius 36 centred at (60, 78)
    x0, y0 = p(24, 42)
    x1, y1 = p(96, 114)
    d.pieslice([x0, y0, x1, y1], 180, 360, fill=col_dome)
    # base plate
    bx0, by0 = p(18, 80)
    bx1, by1 = p(102, 88)
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=4 * u, fill=col_base)
    # tick
    pts = [p(50, 63), p(57, 70), p(71, 55)]
    w = int(6 * u)
    d.line(pts, fill=tick_col, width=w, joint='curve')
    for pt in (pts[0], pts[-1]):
        d.ellipse([pt[0] - w / 2, pt[1] - w / 2, pt[0] + w / 2, pt[1] + w / 2], fill=tick_col)
    return img.resize((size, size), Image.LANCZOS)


def main():
    # iOS / store icon: full-bleed cream square (the OS applies the rounded mask)
    draw_mark(1024, CREAM, scale=1.0).convert('RGB').save('assets/icon.png')
    # Android adaptive foreground: transparent, mark kept inside the 66% safe zone
    draw_mark(1024, (0, 0, 0, 0), tick=CREAM, scale=0.62).save('assets/android-icon-foreground.png')
    # Android themed (monochrome) icon
    draw_mark(1024, (0, 0, 0, 0), tick=(0, 0, 0, 0), scale=0.62, mono=True).save('assets/android-icon-monochrome.png')
    # Splash: mark on transparent, shown on the cream splash background
    draw_mark(512, (0, 0, 0, 0), tick=CREAM, scale=0.9).save('assets/splash-icon.png')
    draw_mark(48, CREAM, scale=1.0).save('assets/favicon.png')


if __name__ == '__main__':
    main()
