"""Ideogram 4.5 확장 탐색: 비교에서 가장 정제된 결과 → 방향 5 × (4장 묶음 × 2회) = 40장."""
import json, subprocess, os, concurrent.futures as cf
CTX=("Brand: JISOAR, an independent Korean software studio that turns what clients imagine into real working systems and apps. "
"Name: JI from 志 (will, intention) + SOAR. Precise, trustworthy, quietly confident, timeless, premium. Deep navy #101A33 on clean off-white, flat, centered, nothing else on the canvas. ")
D={
"I1":"A refined custom wordmark JISOAR in a light-to-regular geometric sans, generous but controlled spacing, with one subtle ownable detail such as a fine cut or opening in a single letter. Wordmark only.",
"I2":"A single elegant calligraphic stroke forming a J as the symbol, placed above a refined wordmark JISOAR in a classic humanist sans. Minimal and graceful.",
"I3":"A custom wordmark JISOAR where only the A carries a quiet sign of ascent, for example its crossbar subtly raised or angled; the rest classic, perfectly kerned. Wordmark only.",
"I4":"A medium-weight custom wordmark JISOAR whose J descender gently extends, giving the word a confident foundation; Swiss modernist precision. Wordmark only.",
"I5":"A refined monogram: a J inside a thin perfect circle with elegant negative space, paired with the wordmark JISOAR in a light geometric sans with wide spacing.",
}
os.makedirs("out",exist_ok=True)
def run(key):
    d,n=key.split("_")
    r=subprocess.run(["higgsfield","generate","create","ideogram_4_5","--aspect_ratio","3:2","--quality","high","--resolution","2k","--magic_prompt","off","--wait","--json"],input=CTX+D[d],capture_output=True,text=True)
    try:
        js=json.loads(r.stdout); urls=[]
        for j in js:
            urls+= [j.get("result_url")] + [x for x in (j.get("result_urls") or []) if x]
        urls=[u for u in dict.fromkeys(urls) if u]
        for i,u in enumerate(urls): subprocess.run(["curl","-s",u,"-o",f"out/{d}_{n}{i}.png"])
        return key,len(urls)
    except Exception: return key,"FAIL "+r.stdout[-300:]+r.stderr[-200:]
keys=[f"{d}_{n}" for d in D for n in "cdefgh"]
with cf.ThreadPoolExecutor(8) as ex:
    for k,res in ex.map(run,keys): print(k,res,flush=True)
