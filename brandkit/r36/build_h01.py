"""H01(사용자 선택, 2026-10-14) 심볼 벡터 정본 + 워드마크 글꼴 비교판.
심볼 좌표는 hf/H01.jpg(1500x996) 픽셀을 그대로 옮기고 규칙으로 정리했다.
- J 줄기 x 390~455, 윗면 기울기 0.5(왼쪽이 낮음)
- 갈고리: 바깥 원 중심 (381,518) 반지름 74, 끝 윗면 수평 y=511, 속공간 왼쪽 벽 x=362, 바닥 모서리는 타원 사분원
- 파란 막대: x 474~555, 윗변 = J 윗면 사선의 연장선, 두께 49
워드마크 배치(H01 기준): 대문자 높이 107, 기준선 y=542, 줄기 오른쪽에서 78 띄움.
실행: python build_h01.py → out_h01/*.svg, board_h01.html
"""
import os
import pathops
from build_r36 import K, NIGHT, SKY, PAPER, poly, glyph_run, moved, d_of

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out_h01")
os.makedirs(OUT, exist_ok=True)

SLOPE = 0.5
STEM_L, STEM_R, STEM_TOP_R = 390, 455, 393
CX, CY, R = 381, 518, 74            # 갈고리 바깥 원
TERM_Y, SLOT_X = 511, 362           # 갈고리 끝 윗면, 속공간 왼쪽 벽
SLOT_RX, SLOT_RY = STEM_L - SLOT_X, 30
BAR_X0, BAR_X1, BAR_T = 474, 555, 49
CAP, BASE, WM_GAP = 107, 542, 78


def top_y(x):
    return STEM_TOP_R + SLOPE * (STEM_R - x)


def j_symbol():
    p = pathops.Path()
    p.moveTo(STEM_L, top_y(STEM_L))
    p.lineTo(STEM_R, STEM_TOP_R)
    p.lineTo(STEM_R, CY)
    p.cubicTo(STEM_R, CY + K * R, CX + K * R, CY + R, CX, CY + R)
    p.cubicTo(CX - K * R, CY + R, CX - R, CY + K * R, CX - R, CY)
    p.lineTo(CX - R, TERM_Y)
    p.lineTo(SLOT_X, TERM_Y)
    sy = 530                           # 속공간 타원 중심 y
    p.lineTo(SLOT_X, sy + SLOT_RY)
    p.cubicTo(SLOT_X + K * SLOT_RX, sy + SLOT_RY, STEM_L, sy + K * SLOT_RY, STEM_L, sy)
    p.close()
    bar = poly([(BAR_X0, top_y(BAR_X0)), (BAR_X1, top_y(BAR_X1)),
                (BAR_X1, top_y(BAR_X1) + BAR_T), (BAR_X0, top_y(BAR_X0) + BAR_T)])
    return p, bar


FONTS = [  # (파일, 라벨, 추가 자간[대문자 높이 비율])
    ("mont600.ttf", "Montserrat SemiBold (H01 원본과 가장 비슷)", 0.14),
    ("mont700.ttf", "Montserrat Bold", 0.13),
    ("poppins600.ttf", "Poppins SemiBold", 0.14),
    ("pjs700.ttf", "Plus Jakarta Sans Bold", 0.16),
    ("sora600.ttf", "Sora SemiBold", 0.12),
    ("manrope700.ttf", "Manrope Bold", 0.16),
    ("outfit600.ttf", "Outfit SemiBold", 0.16),
    ("urbanist700.ttf", "Urbanist Bold", 0.16),
    ("redhat700.ttf", "Red Hat Display Bold", 0.15),
    ("lexend600.ttf", "Lexend SemiBold", 0.12),
    ("figtree700.ttf", "Figtree Bold", 0.16),
    ("albert700.ttf", "Albert Sans Bold", 0.16),
    ("inter700.ttf", "Inter Display Bold", 0.16),
]


def lockup(font, track):
    j, bar = j_symbol()
    wm = glyph_run(os.path.join(HERE, font), "JISOAR", track * CAP, CAP)
    b = wm.bounds
    wm = moved(wm, STEM_R + WM_GAP - b[0], BASE)   # glyph_run 기준선 y=0
    return j, bar, wm


def svg(parts, pad=24, bg=None):
    bs = [p.bounds for p, _ in parts]
    x0, y0 = min(b[0] for b in bs) - pad, min(b[1] for b in bs) - pad
    x1, y1 = max(b[2] for b in bs) + pad, max(b[3] for b in bs) + pad
    w, h = x1 - x0, y1 - y0
    rect = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ""
    body = "".join(f'<path fill="{c}" d="{d_of(moved(p, -x0, -y0))}"/>' for p, c in parts)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}">{rect}{body}</svg>'


def icon(fg, bg, size=1000, fill=0.6, radius=0.22):
    j, bar = j_symbol()
    u = pathops.op(j, bar, pathops.PathOp.UNION).bounds
    w, h = u[2] - u[0], u[3] - u[1]
    sc = size * fill / max(w, h)
    dx, dy = (size - w * sc) / 2 - u[0] * sc, (size - h * sc) / 2 - u[1] * sc
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" rx="{size * radius:.0f}" fill="{bg}"/>'
            f'<path fill="{fg}" d="{d_of(moved(j, dx, dy, sc))}"/>'
            f'<path fill="{SKY}" d="{d_of(moved(bar, dx, dy, sc))}"/></svg>')


def write(name, text):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)
    return f"out_h01/{name}"


def main():
    j, bar = j_symbol()
    write("symbol.svg", svg([(j, NIGHT), (bar, SKY)]))
    ic = [write("icon_night.svg", icon("#FFFFFF", NIGHT)), write("icon_paper.svg", icon(NIGHT, PAPER))]
    rows = []
    for i, (font, label, track) in enumerate(FONTS, 1):
        j, bar, wm = lockup(font, track)
        key = os.path.splitext(font)[0]
        a = write(f"lockup_{key}.svg", svg([(j, NIGHT), (bar, SKY), (wm, NIGHT)]))
        d = write(f"lockup_{key}_dark.svg", svg([(j, "#FFFFFF"), (bar, SKY), (wm, "#FFFFFF")], bg=NIGHT))
        rows.append(f'<section><h2><b>F{i:02d}</b> {label}</h2><div class="row">'
                    f'<img class="big" src="{a}"><div class="side"><img src="{d}" class="dk">'
                    f'<img src="{a}" style="height:30px"><img src="{a}" style="height:18px"></div></div></section>')
    icons = "".join(f'<img src="{p}" style="width:{px}px;height:{px}px">' for p in ic for px in (96, 32, 16))
    html = f"""<!doctype html><meta charset="utf-8"><title>JISOAR 워드마크 글꼴 비교</title>
<style>body{{margin:0;padding:28px;background:#e9e7e1;font:14px/1.4 system-ui,sans-serif;color:{NIGHT}}}
h1{{font-size:20px;margin:0 0 14px}}h2{{font-size:14px;font-weight:500;margin:0 0 8px}}h2 b{{color:#c62828;margin-right:6px}}
section{{background:{PAPER};border-radius:12px;padding:14px 18px;margin:0 0 10px}}
.row{{display:grid;grid-template-columns:1.45fr 1fr;gap:20px;align-items:center}}.big{{width:100%;display:block}}
.side{{display:flex;flex-direction:column;gap:12px;align-items:flex-start}}.dk{{width:100%;border-radius:8px}}
.ref{{width:640px;border-radius:8px}}.ic{{display:flex;gap:14px;align-items:center}}</style>
<h1>JISOAR · H01 심볼 고정, 워드마크 글꼴 13종 비교</h1>
<section><h2>원본 H01 (AI 생성)</h2><img class="ref" src="hf/H01.jpg"></section>
<section><h2>심볼 벡터 정본 · 앱 아이콘 96·32·16px</h2><div class="ic"><img src="out_h01/symbol.svg" style="height:120px">{icons}</div></section>
{''.join(rows)}"""
    with open(os.path.join(HERE, "board_h01.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("ok", len(rows))


def overview():
    """13종을 2열로 한 화면에 모은 비교판(board_h01_grid.html)."""
    cells = []
    for i, (font, label, _) in enumerate(FONTS, 1):
        key = os.path.splitext(font)[0]
        cells.append(f'<figure><figcaption><b>F{i:02d}</b> {label}</figcaption>'
                     f'<img src="out_h01/lockup_{key}.svg"></figure>')
    html = f"""<!doctype html><meta charset="utf-8"><title>JISOAR 글꼴 한눈에</title>
<style>body{{margin:0;padding:24px;background:#e9e7e1;font:13px/1.4 system-ui,sans-serif;color:{NIGHT}}}
.g{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}figure{{margin:0;background:{PAPER};border-radius:10px;padding:12px 22px 18px}}
figcaption{{margin-bottom:8px}}figcaption b{{color:#c62828;margin-right:4px}}img{{width:100%;display:block}}</style>
<div class="g"><figure><figcaption><b>원본</b> H01 (AI 생성, 확대)</figcaption><img src="hf/H01_crop.jpg"></figure>{''.join(cells)}</div>"""
    with open(os.path.join(HERE, "board_h01_grid.html"), "w", encoding="utf-8") as f:
        f.write(html)


if __name__ == "__main__":
    main()
    overview()
