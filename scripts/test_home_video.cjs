// CHROMIUM_PATH=/usr/bin/chromium node scripts/test_home_video.cjs
// Uses local assets only. Connection changes are mocked; video playback is real Chromium.
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'https://jisoar.test';

(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  try {
    for (const device of [{ width: 390, dpr: 3 }, { width: 1440, dpr: 1 }]) {
      for (const mode of (process.env.JISOAR_VIDEO_MODES || 'saving,normal,no-api,reduced,paused').split(',')) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: 844 }, deviceScaleFactor: device.dpr,
          reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
        });
        await context.addInitScript(mode => {
          if (mode === 'no-api') {
            Object.defineProperty(navigator, 'connection', { value: undefined });
          } else {
            const connection = new EventTarget();
            connection.saveData = mode === 'saving';
            Object.defineProperty(navigator, 'connection', { value: connection });
            window.setTestSaveData = value => {
              connection.saveData = value;
              connection.dispatchEvent(new Event('change'));
            };
          }
        }, mode);
        const requests = [];
        const errors = [];
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin || route.request().method() !== 'GET') return route.abort();
          let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
          if (file !== root && !file.startsWith(root + path.sep)) return route.abort();
          if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
          if (url.pathname === '/assets/home.js' && process.env.JISOAR_TEST_HOME_JS) {
            file = process.env.JISOAR_TEST_HOME_JS;
          }
          if (url.pathname.endsWith('.mp4')) {
            requests.push(url.pathname);
            const data = await readFile(file);
            const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '');
            if (range) {
              const start = Number(range[1]);
              const end = Math.min(range[2] ? Number(range[2]) : data.length - 1, data.length - 1);
              return route.fulfill({ status: 206, body: data.subarray(start, end + 1), headers: {
                'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${data.length}`,
              } });
            }
            return route.fulfill({ body: data, contentType: 'video/mp4', headers: { 'Accept-Ranges': 'bytes' } });
          }
          try { await route.fulfill({ path: file }); }
          catch { await route.fulfill({ status: 404, body: 'Not found' }); }
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin + '/', { waitUntil: 'load' });
        const videos = page.locator('video.sv');
        const hero = page.locator('#film video');
        const work = page.locator('#work video');
        const allPaused = () => page.evaluate(() => [...document.querySelectorAll('video.sv')].every(v => v.paused));
        const stages = async (manualFrame = false) => {
          for (let i = 0; i < 3; i++) {
            await page.locator('#work .tsteps button').nth(i).click();
            assert.equal(await page.locator('#work .tsteps button').nth(i).getAttribute('aria-current'), 'step');
            assert.equal(await page.locator('#work .tsteps li.on').count(), 1);
            if (manualFrame) {
              await page.waitForFunction(() => {
                const v = document.querySelector('#work video');
                return v.readyState >= 2 && !v.seeking && v.duration > 0;
              }, null, { timeout: 5000 });
              const frame = await work.evaluate(v => ({ time: v.currentTime, duration: v.duration, paused: v.paused }));
              const expected = Math.acos(1 - 2 * (i + 0.5) / 3) / (2 * Math.PI) * frame.duration;
              assert.ok(Math.abs(frame.time - expected) < 0.1, 'Explicit stage must seek to its frame');
              assert.ok(frame.paused, 'Explicit stage selection must remain paused');
            }
          }
        };
        if (mode === 'saving' || mode === 'reduced' || mode === 'paused') {
          if (mode === 'paused') await page.locator('#motion-toggle').click();
          const automaticFiles = new Set(requests);
          const height = await page.evaluate(() => document.body.scrollHeight);
          for (let y = 0; y < height; y += 600) {
            await page.evaluate(y => scrollTo(0, y), y);
            await page.waitForTimeout(30);
          }
          await page.waitForTimeout(100);
          assert.equal(await work.getAttribute('src'), null, `${mode}: no automatic stage-video load`);
          assert.ok(requests.every(url => automaticFiles.has(url)), `${mode}: no new automatic video files`);
          if (mode !== 'paused') assert.deepEqual(requests, [], `${mode}: no automatic video requests`);
          await stages(mode !== 'saving');
          if (mode === 'saving') {
            assert.deepEqual(requests, [], 'Saving must block even explicit stages');
            assert.equal(await videos.evaluateAll(vs => vs.filter(v => v.hasAttribute('src')).length), 0);
          } else {
            assert.equal(await work.getAttribute('src'), '/assets/media/film-laptop-1280.mp4?v=2');
            assert.ok(requests.filter(url => !automaticFiles.has(url)).every(url => url === '/assets/media/film-laptop-1280.mp4'));
          }
          assert.ok(await allPaused());
          assert.ok(await videos.evaluateAll(vs => vs.every(v => !!v.poster)));
          assert.equal(await page.locator('h1').innerText(), '회사가 매일 쓰는 시스템을\n만들고 운영합니다.');
          assert.equal(await page.locator('.ask').getAttribute('href'), '/contact/#project-brief');
        } else {
          await page.waitForFunction(() => !document.querySelector('#film video').paused);
          assert.equal(await hero.getAttribute('src'), '/assets/media/film-office-1280.mp4?v=2');
          assert.ok(requests.includes('/assets/media/film-office-1280.mp4'));
          if (mode === 'normal') {
            await page.evaluate(() => window.setTestSaveData(true));
            assert.ok(await allPaused(), 'Runtime saving must pause loaded videos');
            const loaded = new Set(requests);
            await stages();
            await page.locator('#own').scrollIntoViewIfNeeded();
            await page.waitForTimeout(100);
            assert.equal(await work.getAttribute('src'), null);
            assert.equal(await page.locator('#own video').getAttribute('src'), null);
            assert.ok(requests.every(url => loaded.has(url)), 'Runtime saving must not load new video files');
            assert.ok(await allPaused());
            await page.locator('#work').scrollIntoViewIfNeeded();
            await page.evaluate(() => window.setTestSaveData(false));
          } else {
            await page.locator('#work').scrollIntoViewIfNeeded();
          }
          await page.waitForFunction(() => !document.querySelector('#work video').paused);
          assert.equal(await work.getAttribute('src'), '/assets/media/film-laptop-1280.mp4?v=2');
          await stages();
          if (mode === 'normal') {
            await page.evaluate(() => window.setTestSaveData(true));
            assert.ok(await allPaused(), 'Runtime saving must also pause the loaded stage video');
            await stages();
            await page.evaluate(() => window.setTestSaveData(false));
            await page.waitForFunction(() => !document.querySelector('#work video').paused);
          }
          await page.locator('#motion-toggle').click();
          assert.ok(await allPaused(), 'Global pause still works');
          await stages(true);
          await page.locator('#motion-toggle').click();
          await page.waitForFunction(() => !document.querySelector('#work video').paused);
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForFunction(() => [...document.querySelectorAll('video.sv')].every(v => v.paused));
        }
        assert.deepEqual(errors, []);
        await context.close();
        console.log(`PASS ${device.width}px DPR${device.dpr} ${mode}: video policy, stages, poster/CTA or playback/pause`);
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
