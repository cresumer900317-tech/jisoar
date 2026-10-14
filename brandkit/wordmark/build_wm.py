"""JISOAR 워드마크: 구글 폰트 윤곽 + 오른쪽 아래 다리 끝(A·R)을 같은 각도로 잘라 '들린 발' 처리. 결정적 SVG."""
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
NIGHT="#101A33"
def build(font, kern, cuts, lift, out, color=NIGHT, pad=60):
    t=TTFont(font); gs=t.getGlyphSet(); cm=t.getBestCmap(); cap=t['OS/2'].sCapHeight
    x=0; parts=[]; masks=[]
    for i,ch in enumerate("JISOAR"):
        g=gs[cm[ord(ch)]]; pen=SVGPathPen(gs); g.draw(TransformPen(pen,(1,0,0,-1,x,cap))); parts.append(pen.getCommands())
        if ch in cuts and lift>0:
            a,b=cuts[ch][:2]  # 다리 바닥 구간(글자 기준), 세 번째 값 'L' = 왼쪽 끝을 들어 올림(J 갈고리)
            if len(cuts[ch])>2 and cuts[ch][2]=="L":
                x0,x1=x+b+4,x+a-30
            else:
                x0,x1=x+a-4,x+b+30
            # 바닥선(y=cap) 기준: 안쪽 끝 0, 바깥 끝 lift 만큼 올라간 사선 아래를 지움
            masks.append(f'<polygon points="{x0},{cap+40} {x0},{cap} {x1},{cap-lift} {x1},{cap+40}" fill="black"/>')
        x+=g.width+kern.get(i,0)
    W=x; H=cap+40
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {W+2*pad} {cap+2*pad}">
<defs><mask id="m" maskUnits="userSpaceOnUse" x="{-pad}" y="{-pad}" width="{W+2*pad}" height="{cap+2*pad}"><rect x="{-pad}" y="{-pad}" width="{W+2*pad}" height="{cap+2*pad}" fill="white"/>{''.join(masks)}</mask></defs>
<g mask="url(#m)" fill="{color}"><path d="{' '.join(parts)}"/></g></svg>'''
    open(out,"w").write(svg)
cfg=json.loads(sys.argv[1]); build(**cfg)
