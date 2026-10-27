const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  await pg.goto('file://' + process.cwd() + '/aahana.html?s=level2&auto=1'); await pg.waitForTimeout(1500);
  const run = (js) => pg.evaluate(js);
  await run(`(()=>{const G=__game.G;G.fadeA=0;const L=G.scene;window.L=L;window.step=s=>{for(let i=0;i<s*30;i++)G.tick(1/30,false)};step(6);})()`);
  await run(`(()=>{L.P.x=700;L.P.y=900;step(1);})()`); await pg.waitForTimeout(300); await pg.screenshot({ path: 'screenshots/l2_vayu.png' });
  await run(`(()=>{step(12);L.P.x=1180;L.P.y=640;step(8);})()`); await pg.waitForTimeout(300); await pg.screenshot({ path: 'screenshots/l2_wave.png' });
  await run(`(()=>{__game.G.god=true;for(let i=0;i<30*40&&L.wave!==-1;i++){L.enemies.forEach(e=>e.hp=0);__game.G.tick(1/30,false)};step(3);L.P.x=1560;L.P.y=300;step(8);step(5);})()`); await pg.waitForTimeout(300); await pg.screenshot({ path: 'screenshots/l2_boss.png' });
  await b.close();
})();
