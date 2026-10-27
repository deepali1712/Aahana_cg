const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + process.cwd() + '/aahana.html'); await pg.waitForTimeout(2000);
  const d = () => pg.evaluate(() => __game.AUD.dbg());
  await pg.keyboard.press('KeyQ'); await pg.waitForTimeout(3500); console.log('after any key', JSON.stringify(await d()));
  await pg.keyboard.press('KeyM'); await pg.waitForTimeout(600); console.log('after M', JSON.stringify(await d()));
  await pg.keyboard.press('KeyM'); await pg.waitForTimeout(600); console.log('M again', JSON.stringify(await d()));
  await pg.keyboard.press('Space'); await pg.waitForTimeout(3000); console.log('intro', JSON.stringify(await d()));
  await pg.evaluate(() => __game.flow.level1(3)); await pg.waitForTimeout(5000); console.log('level', JSON.stringify(await d()), 'errors', errs);
  await pg.screenshot({ path: 'screenshots/title_hint.png' }); await b.close();
})();
