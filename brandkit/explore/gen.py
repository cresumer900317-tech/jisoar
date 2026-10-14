"""JISOAR 로고 대량 탐색: 방향 20 × 변형 6 = 120. GPT Image 2 medium 1k(1크레딧/장). 결과 out/Dxx_v.png, 실패는 log 에 기록."""
import json, subprocess, os, sys, concurrent.futures as cf
BASE=("Flat vector logo design presentation on plain warm off-white background, centered, logo only, no mockup, no shadows, no extra words. "
"Brand: JISOAR, a Korean independent software studio that turns what clients imagine into real working systems, web services and apps. "
"Name meaning: JI (志, will/intention) + SOAR. Navy #101A33 primary, optional accent sky blue #3366E8 used sparingly. "
"Timeless, crafted, premium, the quality of a top identity design studio, not trendy. If the wordmark appears it must be spelled exactly JISOAR. ")
D={
"D01":"Square seal monogram inspired by Korean ink seals (dojang), modernized and clean-edged: a single J carved in negative space whose hook ends rising upward; wordmark JISOAR beside it.",
"D02":"Modern square seal containing the Chinese character 志 (will) redrawn geometrically and carved in negative space; wordmark JISOAR beside it.",
"D03":"Seal-like monogram of interlocked letters J and S in a rounded square; wordmark JISOAR beside it.",
"D04":"Custom wordmark JISOAR where the J's descender extends as one long horizontal foundation line under the whole word.",
"D05":"Combination mark: an upward chevron where one stroke is a dashed construction line (the plan) and the other is solid (the built result); wordmark JISOAR beside it.",
"D06":"Symbol of three square modules ascending like steps, the first drawn as dashed outline (imagined), the last solid (built); wordmark JISOAR beside it.",
"D07":"Symbol: a small blueprint grid of squares where one square lifts upward out of the grid; wordmark JISOAR beside it.",
"D08":"A J monogram constructed from a single folded paper-like ribbon with a crisp fold, rising; wordmark JISOAR beside it.",
"D09":"Elegant monogram of J and S sharing one stroke, symmetrical and balanced, inside a circle; wordmark JISOAR beneath.",
"D10":"Custom geometric sans wordmark JISOAR where the A's crossbar is replaced by a small upward notch; everything else classic and perfectly spaced.",
"D11":"Classic engraved-style wordmark JISOAR blending serif and sans, refined stroke contrast, institutional and trustworthy.",
"D12":"Symbol: a single dot (the idea, the will) from which one precise line rises diagonally; wordmark JISOAR beside it.",
"D13":"Abstract geometric mark reinterpreting the Chinese character 志 (士 above 心) as simple modern shapes, not literal calligraphy; wordmark JISOAR beside it.",
"D14":"Circular emblem like a precise engineering stamp, containing a J and a rising line, with fine ring details but no text in the ring; wordmark JISOAR beside it.",
"D15":"Refined lowercase wordmark jisoar in a humanist sans with custom j and a gentle rising terminal on the r.",
"D16":"Wordmark JISOAR where the O is drawn as a perfect circle with faint compass construction lines around it, showing design becoming reality.",
"D17":"Bilingual lockup: wordmark JISOAR and below it the Korean name 지소어 in a matching Korean sans, clean alignment, thin rule between. Korean text must read exactly 지소어.",
"D18":"Symbol of building blocks stacking into an upward staircase that forms a subtle J; wordmark JISOAR beside it.",
"D19":"Circle symbol with a J whose negative space suggests a wing lifting; wordmark JISOAR beside it.",
"D20":"Minimal mark: a J drawn as one clean vertical stroke with a curved hook plus a single dot above (the dot representing 志, intention); wordmark JISOAR beside it.",
}
V={"a":"Navy only, medium weight.","b":"Navy with one small accent in sky blue.","c":"Heavier bold weight, strong presence.","d":"Lighter, elegant, generous letter spacing.","e":"Focus on the symbol/icon large, wordmark small.","f":"Horizontal lockup, compact and balanced for a website header."}
os.makedirs("out",exist_ok=True)
def run(key):
    d,v=key.split("_"); out=f"out/{key}.png"
    if os.path.exists(out): return key,"skip"
    prompt=BASE+"Direction: "+D[d]+" "+V[v]
    r=subprocess.run(["higgsfield","generate","create","gpt_image_2","--aspect_ratio","3:2","--quality","medium","--resolution","1k","--wait","--json"],input=prompt,capture_output=True,text=True)
    try:
        j=json.loads(r.stdout)[0]; u=j["result_url"]
        subprocess.run(["curl","-s",u,"-o",out]); return key,j["id"]
    except Exception as e: return key,"FAIL "+r.stdout[-200:]+r.stderr[-200:]
keys=[f"{d}_{v}" for d in D for v in V]
with cf.ThreadPoolExecutor(8) as ex:
    for k,res in ex.map(run,keys): print(k,res,flush=True)
