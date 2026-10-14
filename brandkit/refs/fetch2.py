import json, urllib.request, urllib.parse, os, time, re
UA={"User-Agent":"jisoar-brand-research/1.0 (personal reference board; contact qkqhrnfl@icloud.com)"}
def get(url):
    for k in range(5):
        try: return urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=20).read()
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(10); continue
            raise
def api(lang,**kw):
    kw["format"]="json"; return json.loads(get(f"https://{lang}.wikipedia.org/w/api.php?"+urllib.parse.urlencode(kw)))
L=[("A 미니멀 워드마크","Stripe, Inc."),("A 미니멀 워드마크","Samsung"),("A 미니멀 워드마크","Sony"),("A 미니멀 워드마크","Google"),
   ("B 심볼+워드마크","Mastercard"),("B 심볼+워드마크","Airbnb"),("B 심볼+워드마크","Spotify"),("B 심볼+워드마크","Slack Technologies"),
   ("C 클래식·세리프","Tiffany & Co."),("C 클래식·세리프","Burberry"),("C 클래식·세리프","The New York Times"),("C 클래식·세리프","Vogue (magazine)"),
   ("D 모노그램·엠블럼","Chanel"),("D 모노그램·엠블럼","Louis Vuitton"),("D 모노그램·엠블럼","Volkswagen"),("D 모노그램·엠블럼","Yves Saint Laurent (brand)"),
   ("E 국내 IT","Toss (app)"),("E 국내 IT","Kakao"),("E 국내 IT","Baemin"),("E 국내 IT","Daangn Market")]
out=[]
for grp,t in L:
    fn=None; err=None
    try:
        w=api("en",action="parse",page=t,prop="wikitext",section=0,redirects=1)["parse"]["wikitext"]["*"]
        m=re.search(r"\|\s*logo\s*=\s*(?:\[\[)?(?:File:|Image:)?\s*([^\|\]\n]+?\.(?:svg|png|jpg))",w,re.I)
        if m:
            name=m.group(1).strip()
            ii=api("en",action="query",titles="File:"+name,prop="imageinfo",iiprop="url",iiurlwidth=600)
            p=next(iter(ii["query"]["pages"].values())); u=p["imageinfo"][0].get("thumburl") or p["imageinfo"][0]["url"]
            ext=os.path.splitext(urllib.parse.urlparse(u).path)[1]; fn=f"r{len(out):02d}{ext}"; open(fn,"wb").write(get(u))
        else: err="no logo field"
    except Exception as e: err=str(e)[:60]
    out.append((grp,t,fn,err)); print(out[-1],flush=True); time.sleep(3)
json.dump(out,open("refs.json","w"),ensure_ascii=False,indent=1)
