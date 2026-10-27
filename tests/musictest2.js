const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  pg.on('pageerror', e => console.log('ERR', e.message)); pg.on('console', m => console.log('console', m.type(), m.text().slice(0, 150)));
  await pg.goto('file://' + process.cwd() + '/aahana.html'); await pg.waitForTimeout(2500);
  console.log('before key', JSON.stringify(await pg.evaluate(() => __game.AUD.dbg())));
  await pg.keyboard.press('Space'); await pg.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { await pg.waitForTimeout(1500); console.log(JSON.stringify(await pg.evaluate(() => ({ m: __game.AUD.mood, on: __game.AUD.on, d: __game.AUD.dbg() })))); }
  await b.close();
})();
