"""JISOAR 로고 정본 생성(마스크 없이 윤곽을 실제로 잘라 낸 단일 path SVG).
규칙: Plus Jakarta Sans 800, 간격 J+40 / O-50, J 갈고리 왼쪽 끝·A·R 오른쪽 다리 끝을 바닥선에서 같은 높이(LIFT)만큼 사선으로 들어 올림."""
import pathops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
FONT="pjs.ttf"; LIFT=90
KERN={0:40,3:-50}
CUTS={"J":(33,135,"L"),"A":(551,719,"R"),"R":(479,653,"R")}
t=TTFont(FONT); gs=t.getGlyphSet(); cm=t.getBestCmap(); CAP=t['OS/2'].sCapHeight
def poly(pts):
    p=pathops.Path(); p.moveTo(*pts[0]); [p.lineTo(*q) for q in pts[1:]]; p.close(); return p
def glyphs(text, kern):
    out=pathops.Path(); x=0
    for i,ch in enumerate(text):
        g=gs[cm[ord(ch)]]; gp=pathops.Path(); g.draw(TransformPen(gp.getPen(),(1,0,0,1,x,0)))
        gp.simplify()
        if ch in CUTS:
            a,b,side=CUTS[ch]
            x0,x1=(x+b+4,x+a-30) if side=="L" else (x+a-4,x+b+30)
            # 폰트 좌표(y 위로): 바닥선 0에서 안쪽 끝 0 → 바깥 끝 LIFT 사선 아래 제거
            gp=pathops.op(gp,poly([(x0,-60),(x0,0),(x1,LIFT),(x1,-60)]),pathops.PathOp.DIFFERENCE)
        out=pathops.op(out,gp,pathops.PathOp.UNION); x+=g.width+kern.get(i,0)
    return out, x
def svg(path, W, color, pad=0, bg=None, size=None, scale=1.0, dx=0, dy=0):
    pen=SVGPathPen(None); path.draw(TransformPen(pen,(scale,0,0,-scale,dx,dy)))
    return pen.getCommands()
def wordmark(color, name):
    p,W=glyphs("JISOAR",KERN); b=p.bounds  # (xmin,ymin,xmax,ymax)
    w=b[2]-b[0]; h=b[3]-b[1]
    d=svg(p,W,color,dx=-b[0],dy=b[3])
    open(name,"w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}"><path fill="{color}" d="{d}"/></svg>')
def icon(fg,bg,name,radius=0.22):
    p,_=glyphs("J",{}); b=p.bounds; S=1000; gh=b[3]-b[1]; sc=S*0.56/gh
    gw=(b[2]-b[0])*sc; dx=(S-gw)/2-b[0]*sc+S*0.015; dy=(S+gh*sc)/2+b[1]*sc
    d=svg(p,0,fg,scale=sc,dx=dx,dy=dy+0)
    # dy 보정: 위쪽 기준 맞춤
    dy=(S-gh*sc)/2+b[3]*sc; d=svg(p,0,fg,scale=sc,dx=dx,dy=dy)
    r=S*radius
    open(name,"w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}"><rect width="{S}" height="{S}" rx="{r:.0f}" fill="{bg}"/><path fill="{fg}" d="{d}"/></svg>')
wordmark("#101A33","jisoar-wordmark.svg"); wordmark("#FFFFFF","jisoar-wordmark-white.svg")
icon("#FFFFFF","#101A33","jisoar-icon-night.svg"); icon("#FFFFFF","#3366E8","jisoar-icon-sky.svg"); icon("#101A33","#F7F5F0","jisoar-icon-paper.svg")
print("ok")
