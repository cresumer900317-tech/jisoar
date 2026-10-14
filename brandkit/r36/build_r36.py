"""R3_6 방향 벡터 정본 시안 (home, 2026-10-14).
R3_6 = 남색 J(윗면 사선 컷) + 위 오른쪽 파란 사선 막대 + 넓은 자간 워드마크.
도형은 전부 좌표로 정의하고, 워드마크는 OFL 글꼴(Montserrat·Plus Jakarta Sans) 윤곽을 path 로 변환한다.
글꼴 ttf 는 .gitignore(*.ttf) 대상이라 커밋되지 않는다. 같은 폴더에 mont600.ttf 등을 두고 실행.
실행: python build_r36.py  →  out/*.svg, board.html
"""
import os
import pathops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

NIGHT, SKY, PAPER = "#101A33", "#3366E8", "#F7F5F0"
K = 0.5522847498  # 사분원 베지어 계수
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def poly(pts):
    p = pathops.Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    p.close()
    return p


def j_shape(s=200, r=60, slope=0.5, top=0, foot=1.0):
    """y 아래 방향 좌표. 줄기 x∈[0,s], 바닥 y=1000.
    r: 갈고리 안쪽 반지름(속공간). 갈고리 두께 = 줄기 두께 s.
    foot: 갈고리 왼쪽 끝 길이 비율(1=반원 끝까지, 작을수록 짧게 잘림)."""
    R = r + s
    cx, cy = -r, 1000 - R          # 원 중심: 안쪽 원의 오른쪽 끝이 줄기 왼쪽(x=0)
    p = pathops.Path()
    p.moveTo(0, top + slope * s)   # 윗면 사선: 왼쪽이 낮고 오른쪽이 높다
    p.lineTo(s, top)
    p.lineTo(s, cy)
    p.cubicTo(s, cy + K * R, cx + K * R, 1000, cx, 1000)            # 바깥 아래 오른쪽 사분원
    p.cubicTo(cx - K * R, 1000, cx - R, cy + K * R, cx - R, cy)      # 바깥 아래 왼쪽 사분원
    p.lineTo(cx - r, cy)                                             # 갈고리 끝 윗면(수평)
    p.cubicTo(cx - r, cy + K * r, cx - K * r, cy + r, cx, cy + r)    # 안쪽 사분원
    p.cubicTo(cx + K * r, cy + r, 0, cy + K * r, 0, cy)
    p.close()
    if foot < 1.0:
        # 갈고리 왼쪽 끝을 수직으로 잘라 발을 줄인다
        cut_x = cx - R + (1 - foot) * R
        p = pathops.op(p, poly([(cx - R - 10, cy - 10), (cut_x, cy - 10), (cut_x, 1010), (cx - R - 10, 1010)]),
                       pathops.PathOp.DIFFERENCE)
    return p


def bar(x0, w, y_top_left, t, slope=0.5):
    """세로 변이 수직인 평행사변형. 윗변 기울기 = J 윗면과 같음."""
    return poly([(x0, y_top_left), (x0 + w, y_top_left - slope * w),
                 (x0 + w, y_top_left - slope * w + t), (x0, y_top_left + t)])


def glyph_run(font, text, track, size_cap, cuts=None):
    """글꼴 윤곽을 y 아래 좌표 path 로. 대문자 높이를 size_cap 으로 맞추고, 기준선 y=0.
    cuts: {글자: [(x0, y0, x1, y1), ...]} 글꼴 단위 사각형을 그 글자에서 잘라 낸다."""
    t = TTFont(font)
    gs, cm = t.getGlyphSet(), t.getBestCmap()
    cap = t["OS/2"].sCapHeight
    sc = size_cap / cap
    out, x = pathops.Path(), 0.0
    for ch in text:
        g = gs[cm[ord(ch)]]
        raw = pathops.Path()
        g.draw(raw.getPen())
        for x0, y0, x1, y1 in (cuts or {}).get(ch, []):
            raw = pathops.op(raw, poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]), pathops.PathOp.DIFFERENCE)
        gp = pathops.Path()
        raw.draw(TransformPen(gp.getPen(), (sc, 0, 0, -sc, x, 0)))
        out = pathops.op(out, gp, pathops.PathOp.UNION)
        x += g.width * sc + track
    return out


def moved(p, dx, dy, s=1.0):
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), (s, 0, 0, s, dx, dy)))
    return q


def d_of(p):
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    p.draw(pen)
    return pen.getCommands()


def svg(parts, pad=40, bg=None):
    """parts: [(path, color)]"""
    xs = [p.bounds for p, _ in parts]
    x0 = min(b[0] for b in xs) - pad
    y0 = min(b[1] for b in xs) - pad
    x1 = max(b[2] for b in xs) + pad
    y1 = max(b[3] for b in xs) + pad
    w, h = x1 - x0, y1 - y0
    body = "".join(f'<path fill="{c}" d="{d_of(moved(p, -x0, -y0))}"/>' for p, c in parts)
    rect = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}">{rect}{body}</svg>'


# ---- 변형 정의 -------------------------------------------------------------
# 심볼: J 높이 1000(바닥 y=1000, 줄기 윗면 오른쪽 y=0 부근). 막대는 J 윗면 사선과 평행.
SYMBOLS = {
    # R3_6 원안에 가깝게: 막대가 줄기 오른쪽 위로 떨어져 떠 있음
    "S1": dict(j=dict(s=210, r=55, top=120, foot=1.0), bar=dict(gap=50, w=280, dy=-150, t=150)),
    # 막대 아래변이 J 윗면 사선의 연장선 위에 정확히 올라탐(한 획이 떨어져 나가 오르는 느낌)
    "S2": dict(j=dict(s=210, r=55, top=120, foot=1.0), bar=dict(gap=50, w=280, dy="on", t=150)),
    # S2 + 갈고리 발 짧게 + 막대 조금 짧고 두껍게(16px 대비)
    "S3": dict(j=dict(s=220, r=50, top=120, foot=0.72), bar=dict(gap=55, w=250, dy="on", t=170)),
}


def symbol(spec):
    js = spec["j"]
    j = j_shape(s=js["s"], r=js["r"], top=js["top"], foot=js["foot"])
    b = spec["bar"]
    x0 = js["s"] + b["gap"]
    j_top_at_x0 = js["top"] - 0.5 * (x0 - js["s"])   # J 윗면 사선을 막대 왼쪽까지 연장한 높이
    y_top = j_top_at_x0 - b["t"] if b["dy"] == "on" else j_top_at_x0 + b["dy"]
    return j, bar(x0, b["w"], y_top, b["t"])


WORDMARKS = {
    "M600": ("mont600.ttf", 95),
    "M700": ("mont700.ttf", 85),
    "P700": ("pjs700.ttf", 95),
}


def lockup(sym_key, wm_key, cap=400, gap=150):
    j, b = symbol(SYMBOLS[sym_key])
    font, track_em = WORDMARKS[wm_key]
    track = track_em / 1000 * cap * 1000 / 700  # 대문자 높이 기준 비례
    wm = glyph_run(os.path.join(HERE, font), "JISOAR", track, cap)
    sb = pathops.op(j, b, pathops.PathOp.UNION).bounds
    wb = wm.bounds
    # 워드마크 세로 중심 = J 줄기 몸통(윗면~갈고리 시작) 아래쪽 2/3 지점에 맞춤 (R3_6 배치)
    target_mid = (SYMBOLS[sym_key]["j"]["top"] + 1000) / 2 + 60
    dy = target_mid - (wb[1] + wb[3]) / 2
    dx = sb[2] + gap - wb[0]
    return j, b, moved(wm, dx, dy)


def icon(sym_key, fg_j, fg_b, bg, size=1000, fill=0.62, radius=0.22):
    j, b = symbol(SYMBOLS[sym_key])
    u = pathops.op(j, b, pathops.PathOp.UNION).bounds
    w, h = u[2] - u[0], u[3] - u[1]
    sc = size * fill / max(w, h)
    dx = (size - w * sc) / 2 - u[0] * sc
    dy = (size - h * sc) / 2 - u[1] * sc
    jj, bb = moved(j, dx, dy, sc), moved(b, dx, dy, sc)
    r = size * radius
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" rx="{r:.0f}" fill="{bg}"/>'
            f'<path fill="{fg_j}" d="{d_of(jj)}"/><path fill="{fg_b}" d="{d_of(bb)}"/></svg>')


def write(name, text):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)
    return name


def main():
    cards = []
    for sk in SYMBOLS:
        for wk in WORDMARKS:
            j, b, wm = lockup(sk, wk)
            n = write(f"lockup_{sk}_{wk}.svg", svg([(j, NIGHT), (b, SKY), (wm, NIGHT)]))
            nd = write(f"lockup_{sk}_{wk}_dark.svg", svg([(j, "#FFFFFF"), (b, SKY), (wm, "#FFFFFF")], bg=NIGHT))
            cards.append((sk, wk, n, nd))
        write(f"icon_{sk}_night.svg", icon(sk, "#FFFFFF", SKY, NIGHT))
        write(f"icon_{sk}_paper.svg", icon(sk, NIGHT, SKY, PAPER))
        write(f"icon_{sk}_mono.svg", icon(sk, "#FFFFFF", "#FFFFFF", SKY))

    rows = []
    for sk, wk, n, nd in cards:
        rows.append(f'<section><h2>{sk} · {wk}</h2><div class="pair"><img class="lk" src="out/{n}">'
                    f'<img class="lk" src="out/{nd}"></div>'
                    f'<div class="sm"><img src="out/{n}" style="height:28px"><img src="out/{n}" style="height:18px"></div></section>')
    icons = []
    for sk in SYMBOLS:
        cells = "".join(f'<img src="out/icon_{sk}_{v}.svg" style="width:{px}px;height:{px}px">'
                        for v in ("night", "paper", "mono") for px in (96, 32, 16))
        icons.append(f'<section><h2>{sk} 아이콘 96·32·16px</h2><div class="ic">{cells}</div></section>')
    html = f"""<!doctype html><meta charset="utf-8"><title>JISOAR R3_6 정본 시안</title>
<style>body{{margin:0;padding:32px;background:{PAPER};font:14px/1.4 system-ui,sans-serif;color:{NIGHT}}}
h1{{font-size:20px;margin:0 0 16px}}h2{{font-size:13px;margin:0 0 8px;opacity:.7}}
section{{background:#fff;border-radius:12px;padding:16px;margin:0 0 14px}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}.lk{{width:100%;display:block;background:{PAPER};border-radius:8px}}
.sm{{display:flex;gap:28px;align-items:center;margin-top:10px}}.ic{{display:flex;gap:14px;align-items:center;flex-wrap:wrap}}
.ref{{width:520px;border-radius:8px}}</style>
<h1>JISOAR · R3_6 방향 벡터 시안 (S=심볼, M=Montserrat, P=Plus Jakarta Sans)</h1>
<section><h2>원본 R3_6 (AI 생성)</h2><img class="ref" src="../handoff/round3/R3_6.jpg"></section>
{''.join(rows)}{''.join(icons)}"""
    with open(os.path.join(HERE, "board.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("ok", len(cards), "lockups")


if __name__ == "__main__":
    main()
