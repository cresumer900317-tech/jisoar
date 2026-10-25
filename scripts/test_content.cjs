// CHROMIUM_PATH=/usr/bin/chromium node scripts/test_content.cjs
// Optional SCREENSHOT_DIR writes local review screenshots. All external requests are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'https://jisoar.test';
// Independent reviewers can select their equivalent reconstructed technical baseline.
const base = process.env.JISOAR_CONTENT_BASE || '3a725438ee2fc6d65b63fcfb26278c30bca02128';
(async () => {
  // Preserve existing contract/charity text and every existing home anchor.
  for (const [file, start, end] of [
    ['index.html', '<section class="h-sec" id="gosranhi"', '</section>'],
    ['services/index.html', '<section class="sec soft" id="care"', '</section>'],
    ['services/index.html', '<p class="price-note">', '</p>'],
  ]) {
    const before = execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8' });
    const after = await fs.readFile(path.join(root, file), 'utf8');
    const extract = text => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)) + end.length);
    assert.ok(before.includes(start));
    assert.equal(extract(after), extract(before), `Unchanged terms: ${start}`);
  }
  const beforeHome = execFileSync('git', ['show', `${base}:index.html`], { cwd: root, encoding: 'utf8' });
  const afterHome = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  for (const [, id] of beforeHome.matchAll(/\bid="([^"]+)"/g)) assert.ok(afterHome.includes(`id="${id}"`), `Preserved anchor ${id}`);
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const requests = [];
      const errors = [];
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } } });
      });
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push({ url: request.url(), method: request.method() });
        if (url.origin !== origin || request.method() !== 'GET') return route.abort();
        let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (file !== root && !file.startsWith(root + path.sep)) return route.abort();
        if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
        try { await route.fulfill({ path: file }); }
        catch { await route.fulfill({ status: 404, body: 'Not found' }); }
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const layout = async label => {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${label}: no horizontal overflow`);
        const bad = await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
        assert.deepEqual(bad, []);
      };
      const screenshot = async label => {
        if (!process.env.SCREENSHOT_DIR) return;
        await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${width}-${label}-viewport.png`) });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${width}-${label}.png`), fullPage: true });
      };
      await page.goto(origin + '/', { waitUntil: 'load' });
      assert.equal(await page.locator('.hero-actions a').nth(0).getAttribute('href'), '/contact/#project-brief');
      assert.equal(await page.locator('.hero-actions a').nth(0).innerText(), '내 업무 상담하기');
      assert.equal(await page.locator('.hero-actions a').nth(1).getAttribute('href'), '/services/#price');
      assert.equal(await page.locator('#work .tsteps button').count(), 3);
      assert.equal(await page.locator('#focus-cases article').count(), 2);
      assert.ok((await page.locator('#focus-cases').innerText()).includes('명의를 확인하지 않습니다'));
      assert.ok((await page.locator('#toprise-case').innerText()).includes('기존에 쓰던 리워드 광고 관리 서비스'));
      assert.ok(await page.locator('#home-price').evaluate(el => el.compareDocumentPosition(document.getElementById('work')) & Node.DOCUMENT_POSITION_FOLLOWING));
      const targets = await page.locator('.hero-actions a').evaluateAll(as => as.map(a => { const r = a.getBoundingClientRect(); return { top:r.top,bottom:r.bottom,left:r.left,right:r.right }; }));
      assert.ok(targets[0].bottom <= targets[1].top || targets[0].right <= targets[1].left || targets[1].right <= targets[0].left, 'Hero actions do not overlap');
      // Load every lazy image before checking screenshot/content integrity.
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.evaluate(async () => { for (const image of document.images) { image.loading = 'eager'; await image.decode().catch(() => {}); } scrollTo(0,0); });
      await layout('home');
      await screenshot('home');

      await page.goto(origin + '/services/#price', { waitUntil: 'load' });
      const total = () => page.locator('#c-total').innerText();
      const vat = () => page.locator('#c-vat').innerText();
      const choose = async (preset, amount, included) => {
        await page.locator(`[data-preset="${preset}"]`).click();
        assert.equal(await total(), amount);
        assert.equal(await vat(), `부가세 포함 ${included}만원`);
        assert.equal(await page.locator('input[data-from]').isChecked(), false);
      };
      for (const [preset, amount, included] of [['orders','310','341'],['team','190','209'],['basic','140','154'],['orders','310','341']]) {
        await page.locator('input[data-from]').check();
        await choose(preset, amount, included);
      }
      await page.locator('#c-scr').fill('3');
      await page.locator('#c-scr').blur();
      assert.equal(await total(), '350');
      for (const [input, normalized] of [['0','1'],['-3','1'],['21','20'],['1.9','1'],['','1']]) {
        await page.locator('#c-scr').fill(input);
        await page.locator('#c-scr').blur();
        assert.equal(await page.locator('#c-scr').inputValue(), normalized);
      }
      await choose('basic','140','154');
      await page.locator('input[data-from]').check();
      assert.equal(await total(),'340');
      assert.equal(await vat(),'부가세 포함 374만원부터');
      const mail = new URL(await page.locator('#c-mail').getAttribute('href'));
      assert.ok(mail.searchParams.get('body').includes('월 30만원 추가'));
      assert.ok(mail.searchParams.get('body').includes('월 유지보수 선택'));
      await page.locator('input[data-from]').uncheck();
      assert.equal(await page.locator('#c-from').isVisible(),false);
      assert.equal(new URL(await page.locator('#c-mail').getAttribute('href')).searchParams.get('body').includes('월 30만원 추가'),false);
      await layout('calculator');
      await page.locator('.calc-guide').scrollIntoViewIfNeeded();
      await screenshot('calculator');

      await page.goto(origin + '/contact/#project-brief', { waitUntil: 'load' });
      const goal = page.locator('[name="goal"]');
      assert.deepEqual(await page.locator('#project-brief [name]').evaluateAll(es => es.map(e => e.name)), ['service','schedule','goal','budget','reference']);
      const result = page.locator('#brief-result');
      const submit = page.getByRole('button', { name: '문의 내용 확인하기' });
      await goal.fill('   ');
      await submit.click();
      assert.equal(await result.isVisible(), false);
      await goal.fill('엑셀 주문 현황을 팀원들과 함께 보고 싶어요.');
      const beforeRequests = requests.length;
      await submit.click();
      assert.equal(await result.isVisible(), true);
      assert.ok((await result.innerText()).includes('아직 전송되지 않았습니다.'));
      assert.equal(await page.locator('#brief-text').evaluate(el => document.activeElement === el), true);
      assert.ok(new URL(await page.locator('#brief-email').getAttribute('href')).searchParams.get('body').includes('엑셀 주문'));
      await page.locator('#brief-copy').click();
      assert.ok((await page.locator('#brief-status').innerText()).includes('직접 복사'));
      assert.ok(await page.locator('#brief-text').evaluate(el => el.selectionEnd - el.selectionStart === el.value.length));
      await page.locator('[name="budget"]').fill('상담 후 결정');
      assert.equal(await result.isVisible(),false);
      await goal.fill('가'.repeat(1200));
      await submit.click();
      assert.equal(new URL(await page.locator('#brief-email').getAttribute('href')).searchParams.has('body'),false);
      assert.ok((await page.locator('#brief-status').innerText()).includes('초안이 길어'));
      await page.locator('#brief-copy').click();
      assert.equal(await page.locator('#brief-text').evaluate(el => el.selectionEnd - el.selectionStart), (await page.locator('#brief-text').inputValue()).length);
      await page.evaluate(() => { navigator.clipboard.writeText = async text => { window.testCopied = text; }; });
      await page.locator('#brief-copy').click();
      assert.equal(await page.evaluate(() => window.testCopied), await page.locator('#brief-text').inputValue());
      assert.ok((await page.locator('#brief-status').innerText()).includes('아직 전송되지 않았습니다'));
      assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length),0);
      assert.equal(page.url(),origin + '/contact/#project-brief');
      assert.equal(requests.length, beforeRequests, 'Draft/edit/copy must cause no network requests');
      assert.ok(requests.every(r => r.method === 'GET'));
      await layout('contact');
      await screenshot('contact');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: layout, preserved content/anchors, presets/bounds/costs, draft/long-Korean/clipboard denial, no storage/network`);
    }
    const context = await browser.newContext({ javaScriptEnabled:false, viewport:{width:390,height:900} });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      const file = path.join(root, url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname);
      try { await route.fulfill({path:file}); } catch { await route.abort(); }
    });
    const page = await context.newPage();
    for (const route of ['/', '/services/', '/contact/']) {
      await page.goto(origin + route, {waitUntil:'load'});
      assert.ok(await page.locator('main').isVisible());
      assert.ok(await page.locator('a[href^="mailto:"]').first().isVisible());
      assert.ok(await page.locator('a[href^="https://open.kakao.com/"]').first().isVisible());
      assert.ok(await page.locator('body').innerText());
      if (route === '/') assert.equal(await page.locator('.hero-actions a').count(),2);
      if (route === '/services/') assert.equal(await page.locator('#calc-presets').isVisible(),false);
    }
    await context.close();
    console.log('PASS no-JS: readable content and direct contact links; presets hidden');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
