// Headless playthrough of Build 1: Level 1 (all phases) + Interlude 1, with screenshots and assertions.
const { chromium } = require('playwright');
const path = require('path');
const SH = '/home/claude/shots/';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../aahana.html'));
  await page.waitForTimeout(1500);
  const shot = async n => { await page.waitForTimeout(250); await page.screenshot({ path: SH + n + '.png' }); };
  const ev = (f, a) => page.evaluate(f, a);
  const fails = []; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };

  // story card
  await ev(() => { __game.flow.intro(); });
  await ev(() => __game.G.sim(7)); await page.waitForTimeout(300); await shot('02_card');

  // ---- Level 1 phase A
  await ev(() => { __game.G.auto = true; __game.flow.level1(0); });
  await ev(() => __game.G.sim(1.5)); await shot('03_dialogue');
  await ev(() => __game.G.sim(9));
  let o = await ev(() => __game.G.scene.objective);
  check(/Light the festival diyas/.test(o), 'phase A objective shown: ' + o);
  await shot('04_dusk');
  // light every diya via the real interaction path
  for (let i = 0; i < 5; i++) {
    await ev(i => { const G = __game.G, L = G.scene, d = L.diyas[i]; L.P.x = d.x; L.P.y = d.y + 30; G.sim(0.2); G.pressed.add('KeyE'); G.tick(1 / 30, false); G.sim(0.3); }, i);
  }
  check(await ev(() => __game.G.scene.lit) === 5, 'all 5 diyas lit with E');
  await shot('05_diyas');
  // ---- Phase B eclipse
  await ev(() => __game.G.sim(2.2)); await shot('06_eclipse_start');
  await ev(() => __game.G.sim(5)); await shot('07_eclipse_dark');
  await ev(() => __game.G.sim(5)); await shot('08_pan_to_fire');
  let st = await ev(() => { const L = __game.G.scene; return { fire: L.fireOn, rta: L.rta.s, ecl: L.ecl, dlg: !!__game.G.dlg }; });
  check(st.fire && st.ecl === 1, 'eclipse complete, yagna fire lit ' + JSON.stringify(st));
  await ev(() => __game.G.sim(4)); await shot('09_thread_snap');
  // ---- Phase C goddesses
  await ev(() => __game.G.sim(3)); await shot('10_goddess');
  await ev(() => __game.G.sim(8)); await shot('11_after_merge');
  st = await ev(() => { const L = __game.G.scene; return { combat: L.combat, sword: L.P.sword, wave: L.wave, n: L.enemies.length }; });
  check(st.combat && st.sword, 'combat unlocked after goddesses ' + JSON.stringify(st));
  // ---- Phase D bot fight (no god mode)
  let died = 0, shots = 0;
  for (let step = 0; step < 900; step++) {
    const r = await ev(() => {
      const G = __game.G, L = G.scene, P = L.P; if (G.dlg) { G.sim(0.1); return 'dlg'; }
      let tgt = null, bd = 1e9; for (const e of L.enemies) if (e.hp > 0) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; tgt = e; } }
      G.keys = {};
      if (tgt) {
        const dx = tgt.x - P.x, dy = tgt.y - P.y;
        if (bd > 70) { if (dx > 20) G.keys.KeyD = true; if (dx < -20) G.keys.KeyA = true; if (dy > 20) G.keys.KeyS = true; if (dy < -20) G.keys.KeyW = true; }
        if (bd < 85) G.pressed.add('Space');
        if (tgt.state === 'windup' && bd < 90 && P.dodgeCd <= 0) { G.pressed.add('ShiftLeft'); G.keys.KeyA = dx > 0; G.keys.KeyD = dx <= 0; }
      }
      const hp0 = P.hp; G.tick(1 / 30, false); G.keys = {};
      return { wave: L.wave, n: L.enemies.filter(e => e.hp > 0).length, hp: P.hp, dead: P.dead, done: L.wave === -1 && !!L.hand };
    });
    if (r === 'dlg') continue;
    if (r.dead) died++;
    if (step === 30 && shots === 0) { await shot('12_combat'); shots = 1; }
    if (r.done) break;
  }
  st = await ev(() => { const L = __game.G.scene; return { wave: L.wave, hand: !!L.hand, hp: L.P.hp }; });
  console.log('after fight', JSON.stringify(st), 'bot deaths seen:', died);
  check(st.hand || st.wave === -1, 'three waves cleared, reached abduction');
  // ---- Phase E
  await ev(() => { window.__done = false; __game.G.scene.onComplete = () => { window.__done = true; }; });
  await ev(() => __game.G.sim(3)); await shot('13_hand_rise');
  await ev(() => __game.G.sim(8)); await shot('14_knockback');
  await ev(() => __game.G.sim(8)); await shot('15_seize');
  await ev(() => __game.G.sim(14));
  check(await ev(() => window.__done), 'Level 1 completed (onComplete fired)');

  // ---- death & wave restart test
  await ev(() => { __game.G.auto = true; __game.flow.level1(3); });
  await ev(() => __game.G.sim(2));
  await ev(() => { const L = __game.G.scene; L.P.hp = 1; L.enemies.forEach(e => { e.x = L.P.x + 20; e.y = L.P.y; e.state = 'lunge'; e.st = 1; e.lv = [-1, 0]; e.did = false; }); });
  await ev(() => __game.G.sim(1.2));
  const dead = await ev(() => __game.G.scene.P.dead);
  await ev(() => __game.G.sim(2.5));
  st = await ev(() => { const L = __game.G.scene; return { hp: L.P.hp, dead: L.P.dead, n: L.enemies.length, wave: L.wave }; });
  check(st.hp === 5 && !st.dead && st.n > 0, 'death restores HP and restarts the wave ' + JSON.stringify(st) + ' (dead flag seen=' + dead + ')');

  // ---- Interlude 1
  await ev(() => { __game.G.auto = true; __game.flow.interlude1(); });
  await ev(() => __game.G.sim(3)); await shot('16_cell');
  for (let round = 0; round < 2; round++) {
    // wait for input state
    for (let k = 0; k < 400; k++) { const s = await ev(() => __game.G.scene.state); if (s === 'input') break; await ev(() => __game.G.sim(0.1)); }
    await shot('17_cell_input' + round);
    const seq = await ev(() => __game.G.scene.seq);
    if (round === 0) { // wrong note first to test the retry path
      await ev(s => { const G = __game.G, L = G.scene; const wrong = (s[0] + 1) % 4; G.pressed.add(['KeyA', 'KeyS', 'KeyD', 'KeyF'][wrong]); G.tick(1 / 30, false); }, seq);
      await ev(() => __game.G.sim(2.5));
      for (let k = 0; k < 400; k++) { const s = await ev(() => __game.G.scene.state); if (s === 'input') break; await ev(() => __game.G.sim(0.1)); }
    }
    for (const n of seq) await ev(n => { const G = __game.G; G.pressed.add(['KeyA', 'KeyS', 'KeyD', 'KeyF'][n]); G.tick(1 / 30, false); G.sim(0.25); }, n);
    await ev(() => __game.G.sim(1.6));
  }
  await shot('18_cell_rings');
  await ev(() => __game.G.sim(3)); await shot('19_cell_door');
  await ev(() => { window.__done2 = false; const L = __game.G.scene; L.onComplete = () => { window.__done2 = true; }; });
  await ev(() => __game.G.sim(9)); await shot('20_cell_send');
  await ev(() => __game.G.sim(6));
  check(await ev(() => window.__done2), 'Interlude 1 completed');
  const perf = await ev(() => { __game.flow.level1(3); const G = __game.G; G.sim(2); const t0 = performance.now(); for (let i = 0; i < 20; i++) G.render(); return (performance.now() - t0) / 20; });
  console.log('Level 1 render ms/frame:', perf.toFixed(1));
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  console.log(fails.length ? 'FAILED: ' + fails.length : 'ALL CHECKS PASSED');
  await browser.close();
})();
