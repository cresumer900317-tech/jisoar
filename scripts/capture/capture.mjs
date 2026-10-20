// 사이트용 제품 화면을 한 번에 다시 찍는다. 결과: assets/work/live/<이름>.jpg
//
//   node scripts/capture/capture.mjs isis       (로컬 이시스 가짜 데이터 화면)
//
// 준비는 scripts/capture/README.md 참고. 브라우저는 설치된 Edge 를 쓴다.
// playwright 는 수집기 저장소(../ranklab-collector) 것을 빌려 쓴다(PW_DIR 로 바꿀 수 있음).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const pwDir = process.env.PW_DIR || path.resolve(root, '../ranklab-collector');
const { chromium } = createRequire(path.join(pwDir, 'package.json'))('playwright');
const out = path.join(root, 'assets/work/live');
mkdirSync(out, { recursive: true });

const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.4 };   // 본문 폭 약 1700px
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const TARGETS = {
  isis: {
    base: process.env.ISIS_WEB || 'http://localhost:5173',
    // 사이트에서 쓰는 공개 이름(Toprise)으로 바꿔 찍는다. 고객 서비스 이름은 화면에 남기지 않음
    rename: ['.brand-name, .phone-brand', 'Toprise'],
    async login(ctx, base) {
      const r = await ctx.request.post(base + '/api/auth/login', { headers: { 'X-RL': '1' }, data: { login_id: 'root', password: 'admin1234' } });
      if (!r.ok()) throw new Error('이시스 로컬 로그인 실패 ' + r.status());
    },
    // sel: 그 요소 영역만 자름(왼쪽 메뉴의 서비스 이름·계정 정보 제외). tall: 창 높이를 늘려 긴 화면 전체를 찍음
    shots: [
      { name: 'isis-ad', hash: '#ad', dev: DESK, sel: 'main.main' },
      { name: 'isis-ad-long', hash: '#ad', dev: DESK, sel: 'main.main', tall: 2600 },
      { name: 'isis-stats', hash: '#stats', dev: DESK, sel: 'main.main' },
      { name: 'isis-settle', hash: '#settle', dev: DESK, sel: 'main.main' },
      { name: 'isis-ad-m', hash: '#ad', dev: PHONE, tall: 2400 },
    ],
  },
};

const which = process.argv.slice(2);
if (!which.length || which.some(w => !TARGETS[w])) {
  console.error('사용법: node scripts/capture/capture.mjs <' + Object.keys(TARGETS).join('|') + '> ...');
  process.exit(1);
}
const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const w of which) {
    const t = TARGETS[w];
    for (const s of t.shots) {
      const dev = s.tall ? { ...s.dev, viewport: { ...s.dev.viewport, height: s.tall } } : s.dev;
      const ctx = await browser.newContext({ ...dev, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
      await t.login(ctx, t.base);
      const page = await ctx.newPage();
      await page.goto(t.base + '/' + s.hash, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      if (t.rename) await page.evaluate(([sel, name]) => document.querySelectorAll(sel).forEach(e => { e.textContent = name; }), t.rename);
      const file = path.join(out, s.name + '.jpg');
      if (s.sel) {
        const box = await page.locator(s.sel).first().boundingBox();
        await page.screenshot({ path: file, type: 'jpeg', quality: 80, clip: { x: box.x, y: 0, width: box.width, height: dev.viewport.height } });
      } else {
        await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
      }
      console.log('찍음', path.relative(root, file));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
