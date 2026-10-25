"""python -m unittest discover -s scripts -p 'test_audit_public.py' -v"""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from audit_public import audit, ROOT, ROUTES, REDIRECTS, EXPECTED


class PublicAuditTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        nav = ''.join('<nav aria-label="' + label + '">' +
                      ''.join(f'<a href="{url}">link</a>' for url in urls) + '</nav>'
                      for label, urls in EXPECTED.items())
        for route in ROUTES:
            path = self.root / route / 'index.html'
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(nav + '<h1 id="target">Page</h1>', encoding='utf-8')
        for route, url in REDIRECTS.items():
            path = self.root / route / 'index.html'
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f'<meta http-equiv="refresh" content="0; url={url}">'
                            f'<meta name="robots" content="noindex">'
                            f'<link rel="canonical" href="{url}"><a href="{url}">Go</a>', encoding='utf-8')
        for name in ['still.jpg', 'still-800.jpg', 'media/film-720.mp4',
                     'media/film-1280.mp4', 'media/film-1920.mp4']:
            path = self.root / 'assets' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'fixture')
        self.append('<a href="/work/#target">Work</a><a href="#target">Here</a>'
                    '<img src="/assets/still.jpg" srcset="/assets/still-800.jpg 800w">'
                    '<video class="sv" data-src="/assets/media/film" data-big poster="/assets/still.jpg"></video>')

    def append(self, text, route=''):
        path = self.root / route / 'index.html'
        path.write_text(path.read_text(encoding='utf-8') + text, encoding='utf-8')

    def assert_error(self, expected):
        self.assertTrue(any(expected in error for error in audit(self.root)), expected)

    def test_actual_site(self):
        self.assertEqual(audit(ROOT), [])

    def test_valid_fixture(self):
        self.assertEqual(audit(self.root), [])

    def test_broken_link(self):
        self.append('<a href="/missing/">Broken</a>')
        self.assert_error('missing /missing/')

    def test_broken_cross_page_anchor(self):
        self.append('<a href="/work/#missing">Broken</a>')
        self.assert_error('missing anchor /work/#missing')

    def test_broken_same_page_anchor(self):
        self.append('<a href="#missing">Broken</a>')
        self.assert_error('missing anchor #missing')

    def test_broken_relative_asset(self):
        self.append('<img src="../assets/missing.jpg">', 'about')
        self.assert_error('missing ../assets/missing.jpg')

    def test_missing_video_variants(self):
        for width in [720, 1280, 1920]:
            with self.subTest(width=width):
                path = self.root / f'assets/media/film-{width}.mp4'
                path.unlink()
                self.assert_error(f'missing /assets/media/film-{width}.mp4')
                path.write_bytes(b'fixture')

    def test_prefix_file_does_not_replace_real_video(self):
        (self.root / 'assets/media/film').write_bytes(b'not a variant')
        (self.root / 'assets/media/film-720.mp4').unlink()
        self.assert_error('missing /assets/media/film-720.mp4')

    def test_regular_video_does_not_require_big_variant(self):
        path = self.root / 'index.html'
        path.write_text(path.read_text(encoding='utf-8').replace(' data-big', ''), encoding='utf-8')
        (self.root / 'assets/media/film-1920.mp4').unlink()
        self.assertEqual(audit(self.root), [])

    def test_missing_srcset_asset(self):
        (self.root / 'assets/still-800.jpg').unlink()
        self.assert_error('missing /assets/still-800.jpg')

    def test_missing_poster(self):
        self.append('<video poster="/assets/missing.jpg"></video>')
        self.assert_error('missing /assets/missing.jpg')

    def test_broken_navigation(self):
        self.append('<nav aria-label="주요 메뉴"></nav>')
        self.assert_error('inconsistent 주요 메뉴')

    def test_duplicate_id(self):
        self.append('<div id="target"></div>')
        self.assert_error('duplicate IDs')

    def test_missing_heading(self):
        path = self.root / 'about/index.html'
        path.write_text(path.read_text(encoding='utf-8').replace('<h1 id="target">Page</h1>', ''), encoding='utf-8')
        self.assert_error('about: expected one H1')

    def test_missing_page(self):
        (self.root / 'work/index.html').unlink()
        self.assert_error('work: missing page')

    def test_invalid_redirect(self):
        for old, new, expected in [
            ('0; url=', '5; url=', 'wrong redirect'),
            ('url=https://jirading.com/', 'url=https://example.com/', 'wrong redirect'),
            ('noindex', 'index', 'redirect needs noindex'),
            ('rel="canonical"', 'rel="alternate"', 'wrong redirect canonical'),
            ('<a href=', '<a data-href=', 'missing redirect fallback link'),
        ]:
            with self.subTest(expected=expected):
                path = self.root / 'ranklab/index.html'
                original = path.read_text(encoding='utf-8')
                path.write_text(original.replace(old, new), encoding='utf-8')
                self.assert_error('ranklab: ' + expected)
                path.write_text(original, encoding='utf-8')


if __name__ == '__main__': unittest.main()
