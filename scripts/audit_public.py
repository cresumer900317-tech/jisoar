"""Run with python scripts/audit_public.py before changing public pages."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ['', 'about', 'work', 'services', 'contact', 'products/friends',
          'products/wedding', 'products/guild-lounge', 'products/hq']
EXPECTED = ['/about/', '/work/', '/services/', '/contact/']

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids=[]; self.urls=[]; self.navs={}; self.nav=None; self.h1=0
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='h1': self.h1+=1
        if 'id' in a: self.ids.append(a['id'])
        if tag=='nav':
            self.nav=a.get('aria-label'); self.navs[self.nav]=[]
        if tag=='a' and self.nav: self.navs[self.nav].append(a.get('href'))
        for key in ('href','src','data-src'):
            if a.get(key,'').startswith('/'): self.urls.append(a[key])
    def handle_endtag(self, tag):
        if tag=='nav': self.nav=None

def main():
    errors=[]
    for route in ROUTES:
        path=ROOT/route/'index.html'; page=Page(path.read_text(encoding='utf-8'))
        for label in ('주요 메뉴','하단 메뉴'):
            if page.navs.get(label)!=EXPECTED: errors.append(f'{route}: inconsistent {label}')
        if page.h1!=1: errors.append(f'{route}: expected one H1')
        if len(page.ids)!=len(set(page.ids)): errors.append(f'{route}: duplicate IDs')
        for url in page.urls:
            parsed=urlsplit(url); target=ROOT/unquote(parsed.path.lstrip('/'))
            if target.is_dir(): target=target/'index.html'
            if not target.exists(): errors.append(f'{route}: missing {url}')
            elif parsed.fragment and target.suffix=='.html':
                if parsed.fragment not in Page(target.read_text(encoding='utf-8')).ids:
                    errors.append(f'{route}: missing anchor {url}')
    print('\n'.join(errors) if errors else 'PASS: 9 public pages, navigation parity, H1, IDs, local links and anchors')
    return bool(errors)

if __name__=='__main__': raise SystemExit(main())
