"""JISOAR 로고 정본 (2026-10-14 사용자 확정: H01 원본 그대로).
심볼 = build_h01.j_symbol(), 워드마크 = Montserrat Bold, 자간은 원본 H01 의 글자 전체 폭(660/대문자 107)에 맞춤.
출력: ../final-h01/*.svg + preview.html
"""
import os
import pathops
from build_r36 import NIGHT, SKY, PAPER, glyph_run, moved, d_of
from build_h01 import j_symbol, CAP, BASE, STEM_R, WM_GAP

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "final-h01")
os.makedirs(OUT, exist_ok=True)
FONT, TRACK = "mont700.ttf", 14.7      # 대문자 107 기준 추가 자간(원본 폭 660 에 맞춘 값)
# 원본 H01 의 J 는 윗부분 왼쪽 가로획이 없는 세로획. Montserrat J 의 가로획(x<303, y 570~700)을 잘라 낸다
CUTS = {"J": [(-60, 569, 303, 760)]}
WHITE = "#FFFFFF"


def parts():
    j, bar = j_symbol()
    wm = glyph_run(os.path.join(HERE, FONT), "JISOAR", TRACK, CAP, CUTS)
    wm = moved(wm, STEM_R + WM_GAP - wm.bounds[0], BASE)
    return j, bar, wm


def svg(layers, pad, bg=None, title="JISOAR"):
    bs = [p.bounds for p, _ in layers]
    x0, y0 = min(b[0] for b in bs) - pad, min(b[1] for b in bs) - pad
    x1, y1 = max(b[2] for b in bs) + pad, max(b[3] for b in bs) + pad
    w, h = x1 - x0, y1 - y0
    rect = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ""
    body = "".join(f'<path fill="{c}" d="{d_of(moved(p, -x0, -y0))}"/>' for p, c in layers)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" role="img">'
            f'<title>{title}</title>{rect}{body}</svg>')


def icon(fg, bg, bar_color=SKY, size=512, fill=0.62, radius=0.22, bar_shift=0):
    """bar_shift: 작은 크기용. 파란 막대를 사선 연장선을 따라 오른쪽으로 밀어 J 와의 틈을 넓힌다."""
    j, bar = j_symbol()
    if bar_shift:
        bar = moved(bar, bar_shift, -0.5 * bar_shift)
    u = pathops.op(j, bar, pathops.PathOp.UNION).bounds
    w, h = u[2] - u[0], u[3] - u[1]
    sc = size * fill / max(w, h)
    dx, dy = (size - w * sc) / 2 - u[0] * sc, (size - h * sc) / 2 - u[1] * sc
    rx = f' rx="{size * radius:.0f}"' if radius else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img"><title>JISOAR</title>'
            f'<rect width="{size}" height="{size}"{rx} fill="{bg}"/>'
            f'<path fill="{fg}" d="{d_of(moved(j, dx, dy, sc))}"/>'
            f'<path fill="{bar_color}" d="{d_of(moved(bar, dx, dy, sc))}"/></svg>')


FILES = {}


def write(name, text, note):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)
    FILES[name] = note


def main():
    j, bar, wm = parts()
    pad = 20  # 여백은 쓰는 쪽에서 준다. 파일 자체 여백은 최소
    write("jisoar-logo.svg", svg([(j, NIGHT), (bar, SKY), (wm, NIGHT)], pad), "기본 로고 (밝은 바탕)")
    write("jisoar-logo-dark.svg", svg([(j, WHITE), (bar, SKY), (wm, WHITE)], pad), "어두운 바탕용 (투명 배경)")
    write("jisoar-logo-navy.svg", svg([(j, NIGHT), (bar, NIGHT), (wm, NIGHT)], pad), "단색 남색 (도장·팩스·1도 인쇄)")
    write("jisoar-logo-white.svg", svg([(j, WHITE), (bar, WHITE), (wm, WHITE)], pad), "단색 흰색 (사진 위)")
    write("jisoar-symbol.svg", svg([(j, NIGHT), (bar, SKY)], pad), "심볼만")
    write("jisoar-symbol-white.svg", svg([(j, WHITE), (bar, SKY)], pad), "심볼만, 어두운 바탕용")
    write("jisoar-wordmark.svg", svg([(wm, NIGHT)], pad), "글자만")
    write("jisoar-icon-night.svg", icon(WHITE, NIGHT), "앱 아이콘 (남색)")
    write("jisoar-icon-paper.svg", icon(NIGHT, PAPER), "앱 아이콘 (밝은)")
    write("favicon.svg", icon(WHITE, NIGHT, fill=0.74, radius=0.18, bar_shift=16), "파비콘 (16~32px용, 막대 틈 넓힘)")

    cards = []
    for name, note in FILES.items():
        dark = "dark" in name or "white" in name
        cards.append(f'<figure class="{"dk" if dark else ""}"><img src="{name}"><figcaption>{name} · {note}</figcaption></figure>')
    sizes = "".join(f'<img src="favicon.svg" style="width:{px}px;height:{px}px">' for px in (16, 24, 32, 48, 64, 128))
    html = f"""<!doctype html><meta charset="utf-8"><title>JISOAR 로고 정본</title>
<style>body{{margin:0;padding:28px;background:#e9e7e1;font:13px/1.4 system-ui,sans-serif;color:{NIGHT}}}
h1{{font-size:20px;margin:0 0 4px}}p{{margin:0 0 16px;opacity:.75}}
.g{{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}}figure{{margin:0;background:{PAPER};border-radius:10px;padding:26px;display:flex;flex-direction:column;gap:14px}}
figure.dk{{background:{NIGHT};color:#fff}}figure img{{max-height:120px;max-width:100%;align-self:center}}figcaption{{opacity:.7}}
.row{{background:{PAPER};border-radius:10px;padding:20px;margin:10px 0;display:flex;gap:22px;align-items:center;flex-wrap:wrap}}</style>
<h1>JISOAR 로고 정본 (H01 원본 · Montserrat Bold)</h1>
<p>색 Night {NIGHT} · Sky {SKY} · 바탕 Dawn Paper {PAPER}. 심볼 규칙: 파란 막대 윗변 = J 윗면 사선(기울기 1:2)의 연장선.</p>
<div class="row"><b>파비콘 크기별</b>{sizes}</div>
<div class="row"><b>작게 쓴 로고</b><img src="jisoar-logo.svg" style="height:40px"><img src="jisoar-logo.svg" style="height:28px"><img src="jisoar-logo.svg" style="height:20px"></div>
<div class="g">{''.join(cards)}</div>"""
    with open(os.path.join(OUT, "preview.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("ok", len(FILES))


if __name__ == "__main__":
    main()
