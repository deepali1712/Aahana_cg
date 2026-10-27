const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  await pg.goto('file://' + process.cwd() + '/aahana.html?s=level3&auto=1'); await pg.waitForTimeout(2000);
  await pg.evaluate(() => { const G = __game.G; G.fadeA = 0; const L = G.scene; const step = s => { for (let i = 0; i < s * 30; i++) G.tick(1 / 30, false); }; step(8); L.P.x = 1150; L.P.y = 700; step(14); L.P.x = 1100; L.P.y = 690; step(1); L.coins[0].got = true; L.gold = 1; step(1); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: 'screenshots/l3_gold.png' }); await b.close();
})();
