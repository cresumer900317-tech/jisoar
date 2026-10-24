"""Run with python scripts/audit_public.py before changing public pages."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ['', 'about', 'work', 'services', 'contact',
          'products/wedding', 'products/guild-lounge']
REDIRECTS = {'ranklab': 'https://jirading.com/'}
JIPICK = 'https://jipick.com/'
EXPECTED = {'주요 메뉴': ['/work/', '/services/', JIPICK, '/about/'],
            '하단 메뉴': ['/work/', '/services/', 'https://jirading.com/', JIPICK, '/about/', '/contact/']}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = []; self.urls = []; self.navs = {}; self.nav = None; self.h1 = 0
        self.redirect = None; self.canonical = None; self.noindex = False; self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h1': self.h1 += 1
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'nav':
            self.nav = a.get('aria-label'); self.navs[self.nav] = []
        if tag == 'a':
            self.links.append(a.get('href'))
            if self.nav: self.navs[self.nav].append(a.get('href'))
        if tag == 'meta':
            if a.get('http-equiv', '').lower() == 'refresh':
                match = re.fullmatch(r'\s*0\s*;\s*url\s*=\s*(\S+)\s*', a.get('content', ''), re.I)
                self.redirect = match.group(1) if match else None
            if a.get('name', '').lower() == 'robots':
                self.noindex = 'noindex' in re.split(r'[\s,]+', a.get('content', '').lower())
        if tag == 'link' and 'canonical' in a.get('rel', '').split():
            self.canonical = a.get('href')
        for key in ('href', 'src', 'poster'):
            if a.get(key): self.urls.append(a[key])
        for candidate in a.get('srcset', '').split(','):
            if candidate.strip(): self.urls.append(candidate.split()[0])
        if a.get('data-src'):
            if tag == 'video' and 'sv' in a.get('class', '').split():
                # home.js load() resolves these prefixes to the shipped variants.
                widths = [720, 1280] + ([1920] if 'data-big' in a else [])
                self.urls.extend(f"{a['data-src']}-{width}.mp4" for width in widths)
            else:
                self.urls.append(a['data-src'])

    def handle_endtag(self, tag):
        if tag == 'nav': self.nav = None


def audit(root=ROOT):
    root = Path(root).resolve()
    errors = []
    for route in [*ROUTES, *REDIRECTS]:
        path = root / route / 'index.html'
        if not path.is_file():
            errors.append(f'{route}: missing page'); continue
        page = Page(path.read_text(encoding='utf-8'))
        if route in REDIRECTS:
            expected = REDIRECTS[route]
            if page.redirect != expected: errors.append(f'{route}: wrong redirect')
            if page.canonical != expected: errors.append(f'{route}: wrong redirect canonical')
            if not page.noindex: errors.append(f'{route}: redirect needs noindex')
            if expected not in page.links: errors.append(f'{route}: missing redirect fallback link')
        else:
            for label in ('주요 메뉴', '하단 메뉴'):
                if page.navs.get(label) != EXPECTED[label]: errors.append(f'{route}: inconsistent {label}')
            if page.h1 != 1: errors.append(f'{route}: expected one H1')
        if len(page.ids) != len(set(page.ids)): errors.append(f'{route}: duplicate IDs')
        for url in page.urls:
            parsed = urlsplit(url)
            if parsed.scheme or parsed.netloc: continue
            local = unquote(parsed.path)
            target = ((root / local.lstrip('/')) if local.startswith('/') else
                      (path.parent / local) if local else path).resolve()
            if not target.is_relative_to(root):
                errors.append(f'{route}: outside site {url}'); continue
            if target.is_dir(): target = target / 'index.html'
            if not target.is_file(): errors.append(f'{route}: missing {url}')
            elif parsed.fragment and target.suffix == '.html':
                if unquote(parsed.fragment) not in Page(target.read_text(encoding='utf-8')).ids:
                    errors.append(f'{route}: missing anchor {url}')
    return errors


def main():
    errors = audit()
    print('\n'.join(errors) if errors else
          'PASS: 7 public pages and 1 redirect; navigation, H1, IDs, local links, anchors and media variants')
    return bool(errors)


if __name__ == '__main__': raise SystemExit(main())
