const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto('file://' + path.resolve(__dirname, '../aahana.html')); await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const { G, CG, ART } = __game; __game.flow.level1(3); G.sim(2); G.render();
    const acc = {}; const wrap = (o, n, label) => { const f = o[n]; o[n] = function () { const t = performance.now(); const r = f.apply(this, arguments); acc[label] = (acc[label] || 0) + performance.now() - t; return r; }; };
    ['lighting', 'blit', 'drawBitmap', 'radial', 'fillPolygon', 'lineThick', 'polyline', 'present', 'fade', 'disc'].forEach(n => wrap(CG, n, 'CG.' + n));
    ['drawFlame', 'drawGarland', 'drawMandala', 'drawTamasurHand'].forEach(n => wrap(ART, n, 'ART.' + n));
    const N = 20; const t0 = performance.now(); for (let i = 0; i < N; i++) G.render(); const tot = (performance.now() - t0) / N;
    const o = { total: +tot.toFixed(1) }; for (const k in acc) o[k] = +(acc[k] / N).toFixed(2); return o;
  });
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
