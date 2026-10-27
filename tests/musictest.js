const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + process.cwd() + '/aahana.html'); await pg.waitForTimeout(2500);
  await pg.keyboard.press('Space'); await pg.waitForTimeout(4000);
  const r = await pg.evaluate(() => { const A = __game.AUD; return { mood: A.mood, on: A.on, music: !!window.MUSIC, scene: __game.G.scene.constructor.name }; });
  console.log(JSON.stringify(r));
  const r2 = await pg.evaluate(async () => { const a = document.querySelectorAll('audio'); return { n: a.length }; });
  // run a level with tabla: no errors
  await pg.evaluate(() => { __game.flow.level1(3); }); await pg.waitForTimeout(6000);
  console.log(JSON.stringify(await pg.evaluate(() => ({ mood: __game.AUD.mood }))), 'errors:', errs);
  await b.close();
})();
