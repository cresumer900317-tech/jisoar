import json, urllib.request, urllib.parse, os
UA={"User-Agent":"jisoar-brand-research/1.0 (personal reference board)"}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=20).read()
L={"en":["Stripe, Inc.","Notion (productivity software)","Samsung","Sony","Mastercard","Airbnb","Slack (software)","Figma","Vogue (magazine)","Tiffany & Co.","Burberry","The New York Times","Chanel","Louis Vuitton","Volkswagen","Gucci"],
   "ko":["토스 (기업)","카카오","배달의민족","당근 (기업)"]}
out={}
for lang,titles in L.items():
    for t in titles:
        q=f"https://{lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&redirects=1&titles="+urllib.parse.quote(t)
        try:
            pages=json.loads(get(q))["query"]["pages"]; p=next(iter(pages.values()))
            src=p.get("original",{}).get("source")
            if src:
                fn="img_"+str(len(out))+os.path.splitext(src)[1].split("?")[0]
                open(fn,"wb").write(get(src)); out[t]=fn
            else: out[t]=None
        except Exception as e: out[t]="ERR "+str(e)[:60]
        print(t,out[t],flush=True)
json.dump(out,open("refs.json","w"),ensure_ascii=False,indent=1)
