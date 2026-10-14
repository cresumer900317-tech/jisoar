s=lambda f:open(f).read()
rows=[("c2-imagine-build","C1 · 상상 → 구현: 사선 아래는 설계 윤곽, 위는 채워진 실물"),("c1-slice","C2 · 상승 사선 하나가 이름을 가름"),("c3-ji-soar","C3 · C2 + JI(지은의 지)만 파랑: JI + SOAR 구조")]
h='''<!doctype html><meta charset="utf-8"><title>JISOAR 컨셉 로고</title><style>body{margin:0;background:#F7F5F0;font-family:"Apple SD Gothic Neo",sans-serif;color:#101A33}
.w{max-width:1160px;margin:0 auto;padding:26px}.c{background:#fff;border:1px solid #e3e0d8;border-radius:12px;padding:22px 28px;margin-bottom:14px;display:grid;grid-template-columns:1fr 260px;gap:26px;align-items:center}
b{font-size:14px;display:block;margin-bottom:12px}svg{display:block;width:100%;height:auto}.sm{display:flex;flex-direction:column;gap:12px}
.inv{background:#101A33;border-radius:8px;padding:10px 12px}.inv path[fill="#101A33"]{fill:#fff}.inv path[stroke="#101A33"]{stroke:#fff}</style><div class="w">'''
for f,l in rows:
    v=s(f+".svg")
    h+=f'<div class="c"><div><b>{l}</b><div style="width:640px">{v}</div></div><div class="sm"><div style="width:220px">{v}</div><div style="width:120px">{v}</div><div class="inv" style="width:170px">{v}</div></div></div>'
open("concept.html","w").write(h+"</div>")
