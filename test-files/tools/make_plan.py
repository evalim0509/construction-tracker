"""Sample blueprint for testing: Klang Warehouse, A3 landscape, 1:200, two pages (ground floor, level 1 office)."""
import sys
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black

OUT = sys.argv[1]
W, H = landscape(A3)
X0, YT = 95 * mm, 200 * mm          # top-left corner of the building on the sheet
K = 5 * mm                          # 1 m = 5 mm at 1:200
P = lambda x, y: (X0 + x * K, YT - y * K)   # plan metres (x right, y down) -> page points

INK = HexColor("#1E2A33"); GRID = HexColor("#8C98A1"); DIM = HexColor("#3D4A54")
WATER = HexColor("#2F5FC4"); FIRE = HexColor("#C0392B"); DRAIN = HexColor("#7A4FB5")
XS = [0, 8, 16, 24, 32, 40, 48]; YS = [0, 8, 16, 24]; LET = "ABCDEFG"


def grid(c):
    c.setStrokeColor(GRID); c.setLineWidth(0.4); c.setDash([6, 2, 1, 2])
    for i, x in enumerate(XS):
        c.line(*P(x, -5), *P(x, 29))
    for j, y in enumerate(YS):
        c.line(*P(-5, y), *P(53, y))
    c.setDash([])
    c.setFont("Helvetica", 9)
    for i, x in enumerate(XS):
        cx, cy = P(x, -7); c.setFillColor(white); c.circle(cx, cy, 4.2 * mm, fill=1); c.setFillColor(INK); c.drawCentredString(cx, cy - 3, LET[i])
    for j, y in enumerate(YS):
        cx, cy = P(-7, y); c.setFillColor(white); c.circle(cx, cy, 4.2 * mm, fill=1); c.setFillColor(INK); c.drawCentredString(cx, cy - 3, str(j + 1))


def wall(c, x1, y1, x2, y2, t=0.23):
    """a wall as a filled band (t metres thick) with hatching, like a blockwork wall on a plan"""
    import math
    ax, ay = P(x1, y1); bx, by = P(x2, y2)
    dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy); nx, ny = -dy / L * t * K / 2, dx / L * t * K / 2
    pth = c.beginPath(); pth.moveTo(ax + nx, ay + ny); pth.lineTo(bx + nx, by + ny); pth.lineTo(bx - nx, by - ny); pth.lineTo(ax - nx, ay - ny); pth.close()
    c.setFillColor(HexColor("#D9DEE2")); c.setStrokeColor(INK); c.setLineWidth(0.9); c.drawPath(pth, fill=1, stroke=1)
    c.saveState(); c.clipPath(pth, stroke=0, fill=0); c.setStrokeColor(HexColor("#7D8A94")); c.setLineWidth(0.3)
    n = int(L / 3) + 6
    for k in range(-3, n):
        px, py = ax + dx * k / n * 1.0, ay + dy * k / n * 1.0
        c.line(px - 6, py - 6, px + 6, py + 6)
    c.restoreState()


def opening(c, x1, y1, x2, y2):
    ax, ay = P(x1, y1); bx, by = P(x2, y2)
    c.setStrokeColor(white); c.setLineWidth(4.2); c.line(ax, ay, bx, by)


def door(c, x, y, w, horizontal=True, flip=1):
    opening(c, x, y, x + w, y) if horizontal else opening(c, x, y, x, y + w)
    c.setStrokeColor(DIM); c.setLineWidth(0.5)
    ax, ay = P(x, y)
    if horizontal:
        c.line(ax, ay, ax, ay + flip * w * K); c.arc(ax - w * K, ay - w * K, ax + w * K, ay + w * K, 0 if flip > 0 else 270, 90)
    else:
        c.line(ax, ay, ax + flip * w * K, ay); c.arc(ax - w * K, ay - w * K, ax + w * K, ay + w * K, 270 if flip > 0 else 180, 90)


def shutter(c, x, y, w, label):
    opening(c, x, y, x + w, y)
    ax, ay = P(x, y); bx, _ = P(x + w, y)
    c.setStrokeColor(DIM); c.setLineWidth(0.5); c.setDash([3, 2]); c.line(ax, ay + 1.2 * mm, bx, ay + 1.2 * mm); c.setDash([])
    c.setFont("Helvetica", 6.5); c.setFillColor(DIM); c.drawCentredString((ax + bx) / 2, ay - 4 * mm, label)


def column(c, x, y):
    cx, cy = P(x, y); s = 0.45 * K
    c.setFillColor(INK); c.rect(cx - s / 2, cy - s / 2, s, s, fill=1, stroke=0)


def dim_h(c, xs, y, labels=True):
    c.setStrokeColor(DIM); c.setLineWidth(0.4); c.setFont("Helvetica", 7.5); c.setFillColor(DIM)
    ax, ay = P(xs[0], y); bx, _ = P(xs[-1], y); c.line(ax, ay, bx, ay)
    for x in xs:
        px, py = P(x, y); c.line(px - 1.5, py - 1.5, px + 1.5, py + 1.5); c.line(px, py - 2.5 * mm, px, py + 2.5 * mm)
    if labels:
        for a, b in zip(xs, xs[1:]):
            px, py = P((a + b) / 2, y); c.drawCentredString(px, py + 1.5 * mm, "{:,}".format(int((b - a) * 1000)).replace(",", " "))


def dim_v(c, ys, x):
    c.setStrokeColor(DIM); c.setLineWidth(0.4); c.setFont("Helvetica", 7.5); c.setFillColor(DIM)
    ax, ay = P(x, ys[0]); _, by = P(x, ys[-1]); c.line(ax, ay, ax, by)
    for y in ys:
        px, py = P(x, y); c.line(px - 1.5, py - 1.5, px + 1.5, py + 1.5); c.line(px - 2.5 * mm, py, px + 2.5 * mm, py)
    for a, b in zip(ys, ys[1:]):
        px, py = P(x, (a + b) / 2); c.saveState(); c.translate(px - 1.5 * mm, py); c.rotate(90); c.drawCentredString(0, 0, "{:,}".format(int((b - a) * 1000)).replace(",", " ")); c.restoreState()


def pipe(c, pts, col, label, at):
    c.setStrokeColor(col); c.setLineWidth(1.1); c.setDash([7, 3])
    pth = c.beginPath(); pth.moveTo(*P(*pts[0]))
    for q in pts[1:]: pth.lineTo(*P(*q))
    c.drawPath(pth, stroke=1, fill=0); c.setDash([])
    c.setFont("Helvetica-Bold", 6.5); c.setFillColor(col); c.drawString(*P(*at), label)


def label(c, x, y, text, size=10, bold=False):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size); c.setFillColor(DIM); c.drawCentredString(*P(x, y), text)


def title(c, sheet, name, no):
    c.setStrokeColor(INK); c.setLineWidth(1.2); c.rect(10 * mm, 10 * mm, W - 20 * mm, H - 20 * mm)
    bx, by, bw, bh = W - 140 * mm, 10 * mm, 130 * mm, 42 * mm
    c.setLineWidth(0.8); c.rect(bx, by, bw, bh)
    c.line(bx, by + 28 * mm, bx + bw, by + 28 * mm); c.line(bx, by + 14 * mm, bx + bw, by + 14 * mm); c.line(bx + 85 * mm, by, bx + 85 * mm, by + 14 * mm)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 12); c.drawString(bx + 4 * mm, by + 33 * mm, "GCL BUILDERS SDN BHD")
    c.setFont("Helvetica", 8); c.drawString(bx + 4 * mm, by + 30 * mm - 1, "")
    c.setFont("Helvetica-Bold", 10); c.drawString(bx + 4 * mm, by + 19 * mm, "KLANG WAREHOUSE  ·  Pulau Indah, Klang")
    c.setFont("Helvetica", 9); c.drawString(bx + 4 * mm, by + 5 * mm, name)
    c.drawString(bx + 88 * mm, by + 8 * mm, "SCALE 1:200 @ A3"); c.drawString(bx + 88 * mm, by + 3.5 * mm, "DWG A-10" + str(no) + "   REV B")
    c.setFont("Helvetica", 7); c.setFillColor(DIM)
    c.drawString(14 * mm, 14 * mm, "SAMPLE DRAWING FOR TESTING SITEBOOK ONLY. NOT FOR CONSTRUCTION. All dimensions in millimetres.")
    # scale bar
    sx, sy = 14 * mm, 22 * mm
    for i in range(5):
        c.setFillColor(INK if i % 2 == 0 else white); c.rect(sx + i * 2 * K, sy, 2 * K, 1.6 * mm, fill=1, stroke=1)
    c.setFillColor(INK); c.setFont("Helvetica", 7); c.drawString(sx, sy + 3 * mm, "0"); c.drawString(sx + 10 * K - 2 * mm, sy + 3 * mm, "10 m")
    # north arrow
    nx, ny = 30 * mm, 60 * mm
    c.setFillColor(INK); pth = c.beginPath(); pth.moveTo(nx, ny + 9 * mm); pth.lineTo(nx - 3.5 * mm, ny - 3 * mm); pth.lineTo(nx, ny); pth.close(); c.drawPath(pth, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 10); c.drawCentredString(nx, ny + 11 * mm, "N")
    c.setFont("Helvetica-Bold", 14); c.drawString(14 * mm, H - 22 * mm, sheet)


c = canvas.Canvas(OUT, pagesize=landscape(A3))
c.setTitle("Klang Warehouse - floor plans (sample for SiteBook testing)")

# ---------- page 1: ground floor ----------
title(c, "GROUND FLOOR PLAN", "GROUND FLOOR PLAN", 1)
grid(c)
for (x1, y1, x2, y2) in [(0, 0, 48, 0), (48, 0, 48, 24), (48, 24, 0, 24), (0, 24, 0, 0),      # outer walls W1-W4
                         (0, 16, 16, 16), (16, 16, 16, 24), (8, 16, 8, 24),                   # office W5, W6, toilets partition W7
                         (40, 0, 40, 8), (40, 8, 48, 8)]:                                      # store W8, W9
    wall(c, x1, y1, x2, y2)
for x in XS:
    for y in YS:
        if y in (0, 24) or x in (0, 48):
            column(c, x, y)
shutter(c, 22, 24, 6, "ROLLER SHUTTER 6000 x 5000"); shutter(c, 32, 24, 6, "ROLLER SHUTTER 6000 x 5000")
door(c, 12, 24, 1.0, True, 1); door(c, 3, 16, 0.9, True, -1); door(c, 10, 16, 0.9, True, -1); door(c, 16, 19, 1.0, False, 1); door(c, 43, 8, 1.0, True, 1)
pipe(c, [(47, 22.5), (17, 22.5), (17, 17.2)], WATER, "CW 50mm COLD WATER MAIN", (30, 21.7))
pipe(c, [(1.2, 1.2), (46.8, 1.2)], FIRE, "FIRE MAIN 100mm", (20, 2.4))
pipe(c, [(4, 22), (4, 27.5)], DRAIN, "SANITARY 100mm", (4.6, 27))
label(c, 28, 10, "WAREHOUSE / STORAGE", 16, True); label(c, 28, 12.5, "1 120 m²", 9)
label(c, 12, 20.4, "OFFICE", 10, True); label(c, 4, 20.4, "TOILETS", 9, True); label(c, 44, 4.4, "STORE", 9, True)
label(c, 28, 26.6, "LOADING APRON", 9)
dim_h(c, XS, -11); dim_h(c, [0, 48], -14); dim_v(c, YS, -11); dim_v(c, [0, 24], -14)
c.setFont("Helvetica-Bold", 7); c.setFillColor(DIM)
c.drawString(*P(54, 8), "WALLS: 230 mm"); c.drawString(*P(54, 9.2), "blockwork, plastered,"); c.drawString(*P(54, 10.4), "painted both sides")
c.showPage()

# ---------- page 2: level 1 office mezzanine (same position, so the floors line up) ----------
title(c, "LEVEL 1 PLAN (OFFICE MEZZANINE, +4.000)", "LEVEL 1 PLAN (OFFICE MEZZANINE)", 2)
grid(c)
c.setStrokeColor(HexColor("#B8C1C8")); c.setLineWidth(0.6); c.setDash([4, 3]); c.rect(*P(0, 24), 48 * K, 24 * K); c.setDash([])
label(c, 30, 12, "OPEN TO WAREHOUSE BELOW", 11)
for (x1, y1, x2, y2) in [(0, 16, 16, 16), (16, 16, 16, 24), (16, 24, 0, 24), (0, 24, 0, 16), (10, 16, 10, 24)]:
    wall(c, x1, y1, x2, y2)
door(c, 10, 18.5, 0.9, False, 1)
label(c, 5, 20.4, "MEETING", 9, True); label(c, 13, 20.4, "MANAGER", 9, True)
for x in (0, 8, 16):
    for y in (16, 24):
        column(c, x, y)
dim_h(c, [0, 8, 16], 27.5); dim_v(c, [16, 24], -11)
c.showPage()
c.save()
print("pdf written")
