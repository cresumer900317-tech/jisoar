// CHROMIUM_PATH=/usr/bin/chromium node scripts/test_home_ask.cjs
// Requires Playwright with page.clock support. External requests are blocked.
// JISOAR_TEST_HOME_JS can select an earlier script to check regression sensitivity.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'https://jisoar.test';

(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => { Math.random = () => 0.5; });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (file !== root && !file.startsWith(root + path.sep)) return route.abort();
        if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
        if (url.pathname === '/assets/home.js' && process.env.JISOAR_TEST_HOME_JS) {
          file = process.env.JISOAR_TEST_HOME_JS;
        }
        if (/\.(mp4|woff2?)$/.test(file)) return route.abort();
        try { await route.fulfill({ path: file }); }
        catch { await route.fulfill({ status: 404, body: 'Not found' }); }
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      const ask = page.locator('.ask');
      const copy = () => page.locator('.ask .q').textContent();
      const caretCount = () => page.locator('.ask .caret').count();
      const waitForIntersection = expected => page.evaluate(expected => new Promise(resolve => {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting === expected) { observer.disconnect(); resolve(); }
        });
        observer.observe(document.querySelector('.ask .q'));
      }), expected);
      const open = async (reducedMotion = 'no-preference') => {
        await page.emulateMedia({ reducedMotion });
        await page.mouse.move(0, 899);
        await page.goto(origin + '/', { waitUntil: 'load' });
        if (reducedMotion === 'no-preference') {
          await page.waitForFunction(() => document.documentElement.classList.contains('anim'));
        }
        return copy();
      };
      const secondSentence = async () => {
        // Fixed randomness keeps the original request order and typing speed.
        // Complete the entire request list, wrap to the first, then reach the second.
        const sequence = [
          '기간별 매출을 한눈에 보고 싶어요',
          '정산 엑셀을 은행 대량이체 파일로 바꿔 주세요',
          '같은 업체에 중복 연락하지 않게 기록을 같이 보고 싶어요',
        ];
        for (const expected of sequence) {
          let found = false;
          for (let elapsed = 0; elapsed < 150000; elapsed += 500) {
            await page.clock.runFor(500);
            if (await copy() === expected) { found = true; break; }
          }
          assert.ok(found, `A complete request-list cycle must reach: ${expected}`);
        }
        return sequence[2];
      };
      const assertStaticInteractions = async (expected, label) => {
        assert.equal(await caretCount(), 0, `${label}: no caret before interaction`);
        await ask.focus();
        assert.equal(await copy(), expected, `${label}: focus must not replace copy`);
        assert.equal(await caretCount(), 0, `${label}: focus must not restore caret`);
        await ask.hover();
        await ask.evaluate(el => el.blur());
        await page.clock.runFor(4000);
        assert.equal(await copy(), expected, `${label}: hover must keep static copy`);
        assert.equal(await caretCount(), 0, `${label}: hover must not restore caret`);
        await page.mouse.move(0, 899);
        await page.clock.runFor(1000);
        assert.equal(await copy(), expected, `${label}: release must keep static copy`);
      };

      const full = await open();
      assert.ok(full.trim().length > 10, 'Initial CTA must contain a complete example');
      await ask.focus();
      await page.clock.runFor(4000);
      assert.equal(await copy(), full, 'Early focus must retain complete copy');
      await ask.hover();
      await page.mouse.move(0, 899);
      await page.clock.runFor(1000);
      assert.equal(await copy(), full, 'Mouse leave must retain copy while focused');
      await ask.hover();
      await ask.evaluate(el => el.blur());
      await page.clock.runFor(1000);
      assert.equal(await copy(), full, 'Blur must retain copy while hovered');
      await page.mouse.move(0, 899);
      await page.clock.runFor(1000);
      assert.notEqual(await copy(), full, 'Animation must resume after both holds end');

      const hoverFull = await open();
      await ask.hover();
      await page.clock.runFor(4000);
      assert.equal(await copy(), hoverFull, 'Early hover must retain complete copy');
      const typingFull = await open();
      await page.clock.runFor(1200);
      const partial = await copy();
      assert.ok(partial.length > 0 && partial.length < typingFull.length);
      await ask.focus();
      assert.equal(await copy(), typingFull, 'Mid-animation focus must complete the sentence');
      await ask.evaluate(el => el.blur());
      await page.clock.runFor(400);
      const resumed = await copy();
      assert.ok(resumed.length > 0 && resumed.length < typingFull.length);
      console.log(`OBSERVE ${width}px: release resumes the existing partial typing position`);

      await open();
      assert.notEqual(await secondSentence(), full);
      await page.locator('#motion-toggle').click();
      await assertStaticInteractions(full, 'Pause after first full cycle');
      await page.locator('#motion-toggle').click();
      assert.equal(await caretCount(), 1, 'Explicit resume restores animation');

      await open();
      await secondSentence();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => !document.documentElement.classList.contains('anim'));
      await assertStaticInteractions(full, 'Reduced motion after first full cycle');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => document.documentElement.classList.contains('anim'));
      assert.equal(await caretCount(), 1, 'Leaving reduced motion restores animation');
      const reducedInitial = await open('reduce');
      assert.ok(reducedInitial.trim().length > 10);
      await assertStaticInteractions(reducedInitial, 'Initial reduced motion');

      await open();
      await page.clock.runFor(1200);
      // Simulates the document.hidden branch, not a real OS/browser tab switch.
      await page.evaluate(() => Object.defineProperty(document, 'hidden', {
        configurable: true, get: () => true,
      }));
      const hiddenCopy = await copy();
      await page.clock.runFor(2000);
      assert.equal(await copy(), hiddenCopy, 'Simulated hidden tab must stop typing');
      await page.evaluate(() => { delete document.hidden; });
      await page.clock.runFor(1000);
      assert.notEqual(await copy(), hiddenCopy, 'Visible document must resume typing');

      await open();
      await page.clock.runFor(1200);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await waitForIntersection(false);
      assert.ok(await ask.evaluate(el => el.getBoundingClientRect().bottom < 0));
      const offscreenCopy = await copy();
      await page.clock.runFor(2000);
      assert.equal(await copy(), offscreenCopy, 'Offscreen CTA must stop typing');
      await page.evaluate(() => scrollTo(0, 0));
      await waitForIntersection(true);
      await page.clock.runFor(1000);
      assert.notEqual(await copy(), offscreenCopy, 'Returning onscreen must resume typing');

      assert.equal(await ask.getAttribute('href'), '/contact/#project-brief');
      await ask.click();
      await page.waitForURL(origin + '/contact/#project-brief');
      assert.equal(await page.locator('#project-brief').count(), 1);
      assert.deepEqual(errors, [], 'No JavaScript errors');
      await context.close();
      console.log(`PASS ${width}px: initial/mid-typing holds, overlapping holds, full-cycle pause/reduced-motion without caret, resume, simulated hidden/visible, offscreen/onscreen, contact navigation`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
