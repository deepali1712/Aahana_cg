const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file://' + path.resolve(__dirname, '../aahana.html')); await page.waitForTimeout(1000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { __game.G.auto = true; __game.flow.level1(3); __game.G.sim(0.5); });
  for (let step = 0; step < 1500; step++) {
    const r = await ev(() => {
      const G = __game.G, L = G.scene, P = L.P; if (G.dlg) { G.sim(0.1); return null; }
      let tgt = null, bd = 1e9; for (const e of L.enemies) if (e.hp > 0) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; tgt = e; } }
      G.keys = {};
      if (tgt) { const dx = tgt.x - P.x, dy = tgt.y - P.y;
        if (bd > 70) { if (dx > 20) G.keys.KeyD = true; if (dx < -20) G.keys.KeyA = true; if (dy > 20) G.keys.KeyS = true; if (dy < -20) G.keys.KeyW = true; }
        if (bd < 85) G.pressed.add('Space');
        if (tgt.state === 'windup' && bd < 90 && P.dodgeCd <= 0) { G.pressed.add('ShiftLeft'); G.keys.KeyA = dx > 0; G.keys.KeyD = dx <= 0; } }
      G.tick(1 / 30, false); G.keys = {};
      return { wave: L.wave, hand: !!L.hand, P: [Math.round(P.x), Math.round(P.y), P.hp], en: L.enemies.map(e => [e.type, Math.round(e.x), Math.round(e.y), e.hp, e.state]) };
    });
    if (r && step % 150 === 0) console.log(step, JSON.stringify(r));
    if (r && r.hand) { console.log('reached abduction at step', step); break; }
  }
  await b.close();
})();
