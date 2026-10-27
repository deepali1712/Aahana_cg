const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + process.cwd() + '/aahana.html?s=level3&auto=1'); await pg.waitForTimeout(2000);
  const r = await pg.evaluate(() => {
    const G = __game.G; G.fadeA = 0; const L = G.scene, out = { cls: L.constructor.name };
    const step = s => { for (let i = 0; i < s * 30; i++) G.tick(1 / 30, false); };
    const tp = (x, y) => { L.P.x = x; L.P.y = y; };
    step(8); out.obj = L.objective;
    tp(700, 900); step(14); out.chk = L.P.chkOn;
    tp(1150, 700); step(8); out.node = L.node;
    tp(1150, 700); for (let i = 0; i < 3; i++) { for (const k of L.coins.slice(0, 3)) { tp(k.x, k.y); step(0.2); } } out.gold = L.gold;
    // wave check: chakra kills
    G.god = true; L.enemies.forEach(e => e.hp = 0); step(1);
    tp(1270, 640); G.pressed.add('KeyE'); step(0.2); step(3.5); out.freed = L.freed;
    step(8); out.blessed = L.blessed;
    tp(1550, 330); step(3); step(6); out.boss = L.boss && L.boss.hp;
    for (let i = 0; i < 30 * 90 && L.boss.hp > 0; i++) { if (i % 6 === 0) G.pressed.add('Space'); if (i % 10 === 0) G.pressed.add('KeyQ'); const e = L.boss; if (i % 12 === 0) { const ok = [e.x - 40, e.y]; L.P.x = clamp(ok[0]); L.P.y = ok[1]; } G.tick(1 / 30, false); }
    function clamp(v) { return v; }
    out.bossHp = L.boss.hp; step(8); return out;
  });
  console.log(JSON.stringify(r)); console.log('errors:', errs.slice(0, 5));
  await pg.screenshot({ path: 'screenshots/l3_end.png' }); await b.close();
})();
