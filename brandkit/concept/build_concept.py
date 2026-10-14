"""JISOAR 컨셉 워드마크: 상상(설계 윤곽) → 구현(채움)으로 떠오르는 사선. Archivo 125폭 800 기반, 사선 틈은 pathops 로 실제 절단."""
import math, pathops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
t=TTFont("archivo-wide.ttf"); gs=t.getGlyphSet(); cm=t.getBestCmap(); CAP=t['OS/2'].sCapHeight
NIGHT,SKY="#101A33","#3366E8"
KERN={0:20,3:-60}   # J-I, O-A
def poly(pts):
    p=pathops.Path(); p.moveTo(*pts[0]); [p.lineTo(*q) for q in pts[1:]]; p.close(); return p
def word(text="JISOAR"):
    paths=[]; x=0
    for i,ch in enumerate(text):
        g=gs[cm[ord(ch)]]; p=pathops.Path(); g.draw(TransformPen(p.getPen(),(1,0,0,1,x,0))); p.simplify(); paths.append(p); x+=g.width+KERN.get(i,0)
    return paths,x
def d_of(p,W,H):
    pen=SVGPathPen(None); p.draw(TransformPen(pen,(1,0,0,-1,0,H))); return pen.getCommands()
def line_y(xx,W,y0,y1): return y0+(y1-y0)*xx/W
def build(name, gap=46, y0=40, y1=640, mode="slice", split_color=False):
    paths,W=word(); H=CAP+40; pad=60
    # 사선: x=0 에서 y0, x=W 에서 y1 (폰트 좌표, 위로 +). gap = 수직 두께
    band=poly([(-200,line_y(-200,W,y0,y1)-gap/2),(W+200,line_y(W+200,W,y0,y1)-gap/2),(W+200,line_y(W+200,W,y0,y1)+gap/2),(-200,line_y(-200,W,y0,y1)+gap/2)])
    above=poly([(-200,line_y(-200,W,y0,y1)+gap/2),(W+200,line_y(W+200,W,y0,y1)+gap/2),(W+200,H+400),(-200,H+400)])
    below=poly([(-200,line_y(-200,W,y0,y1)-gap/2),(W+200,line_y(W+200,W,y0,y1)-gap/2),(W+200,-400),(-200,-400)])
    out=[]
    for i,p in enumerate(paths):
        col=SKY if (split_color and i<2) else NIGHT
        if mode=="slice":
            q=pathops.op(p,band,pathops.PathOp.DIFFERENCE); out.append(f'<path fill="{col}" d="{d_of(q,W,CAP)}"/>')
        else:  # 아래쪽 = 윤곽(상상·설계), 위쪽 = 채움(구현)
            top=pathops.op(p,above,pathops.PathOp.INTERSECTION); bot=pathops.op(p,below,pathops.PathOp.INTERSECTION)
            out.append(f'<path fill="{col}" d="{d_of(top,W,CAP)}"/>')
            out.append(f'<path fill="none" stroke="{col}" stroke-width="22" stroke-linejoin="miter" d="{d_of(bot,W,CAP)}"/>')
    open(name,"w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {W+2*pad} {CAP+2*pad+30}">{"".join(out)}</svg>')
build("c1-slice.svg", gap=34, y0=170, y1=600)
build("c2-imagine-build.svg", mode="outline", gap=30, y0=170, y1=600)
build("c3-ji-soar.svg", gap=34, y0=170, y1=600, split_color=True)
print("ok")
