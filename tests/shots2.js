const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('file://' + path.resolve(__dirname, '../aahana.html')); await page.waitForTimeout(1200);
  const ev = f => page.evaluate(f);
  await ev(() => { __game.flow.level1(2); });           // goddess scene, dialogue manual
  await ev(() => __game.G.sim(3.2)); await page.waitForTimeout(300); await page.screenshot({ path: '/home/claude/shots/21_goddess_dialogue.png' });
  await ev(() => { __game.G.auto = true; __game.G.sim(14); });
  await ev(() => { const L = __game.G.scene; L.P.x = 960; L.P.y = 500; L.cam.y = 200; __game.G.sim(1.5); }); await page.waitForTimeout(300);
  await page.screenshot({ path: '/home/claude/shots/22_arrows.png' });
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
