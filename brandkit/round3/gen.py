"""사용자 선호 방향(굵은 J 심볼 + 파란 상승 획) 확장: 참고 4장 × 변형 8 = 32장."""
import json, subprocess, os, concurrent.futures as cf
REF={"R1":"../bakeoff/out/B1_gpt25.png","R2":"../bakeoff/out/B4_gpt25.png","R3":"../bakeoff/out/B3_gpt25.png","R4":"../bakeoff/out/B1_nbp.png"}
BASE=("Refine and evolve the attached logo direction for JISOAR, a Korean software studio that builds what clients imagine (JI = 志 will + SOAR). "
"Keep the energy: a bold navy J symbol with sky blue rising accent strokes. Make it more polished, balanced and ownable, studio-grade, crisp flat vector. "
"Wordmark spelled exactly JISOAR in a strong geometric sans; the letter A MUST have a horizontal crossbar (never a Λ shape). Navy #101A33 and sky blue #3366E8 only. "
"Off-white background, centered, no mockup, no shadow, no other text. ")
V=["Symbol left of wordmark.","Symbol stacked above wordmark.","Symbol left, slightly bolder symbol, tighter lockup.","Symbol above, two blue accent strokes like a rising flag.",
   "Symbol left, one single blue accent stroke, more minimal.","Show primary logo plus the symbol alone as an app icon on navy.","Symbol left, J and blue strokes integrated into one compact silhouette.","Symbol above, sharper geometric cuts, very clean."]
os.makedirs("out",exist_ok=True)
def run(key):
    r_,i=key.split("_"); i=int(i); out=f"out/{key}.png"
    if os.path.exists(out): return key,"skip"
    model=["gpt_image_2_5","--quality","medium"] if i%2==0 else ["nano_banana_pro"]
    r=subprocess.run(["higgsfield","generate","create",*model,"--aspect_ratio","3:2","--resolution","2k","--image-references",REF[r_],"--wait","--json"],input=BASE+V[i],capture_output=True,text=True)
    try:
        j=json.loads(r.stdout)[0]; subprocess.run(["curl","-s",j["result_url"],"-o",out]); return key,j["id"]
    except Exception: return key,"FAIL "+r.stdout[-200:]+r.stderr[-200:]
keys=[f"{r}_{i}" for r in REF for i in range(8)]
with cf.ThreadPoolExecutor(8) as ex:
    for k,res in ex.map(run,keys): print(k,res,flush=True)
