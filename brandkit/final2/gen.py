import json, subprocess, concurrent.futures as cf
BASE=("Refine the attached logo draft into a final, studio-grade logo. Keep its idea but perfect it. Flat vector, plain warm off-white background, centered, no mockup, no shadow, no gradient, no other text. "
"Wordmark exactly JISOAR in a refined geometric sans, custom-kerned, medium weight, moderate spacing, the A with a clear crossbar, optically aligned with the symbol. Deep navy #101A33 only. ")
P={
"G1":("../explore2/out/S07_a.png","Symbol: a solid dot and a single upward-curving arc that together read as a J. The arc's top end is cut flat (horizontal), the tail is short and sturdy (not hairline), and the dot is clearly separated from the arc by a small even gap. Balanced, calm, timeless. Symbol to the left of the wordmark."),
"G2":("../explore2/out/S07_a.png","Symbol: a solid dot and a single upward-curving arc that together read as a J. The arc's top end is cut flat, the arc has uniform sturdy thickness, the dot sits separated by a small gap at the lower left. Symbol stacked above the wordmark, centered."),
"G3":("../explore2/out/S07_a.png","App icon version: navy rounded square containing the white dot-and-arc J symbol (flat top cut, sturdy uniform arc, dot separated by a small gap), generous padding. Show the icon alone, no wordmark."),
"G4":("../explore2/out/S04_a.png","Symbol: a solid navy rounded square with one smooth rising curved channel cut through in negative space, the channel a confident even width, not a swoosh. Symbol to the left of the wordmark."),
"G5":("../explore2/out/S06_a.png","Symbol: a J built from a vertical bar and a quarter circle with a clean, slightly wider gap that stays visible at small sizes. Symbol to the left of the wordmark."),
}
def run(k):
    ref,desc=P[k]
    r=subprocess.run(["higgsfield","generate","create","gpt_image_2","--aspect_ratio","3:2","--quality","high","--resolution","2k","--image-references",ref,"--wait","--json"],input=BASE+desc,capture_output=True,text=True)
    try:
        j=json.loads(r.stdout)[0]; subprocess.run(["curl","-s",j["result_url"],"-o",f"{k}.png"]); return k,j["id"]
    except Exception: return k,"FAIL "+r.stdout[-300:]+r.stderr[-300:]
with cf.ThreadPoolExecutor(5) as ex:
    for k,v in ex.map(run,P): print(k,v,flush=True)
