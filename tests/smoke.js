// Smoke test: load the bundle in Chromium, report console errors, take screenshots, measure frame time.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../aahana.html'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/home/claude/shots/01_title.png' });
  const t = await page.evaluate(() => { const G = __game.G; const t0 = performance.now(); for (let i = 0; i < 20; i++) G.render(); return (performance.now() - t0) / 20; });
  console.log('title frame ms', t.toFixed(1));
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await browser.close();
})();
