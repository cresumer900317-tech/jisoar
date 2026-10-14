"""B 구조(심볼+워드마크)·F 톤(절제) 탐색 60장. 참고 이미지 = Airbnb·Mastercard·Vercel 로고판(구조·완성도만 참고, 모양 복제 금지)."""
import json, subprocess, os, concurrent.futures as cf
REF="142c5d26-34e8-475b-962e-95705079d0d8"
BASE=("Design an original logo for JISOAR. The attached image shows famous logos ONLY as a reference for quality level and structure "
"(a simple ownable symbol paired with a meticulously crafted sans wordmark). Do NOT copy or imitate any of those symbols, shapes or letterforms. "
"JISOAR is a Korean independent software studio that builds the systems, web services and apps clients imagine (JI = 志 will + SOAR). "
"The meaning must be hidden inside a simple beautiful form, never illustrated literally. Symbol: one simple shape, recognizable at 16px, single silhouette, no tiny details. "
"Wordmark: exactly JISOAR, refined geometric sans, custom-kerned, the A has a clear crossbar, medium weight, moderate spacing. "
"Colors: deep navy #101A33, optional sky blue #3366E8 accent only. Flat vector, plain warm off-white background, centered, no mockup, no shadow, no gradient, no other text. ")
S={
"S01":"Symbol: one continuous line of even weight that draws a J and loops upward into an ascending arc, closed and balanced like a single-stroke emblem.",
"S02":"Symbol: a circle and a rounded square overlapping; the overlapping lens area is a distinct tone, meaning imagination meets system.",
"S03":"Symbol: a single solid ascending wedge with one precise notch so its negative space subtly forms a J.",
"S04":"Symbol: a solid rounded square with one rising diagonal channel cut through it in negative space.",
"S05":"Symbol: two strokes only, a short horizontal bar resting above an open upward curve, a quiet abstraction of will rising.",
"S06":"Symbol: a J built from a vertical bar and a quarter circle separated by a hairline gap, modular and engineered.",
"S07":"Symbol: a solid dot launching a single smooth arc that curves upward, the arc and dot together forming a J silhouette.",
"S08":"Symbol: a thin outline circle with a smaller solid circle emerging from its upper right edge, meaning an idea becoming real.",
"S09":"Symbol: two stacked rounded bars, the upper bar tilting upward as if taking off, both of different lengths.",
"S10":"Symbol: a bold monoline J whose hook ends in a subtle upward-pointing tip.",
}
V={"a":"Horizontal lockup, navy only.","b":"Horizontal lockup, symbol uses a touch of sky blue.","c":"Symbol stacked above wordmark, navy only.","d":"Symbol large on its own, tiny wordmark below.","e":"Horizontal lockup, slightly bolder wordmark.","f":"Horizontal lockup, lighter elegant wordmark."}
os.makedirs("out",exist_ok=True)
def run(key):
    s,v=key.split("_"); out=f"out/{key}.png"
    if os.path.exists(out): return key,"skip"
    r=subprocess.run(["higgsfield","generate","create","gpt_image_2","--aspect_ratio","3:2","--quality","medium","--resolution","1k","--image-references",REF,"--wait","--json"],input=BASE+S[s]+" "+V[v],capture_output=True,text=True)
    try:
        j=json.loads(r.stdout)[0]; subprocess.run(["curl","-s",j["result_url"],"-o",out]); return key,j["id"]
    except Exception: return key,"FAIL "+r.stdout[-200:]+r.stderr[-200:]
keys=[f"{s}_{v}" for s in S for v in V]
with cf.ThreadPoolExecutor(8) as ex:
    for k,res in ex.map(run,keys): print(k,res,flush=True)
