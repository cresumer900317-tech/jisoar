"""모델 비교: 같은 브리프 4개 × 모델 4개(Ideogram 4.5·GPT Image 2.5·Nano Banana Pro·FLUX 3)."""
import json, subprocess, os, concurrent.futures as cf
CTX=("Brand: JISOAR, an independent Korean software studio that turns what clients imagine into real working systems, web services and apps. "
"Name: JI from 志 (will, intention) + SOAR. Personality: precise, trustworthy, quietly confident, timeless. Colors: deep navy #101A33, optional sky blue #3366E8 accent. ")
B={
"B1":"You are a world-class identity designer at a top studio. Design the single best logo for this brand: an original simple symbol plus the wordmark JISOAR, both meticulously crafted. Present it centered on a clean off-white background, flat, nothing else.",
"B2":"You are a world-class type designer. Create a custom wordmark JISOAR with one subtle, ownable letterform detail that rewards a second look, perfect kerning and proportions, timeless like the best corporate wordmarks. Centered on clean off-white, flat, nothing else.",
"B3":"Design an abstract minimal symbol derived from the letter J that quietly suggests intention and ascent, geometric, balanced, memorable at 16px, paired with a refined wordmark JISOAR. Centered on clean off-white, flat, nothing else.",
"B4":"Create a brand identity sheet for JISOAR on an off-white background: primary logo (symbol + wordmark), the symbol alone as an app icon, and the logo reversed on navy. Studio-quality, minimal, perfectly aligned, no other text.",
}
M={
"ideo":["ideogram_4_5","--aspect_ratio","3:2","--quality","high","--resolution","2k","--magic_prompt","off"],
"gpt25":["gpt_image_2_5","--aspect_ratio","3:2","--quality","high","--resolution","2k"],
"nbp":["nano_banana_pro","--aspect_ratio","3:2","--resolution","2k"],
"flux":["flux_3_image","--aspect_ratio","3:2","--resolution","2k"],
}
os.makedirs("out",exist_ok=True)
def run(key):
    b,m=key.split("_"); out=f"out/{key}.png"
    if os.path.exists(out): return key,"skip"
    r=subprocess.run(["higgsfield","generate","create",*M[m],"--wait","--json"],input=CTX+B[b],capture_output=True,text=True)
    try:
        j=json.loads(r.stdout)[0]; subprocess.run(["curl","-s",j["result_url"],"-o",out]); return key,j["id"]
    except Exception: return key,"FAIL "+r.stdout[-300:]+r.stderr[-300:]
keys=[f"{b}_{m}" for b in B for m in M]
with cf.ThreadPoolExecutor(8) as ex:
    for k,res in ex.map(run,keys): print(k,res,flush=True)
