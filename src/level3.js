/* level3.js - Level 3 "Kamal Sarovar" (lean demo build): lake of lotus, Vishnu's chakra (Q), Hall of Gold (Lakshmi's test), corrupted Naga Queen.
 * CG: sine-ripple water shading, Bezier causeway, rotating chakra (2D rotation + lines), painter's algorithm, point-light dimming per coin.
 */
var Level3 = (function () {
  'use strict';
  const C = CG, { rgba, hex, clamp } = C, H = Level1.H, { Enemy, spr, shadow, viewOf, WW, WH, SW, SH } = H;
  const N = [[300, 1150], [700, 900], [1150, 700], [1550, 330]];
  const SEG = [[[300, 1150], [500, 1150], [550, 950], [700, 900]], [[700, 900], [900, 850], [950, 720], [1150, 700]], [[1150, 700], [1350, 680], [1450, 500], [1550, 330]]];
  const RAD = 190, FREE = [1270, 640], COINS = Array.from({ length: 9 }, (_, i) => [1150 + Math.cos(i * 0.7) * (100 + i % 3 * 25), 700 + Math.sin(i * 0.7) * (70 + i % 3 * 20)]);
  let G3 = null;
  const dryAt = (x, y, tr) => { for (const n of N) if (Math.hypot(x - n[0], (y - n[1]) * 1.3) < RAD) return true; for (const q of tr) if (Math.hypot(x - q[0], y - q[1]) < 62) return true; return false; };
  function art() {
    if (G3) return G3;
    const g = new C.Surface(WW, WH); C.setTarget(g); const d = g.d, r = C.rng(3);
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const k = 0.78 + 0.22 * Math.sin(x * 0.045 + Math.sin(y * 0.031) * 3 + y * 0.01); d[y * WW + x] = rgba(Math.round(18 * k), Math.round(92 * k), Math.round(125 * k), 255); }
    const tr = []; SEG.forEach(s => C.bezierPoints(s, 40).forEach(p => tr.push(p)));
    for (let i = 0; i + 1 < tr.length; i++) { C.lineThick(tr[i][0], tr[i][1], tr[i + 1][0], tr[i + 1][1], 130, rgba(30, 25, 20, 90)); C.lineThick(tr[i][0], tr[i][1], tr[i + 1][0], tr[i + 1][1], 112, rgba(170, 150, 118, 255)); C.lineThick(tr[i][0], tr[i][1], tr[i + 1][0], tr[i + 1][1], 84, rgba(196, 176, 140, 255)); }
    for (const n of N) { C.ellipseFill(n[0], n[1], RAD + 8, RAD * 0.77 + 8, rgba(40, 30, 20, 120)); C.ellipseFill(n[0], n[1], RAD, RAD * 0.77, rgba(176, 156, 122, 255)); C.ellipseFill(n[0], n[1], RAD - 22, RAD * 0.77 - 18, rgba(204, 186, 150, 255)); C.ellipse(n[0], n[1], 60, 46, rgba(120, 90, 50, 255)); }
    for (let i = 0; i < 260; i++) { const x = r.range(20, WW - 20), y = r.range(20, WH - 20); if (dryAt(x, y, tr)) continue; const s = r.range(10, 22); C.ellipseFill(x, y, s, s * 0.6, rgba(30, 120 + r.int(0, 40), 70, 255)); if (r.int(0, 3) === 0) { C.disc(x, y - 3, 5, rgba(255, 150, 200, 255)); C.disc(x, y - 4, 2, rgba(255, 230, 120, 255)); } }
    return G3 = { ground: g, tr };
  }
  class Queen extends Enemy {
    constructor(x, y, hp) { super('cultist', x, y); this.hp = this.maxhp = hp; this.speed = 95; this.boss = true; this.ring = 2.5; this.rot = 0; }
    update(dt, L) { super.update(dt, L); if (this.hp <= 0 || L.cut) return; this.ring -= dt; if (this.ring <= 0) { this.ring = 3.2; this.rot += 0.4; for (let i = 0; i < 8; i++) { const a = this.rot + i * Math.PI / 4; L.shootAt(this.x, this.y - 40, this.x + Math.cos(a) * 100, this.y - 40 + Math.sin(a) * 100, 210, true); } L.puff(this.x, this.y); } }
  }
  class Level3 extends Level2 {
    enter() {
      const A = Level1.preload(), g = art();
      this.lake = true;
      const P = this.P = { name: 'devanshi', x: 300, y: 1150, hw: 12, hh: 8, hp: 5, face: [1, -1], atk: 0, atkHit: false, dodge: 0, dodgeCd: 0, dv: [0, 1], inv: 0, stun: 0, kb: [0, 0], flash: 0, sword: true, moving: false, ph: 0, dead: 0, bow: false, chk: null, chkOn: false };
      this.Ah = { name: 'aahana', x: -999, y: -999, hw: 1, hh: 1, face: [0, 1], mode: 'frozen', held: false };
      this.cam = { x: 0, y: clamp(P.y - SH / 2, 0, WH - SH) }; this.camOv = null; this.fx = new G.Fx(); this.enemies = []; this.arrows = []; this.vill = []; this.rit = []; this.diyas = []; this.props = []; this.cols = [];
      this.combat = true; this.cut = false; this.objective = ''; this.hintS = ''; this.hintT = 0; this.wave = -1; this.hitstop = 0; this.time = 0; this.ecl = 0; this.bless = 0; this.aura = 1; this.hand = null; this.fireOn = false; this.rta = { s: -1 }; this.gods = null; this.boss = null; this.node = 0; this.cp = [300, 1150];
      this.gold = 0; this.freed = false; this.freeT = 0; this.coins = COINS.map(c => ({ x: c[0], y: c[1], got: false })); this.owl = { x: 260, y: 1100 }; this.blessed = false; this.used = false; this.bossFight = false; this.naga = true;
      this.script = new G.Script(this.run()); this.aux = null; AUD.setMood('calm'); AUD.setRaag('bhoopali');
    }
    blocked(x, y, hw, hh) { return super.blocked(x, y, hw, hh) || !dryAt(x, y - 4, art().tr); }
    nearN(i) { return Math.hypot(this.P.x - N[i][0], this.P.y - N[i][1]) < 90; }
    spawnWave(w) {
      this.enemies = []; const n = N[this.node];
      for (const [t, a] of w === 0 ? [['imp', 0], ['imp', 2.1], ['cultist', 4.2]] : [['cultist', 0.5], ['imp', 2], ['imp', 3.5], ['cultist', 5]]) { const e = new Enemy(t, n[0] + Math.cos(a) * 140, n[1] + Math.sin(a) * 100); this.enemies.push(e); this.puff(e.x, e.y); }
      this.objective = 'Defeat the shadow guardians (' + (w + 1) + '/2)';
    }
    spawnGuards(k) { const P = this.P; for (let i = 0; i < k; i++) { const a = Math.random() * 6.28, e = new Enemy('imp', N[2][0] + Math.cos(a) * 150, N[2][1] + Math.sin(a) * 100); this.enemies.push(e); this.puff(e.x, e.y); } }
    spawnBoss() { this.enemies = []; const b = new Queen(N[3][0], N[3][1] - 40, clamp(10 + this.gold, 10, 18)); this.boss = b; this.enemies.push(b); this.puff(b.x, b.y); }
    respawn() {
      const P = this.P;
      if (this.blessed && !this.used) { this.used = true; P.hp = 5; P.dead = 0; P.inv = 2; P.stun = 0; G.flash = 0.8; AUD.chime(); this.fx.burst(P.x, P.y - 40, 40, hex('#ffd0e8'), 220, 0.9); G.fadeTo(0, 0.6); return; } // Lakshmi's lotus blessing: revive once
      super.respawn(); P.x = this.cp[0]; P.y = this.cp[1] + 30;
    }
    *run() {
      const L = this, P = this.P, say = G.say;
      yield 1.2;
      yield* say('Devanshi', 'A lake of lotus... and the veena is faint here. Aahana, which way did they take you?', 'worried');
      L.objective = 'Cross the causeway'; L.hint('WASD: Move      Shift: Dodge      Space: Sword      ', 3); L.hint('Stay on the stone causeway. The water will not hold you.', 7);
      yield () => L.nearN(1);
      L.cut = true; L.cp = N[1].slice(); L.node = 1; AUD.chime(); G.flash = 0.6; L.camSet(N[1][0], N[1][1] - 40);
      yield* say('Vishnu', 'Daughter of the lamp, take my chakra. It flies true and it always returns, like a promise kept.', 'neutral');
      P.chkOn = true; L.fx.burst(P.x, P.y - 50, 40, hex('#7ac0ff'), 220, 0.9); L.camOv = null; L.cut = false;
      yield* say('Devanshi', 'It is humming. Thank you, Lord Vishnu.', 'smile');
      L.hint('Q: Throw the chakra (hits going out and coming back)', 8); yield () => L.nearN(2);
      L.cp = N[2].slice(); L.node = 2; AUD.setMood('tense');
      yield* say('Devanshi', 'Treasure... heaps of it. And a cage of nagas hidden behind it. Something is wrong here.', 'worried');
      L.objective = 'Hall of Gold: take what you need... or free the nagas (E)'; L.hint('Walk over gold to take it. Stand near the cage and press E to free them.', 8);
      yield () => L.freed || L.nearN(3);
      if (L.freed) {
        L.cut = true; L.cp = N[2].slice(); AUD.chime(); G.flash = 0.8; L.camSet(P.x, P.y - 60);
        yield* say('Lakshmi', 'You chose the captives over the coins, child. That is the wealth I follow. Take my lotus blessing.', 'neutral');
        L.blessed = true; L.cut = false; L.camOv = null; L.hint('Lotus blessing: you will be revived once', 7);
        yield* say('Devanshi', 'The owl... it was you all along.', 'smile');
        L.objective = 'Cross to the Naga Queen'; yield () => L.nearN(3);
      }
      L.cp = N[3].slice(); L.node = 3; L.cut = true;
      yield* say('Naga Queen', L.gold > 4 ? 'More gold! You are just like us, little one. Stay and glitter!' : 'Tamasur promised me every jewel under the lake. I will not give them up!', 'fierce');
      L.cut = false; L.bossFight = true; L.spawnBoss(); L.objective = 'Defeat the corrupted Naga Queen'; L.hint(L.gold > 3 ? 'Greed made her stronger (' + L.gold + ' coins taken)' : 'Dodge her ring of fire, then strike!', 7);
      yield 0.5; yield () => L.boss.hp <= 0;
      L.enemies.forEach(e => e.hp = 0); L.bossFight = false; L.objective = ''; AUD.chime(); L.fx.burst(L.boss.x, L.boss.y - 40, 50, hex('#9aff90'), 260, 1); G.flash = 0.7; yield 2;
      yield* say('Devanshi', 'Her greed has loosened. Aahana, I am closer now. Hold on.', 'determined');
      G.fadeTo(1, 0.9, () => { if (L.onComplete) L.onComplete(); }); yield 99;
    }
    update(dt) {
      super.update(dt); if (this.hitstop > 0) return;
      const P = this.P, free = !G.dlg && !this.cut && !P.dead;
      // chakra: out to nearest enemy, then home (hits both ways)
      if (free && P.chkOn && !P.chk && G.hit('KeyQ') && P.stun <= 0) { let b = null, bd = 480; for (const e of this.enemies) if (e.hp > 0) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; b = e; } } const tx = b ? b.x : P.x + P.face[0] * 100, ty = b ? b.y - 40 : P.y - 44 + P.face[1] * 100, l = Math.hypot(tx - P.x, ty - P.y + 44) || 1; P.chk = { x: P.x, y: P.y - 44, vx: (tx - P.x) / l * 560, vy: (ty - P.y + 44) / l * 560, back: false, t: 0, hit: new Set(), a: 0 }; AUD.swing(); }
      const c = P.chk; if (c) {
        c.t += dt; c.a += dt * 22; if (!c.back && c.t > 0.5) { c.back = true; c.hit.clear(); }
        if (c.back) { const dx = P.x - c.x, dy = P.y - 44 - c.y, l = Math.hypot(dx, dy) || 1; c.vx = dx / l * 640; c.vy = dy / l * 640; if (l < 26) P.chk = null; }
        c.x += c.vx * dt; c.y += c.vy * dt;
        for (const e of this.enemies) if (P.chk && e.hp > 0 && !c.hit.has(e) && Math.hypot(c.x - e.x, c.y - (e.y - 40)) < 34) { c.hit.add(e); e.hurt(1, c.vx, c.vy); this.fx.burst(c.x, c.y, 8, hex('#9ad0ff'), 150, 0.3); AUD.hit(false); }
        if (c.t > 4) P.chk = null;
      }
      // gold: tempting reward, but it dims the lake and wakes guardians
      if (free && this.node === 2 && !this.freed) for (const k of this.coins) if (!k.got && Math.hypot(P.x - k.x, P.y - k.y) < 28) { k.got = true; this.gold++; if (P.hp < 5) P.hp++; AUD.pluck(660 + this.gold * 40, 0.3); this.fx.burst(k.x, k.y - 10, 10, hex('#ffd24a'), 110, 0.5); if (this.gold % 3 === 0) { this.spawnGuards(2); this.hint('The gold stirs the shadows...', 4); } }
      // freeing the nagas: press E beside the cage, then stay put for 3 seconds
      if (free && this.node === 2 && !this.freed) {
        const d = Math.hypot(P.x - FREE[0], P.y - FREE[1]);
        if (d < 90 && this.freeT === 0 && G.hit('KeyE')) this.freeT = 0.01;
        if (this.freeT > 0) { if (d >= 90) this.freeT = 0; else { this.freeT += dt; if (this.freeT >= 3) { this.freed = true; this.naga = false; G.flash = 0.5; this.fx.burst(FREE[0], FREE[1] - 40, 40, hex('#8aff9a'), 200, 0.9); } } }
      }
      this.owl.x += (P.x - 30 - this.owl.x) * Math.min(1, dt * 3); this.owl.y += (P.y - 110 - this.owl.y) * Math.min(1, dt * 3);
    }
    draw() {
      const FB = C.getFB(), P = this.P, a = art(), t = G.t, sh = G.shake;
      const cx = Math.round(this.cam.x + (sh ? (Math.random() - 0.5) * 14 * sh : 0)), cy = Math.round(this.cam.y + (sh ? (Math.random() - 0.5) * 14 * sh : 0));
      C.blit(a.ground, -cx, -cy);
      for (let i = 0; i < 40; i++) { const x = (i * 197 + t * 14) % WW, y = (i * 311) % WH; if (!dryAt(x, y, a.tr)) C.line(x - cx, y - cy, x - cx + 14, y - cy, rgba(190, 235, 255, 70 + 40 * Math.sin(t * 2 + i))); }
      const items = [], add = (y, fn) => items.push([y, fn]), on = (x, y) => x > cx - 80 && x < cx + SW + 80 && y > cy - 60 && y < cy + SH + 520;
      shadow(ART.char('devanshi', viewOf(P.face)), P.x - cx, P.y - cy, 0.3);
      for (const e of this.enemies) if (e.hp > 0 && on(e.x, e.y)) shadow(e.type === 'imp' ? ART.char('imp', 'front') : ART.char('cultist', viewOf(e.face)), e.x - cx, e.y - cy, 0.28);
      if (this.node >= 2) for (const k of this.coins) if (!k.got) add(k.y, () => { const w = Math.abs(Math.sin(t * 3 + k.x)); C.ellipseFill(k.x - cx, k.y - 8 - cy, 8 * (0.4 + 0.6 * w) + 2, 8, rgba(255, 210, 60, 255)); C.radial(k.x - cx, k.y - 8 - cy, 22, rgba(255, 200, 60, 90), 2); });
      if (this.naga) add(FREE[1], () => { const x = FREE[0] - cx, y = FREE[1] - cy; for (let i = -3; i <= 3; i++) C.line(x + i * 9, y - 70, x + i * 9, y, rgba(60, 40, 20, 255)); C.line(x - 30, y - 70, x + 30, y - 70, rgba(60, 40, 20, 255)); C.ellipseFill(x - 8, y - 20, 14, 8, rgba(60, 170, 80, 255)); C.ellipseFill(x + 12, y - 28, 10, 7, rgba(90, 190, 100, 255)); if (this.freeT > 0) { C.rect(x - 30, y - 90, 60, 8, rgba(0, 0, 0, 180)); C.rect(x - 28, y - 88, Math.round(56 * Math.min(1, this.freeT / 3)), 4, hex('#8aff9a')); } });
      for (const e of this.enemies) add(e.y, () => this.drawEnemy(e, cx, cy));
      add(P.y, () => { C.radial(P.x - cx, P.y - 40 - cy, 70, rgba(255, 150, 60, 70), 2); this.drawPlayer(cx, cy); });
      add(99998, () => { const o = this.owl, x = o.x - cx, y = o.y - cy + Math.sin(t * 4) * 4; C.fillPolygon([[x - 6, y], [x - 22, y - 8 - Math.sin(t * 10) * 5], [x - 8, y + 6]], rgba(150, 110, 70, 255)); C.fillPolygon([[x + 6, y], [x + 22, y - 8 - Math.sin(t * 10) * 5], [x + 8, y + 6]], rgba(150, 110, 70, 255)); C.ellipseFill(x, y, 9, 11, rgba(190, 150, 100, 255)); C.disc(x - 3, y - 4, 3, rgba(255, 255, 255, 255)); C.disc(x + 3, y - 4, 3, rgba(255, 255, 255, 255)); C.disc(x - 3, y - 4, 1, rgba(0, 0, 0, 255)); C.disc(x + 3, y - 4, 1, rgba(0, 0, 0, 255)); if (this.blessed) C.radial(x, y, 40, rgba(255, 200, 230, 80), 2); });
      items.sort((p, q) => p[0] - q[0]); for (const it of items) it[1]();
      for (const ar of this.arrows) { const ang = Math.atan2(ar.vy, ar.vx), x = ar.x - cx, y = ar.y - cy; C.lineThick(x - Math.cos(ang) * 14, y - Math.sin(ang) * 14, x, y, 3, rgba(255, 110, 60, 255)); C.radial(x, y, 14, rgba(255, 60, 30, 120), 2); }
      const c = P.chk; if (c) { const x = c.x - cx, y = c.y - cy; C.radial(x, y, 30, rgba(120, 190, 255, 140), 2); for (let i = 0; i < 8; i++) { const an = c.a + i * Math.PI / 4; C.lineThick(x + Math.cos(an) * 8, y + Math.sin(an) * 8, x + Math.cos(an) * 20, y + Math.sin(an) * 20, 2, rgba(220, 240, 255, 255)); } C.circle(x, y, 20, rgba(255, 255, 255, 255)); C.circle(x, y, 8, rgba(180, 220, 255, 255)); }
      this.fx.draw(cx, cy);
      const dim = 1 - Math.min(0.55, this.gold * 0.07), lights = [{ x: P.x - cx, y: P.y - 40 - cy, r: 230 * dim, c: [0.8, 0.95, 1], i: 0.6 * dim }];
      for (let i = this.node; i < 4; i++) lights.push({ x: N[i][0] - cx, y: N[i][1] - 20 - cy, r: 200, c: i === 2 ? [1, 0.8, 0.4] : [0.6, 0.85, 1], i: 0.6 * dim });
      if (P.atk > 0) lights.push({ x: P.x - cx, y: P.y - 40 - cy, r: 170, c: [1, 0.55, 0.25], i: 0.6 });
      for (const ar of this.arrows) lights.push({ x: ar.x - cx, y: ar.y - cy, r: 70, c: [1, 0.3, 0.2], i: 0.6 });
      C.lighting(FB, [0.42 * dim + 0.06, 0.52 * dim + 0.08, 0.62 * dim + 0.1], lights, 0.35);
      this.hud3();
    }
    hud3() {
      const P = this.P, A = Level1.preload(), t = G.t, b = this.boss;
      for (let i = 0; i < 5; i++) { const x = 30 + i * 34, y = 40; C.blit(A.diya, x - A.diya.ax + 14, y - A.diya.ay + 14); if (i < P.hp) ART.drawFlame(x + 14, y + 3, 18, t, i + 1, false); }
      if (this.objective) G.text(this.objective, 26, 58, { size: 18, color: '#ffe3a0' });
      if (P.chkOn) G.text('Q  Chakra' + (P.chk ? ' ...' : ''), 26, 82, { size: 15, color: '#9ad0ff' });
      if (this.node >= 2) G.text('Gold: ' + this.gold, 26, 100, { size: 15, color: '#ffd24a' });
      if (this.blessed) G.text(this.used ? 'Lotus blessing used' : 'Lotus blessing ready', 26, 118, { size: 15, color: '#ffc0e0' });
      if (this.hintT > 0 && !G.dlg && this.hintS) { const w = 12 + this.hintS.length * 8.4; C.rect(480 - w / 2, 474, w, 34, rgba(0, 0, 0, 150)); G.text(this.hintS, 480, 481, { size: 19, align: 'center', color: '#fff4d0' }); }
      if (b && b.hp > 0 && this.bossFight) { C.rect(330, 20, 300, 12, rgba(0, 0, 0, 190)); C.rect(332, 22, Math.round(296 * b.hp / b.maxhp), 8, hex('#3aa040')); G.text('Naga Queen', 480, 34, { size: 14, align: 'center', color: '#c8ffc0' }); }
    }
  }
  return Level3;
})();
