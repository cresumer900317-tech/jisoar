import json, subprocess, concurrent.futures as cf
BASE=("Flat vector logo, final presentation quality, centered on plain warm off-white background #F7F5F0, logo only, no mockup, no shadows, no gradients, no extra words or taglines. "
"Brand JISOAR, a Korean independent software studio (JI = 志 will/intention + SOAR; motto: builds what clients imagine). "
"Deep navy #101A33 only. Timeless, refined, crafted by a top identity studio, not trendy. "
"Wordmark spelled exactly JISOAR in a calm well-proportioned geometric sans of medium weight, moderate letter spacing (not extremely wide), the A must have a clear horizontal crossbar (never Λ), optically kerned. ")
P={
"F1a":"Mark: a rounded-square seal (Korean dojang inspired, clean crisp edges) containing a white J in negative space; the J's hook ends in a short clear upward rise. Seal on the left, wordmark on the right, seal height equal to cap height times 1.6.",
"F1b":"Mark: a rounded-square seal (Korean dojang inspired, clean crisp edges) containing a white J in negative space; the J's hook ends in a short clear upward rise. Seal stacked above the wordmark, centered.",
"F2a":"Mark: a square seal containing the Chinese character 志 redrawn with clean geometric strokes in negative space, perfectly legible as 志, balanced inner spacing so strokes do not clump at small size. Seal on the left, wordmark on the right.",
"F2b":"Mark: a square seal containing the Chinese character 志 redrawn with clean geometric strokes in negative space, perfectly legible as 志. Seal stacked above the wordmark, centered.",
"F3a":"Mark: three squares ascending diagonally to the upper right: the first drawn with a dashed outline (imagined), the second with a solid thin outline (designed), the third a solid filled square (built). Equal sizes, precise spacing. Mark on the left, wordmark on the right.",
"F3b":"Mark: three squares ascending diagonally to the upper right: the first drawn with a dashed outline (imagined), the second with a solid thin outline (designed), the third a solid filled square (built), the filled square slightly larger. Mark stacked above the wordmark, centered.",
}
def run(k):
    r=subprocess.run(["higgsfield","generate","create","gpt_image_2","--aspect_ratio","3:2","--quality","high","--resolution","2k","--wait","--json"],input=BASE+P[k],capture_output=True,text=True)
    try:
        j=json.loads(r.stdout)[0]; subprocess.run(["curl","-s",j["result_url"],"-o",f"{k}.png"]); return k,j["id"]
    except Exception: return k,"FAIL "+r.stdout[-300:]+r.stderr[-300:]
with cf.ThreadPoolExecutor(6) as ex:
    for k,v in ex.map(run,P): print(k,v,flush=True)
