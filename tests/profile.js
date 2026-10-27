const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto('file://' + path.resolve(__dirname, '../aahana.html')); await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const { G, CG } = __game; __game.flow.level1(3); G.sim(2); G.render();
    const T = (f, n = 20) => { const t0 = performance.now(); for (let i = 0; i < n; i++) f(); return +((performance.now() - t0) / n).toFixed(2); };
    const FB = CG.getFB(), L = G.scene;
    const out = {};
    out.fullRender = T(() => G.render());
    out.update = T(() => G.tick(1 / 60, false));
    out.lighting = T(() => CG.lighting(FB, [0.5, 0.5, 0.5], [{ x: 400, y: 300, r: 200, c: [1, .6, .3], i: 1 }], 0.25));
    out.groundBlit = T(() => CG.blit(L.constructor === Object ? null : (window.__g || (window.__g = new CG.Surface(1920, 1360))), -200, -300));
    out.present = T(() => CG.present());
    out.fade = T(() => CG.fade(FB, 0xFF000000, 0.3));
    return out;
  });
  console.log(JSON.stringify(r)); await b.close();
})();
