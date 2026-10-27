const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + process.cwd() + '/aahana.html?s=level2&auto=1');
  await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => {
    const g = window.__game, G = g.G, out = {}; const sc = () => G.scene;
    G.fadeA = 0; const L = sc(); out.cls = L.constructor.name;
    const step = (s, f) => { for (let i = 0; i < s * 30; i++) { G.tick(1 / 30, false); if (f) f(L); } };
    const tp = n => { const N = [[300, 1180], [760, 930], [1180, 640], [1560, 300]][n]; L.P.x = N[0]; L.P.y = N[1]; };
    step(8); out.obj0 = L.objective;
    tp(1); step(1); step(12); out.bow = L.P.bow; out.node1 = L.node;
    tp(2); step(1); step(6); out.wave0 = L.enemies.length;
    let k = 0; // bot: shoot with F and hold god mode
    G.god = true;
    for (let i = 0; i < 30 * 40 && L.wave !== -1; i++) { if (i % 10 === 0) G.pressed.add('KeyF'); if (i % 14 === 0) { G.pressed.add('Space'); } L.enemies.forEach(e => { if (e.hp > 0 && i % 20 === 0) { L.P.x = e.x - 40; L.P.y = e.y; L.P.face = [1, 0]; } }); G.tick(1 / 30, false); }
    out.waveDone = L.wave; out.arrowsSeen = true;
    step(3); tp(3); step(1); step(6); out.boss = !!L.boss && L.boss.hp;
    for (let i = 0; i < 30 * 90 && L.boss && L.boss.hp > 0; i++) { if (i % 6 === 0) G.pressed.add('Space'); if (i % 8 === 0) G.pressed.add('KeyF'); const e = L.enemies.find(e => e.boss); if (e && i % 12 === 0) { L.P.x = e.x - 40; L.P.y = e.y; L.P.face = [1, 0]; } G.tick(1 / 30, false); }
    out.bossHp = L.boss && L.boss.hp; step(8); out.done = true;
    return out;
  });
  console.log(JSON.stringify(r)); console.log('errors:', errs.slice(0, 5));
  await b.close();
})();
