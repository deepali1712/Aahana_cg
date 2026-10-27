/* level2.js - Level 2 "Chhaya Van" (lean demo build). Extends Level1 so player, combat and drawing are shared.
 * Beats: Aahana's veena note guides Devanshi -> Vayu gives the bow (F) -> wave of imps and archers -> Mayavi mini-boss (illusions).
 * CG used: Bezier path (forest trail + camera), scanline/noise ground, painter's algorithm, point-light lighting,
 * 2D transforms (arrow rotation, clone flicker), window-to-viewport minimap with Sutherland-Hodgman clipped camera box.
 */
var Level2 = (function () {
  'use strict';
  const C = CG, { rgba, hex, clamp, lerp } = C, H = Level1.H, { Enemy, spr, shadow, viewOf, ease, WW, WH, SW, SH } = H;
  const NODES = [[300, 1180], [760, 930], [1180, 640], [1560, 300]];
  const TRAIL = [[300, 1180], [520, 1230], [560, 900], [760, 930], [980, 780], [1180, 900], [1180, 640], [1400, 560], [1560, 420], [1560, 300]];
  let G2 = null;
  function art() {
    if (G2) return G2;
    const g = new C.Surface(WW, WH); C.setTarget(g); ART.sand(g, 0, 0, WW, WH);
    const d = g.d, n = d.length, r = C.rng(7);
    for (let i = 0; i < n; i++) { const c = d[i], k = 0.55 + 0.25 * ((i % 7) / 7); d[i] = rgba(Math.round((c & 255) * 0.28 * k + 10), Math.round(((c >>> 8) & 255) * 0.5 * k + 28), Math.round(((c >>> 16) & 255) * 0.32 * k + 14), 255); }
    for (let i = 0; i < 900; i++) C.disc(r.range(0, WW), r.range(0, WH), r.range(3, 9), rgba(20, 70 + r.int(0, 50), 40, 40)); // moss patches
    const pts = C.bezierPoints(TRAIL.slice(0, 4), 40).concat(C.bezierPoints(TRAIL.slice(3, 7), 40), C.bezierPoints(TRAIL.slice(6, 10), 40)); // trail = Bezier segments
    for (let i = 0; i + 1 < pts.length; i++) { C.lineThick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 64, rgba(120, 100, 70, 90)); C.lineThick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 40, rgba(150, 125, 85, 120)); }
    G2 = { ground: g, trail: pts, tree: [ART.tree(11), ART.tree(12), ART.tree(13)], rock: [ART.rock(5), ART.rock(6)], bush: [ART.bush(5), ART.bush(6)], shrub: [ART.dryShrub(5)] };
    return G2;
  }
  function Fx() { }
  class Archer extends Enemy {
    constructor(x, y) { super('cultist', x, y); this.hp = this.maxhp = 2; this.shoot = 1.2 + Math.random(); this.wu = 0; this.speed = 90; }
    update(dt, L) {
      if (this.hp <= 0 || this.hs > 0) return super.update(dt, L);
      this.flash = Math.max(0, this.flash - dt); this.moving = false;
      const P = L.P, dx = P.x - this.x, dy = P.y - this.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d; this.face = [nx, ny];
      if (this.wu > 0) { this.wu -= dt; this.state = 'windup'; if (this.wu <= 0) { L.shootAt(this.x, this.y - 40, P.x, P.y - 40, 250, true); this.state = 'chase'; this.shoot = 2 + Math.random(); } return; }
      const s = this.speed * dt; this.moving = true;
      if (d < 230) L.tryMove(this, -nx * s, -ny * s); else if (d > 380) L.tryMove(this, nx * s, ny * s); else this.moving = false;
      this.shoot -= dt; if (this.shoot <= 0) this.wu = 0.6;
    }
  }
  class Mayavi extends Enemy {
    constructor(x, y) { super('cultist', x, y); this.hp = this.maxhp = 12; this.speed = 125; this.boss = true; this.tp = 3; }
    update(dt, L) {
      super.update(dt, L); if (this.hp <= 0) return;
      this.tp -= dt;
      if (this.tp <= 0 && this.state !== 'lunge' && this.state !== 'windup' && this.hs <= 0) {
        this.tp = 4.5; const a = Math.random() * 6.28; L.puff(this.x, this.y);
        this.x = clamp(L.P.x + Math.cos(a) * 260, 60, WW - 60); this.y = clamp(L.P.y + Math.sin(a) * 200, 80, WH - 60); L.puff(this.x, this.y);
        let alive = L.enemies.filter(e => e.clone && e.hp > 0).length;
        for (let i = alive; i < 3; i++) { const b = Math.random() * 6.28, c = new Enemy('cultist', clamp(L.P.x + Math.cos(b) * 240, 60, WW - 60), clamp(L.P.y + Math.sin(b) * 200, 80, WH - 60)); c.hp = c.maxhp = 1; c.clone = true; c.speed = 95; L.enemies.push(c); L.puff(c.x, c.y); }
      }
    }
  }

  class Level2 extends Level1 {
    constructor(startPhase, onComplete) { super(startPhase, onComplete); }
    enter() {
      const A = Level1.preload(), g = art();
      const P = this.P = { name: 'devanshi', x: 300, y: 1180, hw: 12, hh: 8, hp: 5, face: [1, -1], atk: 0, atkHit: false, dodge: 0, dodgeCd: 0, dv: [0, 1], inv: 0, stun: 0, kb: [0, 0], flash: 0, sword: true, moving: false, ph: 0, dead: 0, bow: false, bowCd: 0 };
      this.Ah = { name: 'aahana', x: -999, y: -999, hw: 1, hh: 1, face: [0, 1], mode: 'frozen', held: false };
      this.cam = { x: 0, y: 760 }; this.camOv = null; this.fx = new G.Fx(); this.enemies = []; this.arrows = []; this.vill = []; this.rit = []; this.diyas = [];
      this.combat = true; this.cut = false; this.objective = ''; this.hintS = ''; this.hintT = 0; this.wave = -1; this.hitstop = 0; this.time = 0; this.ecl = 0; this.bless = 0; this.aura = 1; this.hand = null; this.fireOn = false; this.rta = { s: -1 }; this.gods = null; this.fireP = 0; this.boss = null; this.node = 0; this.cp = [300, 1180];
      const cols = this.cols = [], props = this.props = [], r = C.rng(21);
      let tries = 0; while (props.length < 150 && tries++ < 2000) {
        const x = r.range(40, WW - 40), y = r.range(120, WH - 20); let ok = true;
        for (const q of g.trail) if (Math.hypot(q[0] - x, q[1] - y) < 120) { ok = false; break; }
        for (const q of NODES) if (Math.hypot(q[0] - x, q[1] - y) < 260) ok = false;
        if (!ok) continue; const k = r.int(0, 9);
        if (k < 6) { const s = g.tree[k % 3]; props.push({ s, x, y }); cols.push({ x: x - 14, y: y - 14, w: 28, h: 14 }); } else if (k < 8) props.push({ s: g.bush[k % 2], x, y }); else props.push({ s: g.rock[k % 2], x, y });
      }
      this.motes = Array.from({ length: 40 }, () => ({ x: r.range(0, WW), y: r.range(0, WH), p: r.range(0, 6) }));
      this.script = new G.Script(this.run(this.ph)); this.aux = null; AUD.setMood('calm'); AUD.setRaag('bhairavi');
      this.cam = { x: 0, y: clamp(P.y - SH / 2, 0, WH - SH) };
    }
    puff(x, y) { this.fx.burst(x, y - 40, 14, hex('#c060ff'), 140, 0.5); }
    shootAt(x, y, tx, ty, sp, hostile) { const l = Math.hypot(tx - x, ty - y) || 1; this.arrows.push({ x, y, vx: (tx - x) / l * sp, vy: (ty - y) / l * sp, life: 2.2, h: !!hostile }); }
    spawnWave(w) {
      this.enemies = []; const P = this.P, n = this.node;
      const list = [[['imp', -380, 120], ['imp', 380, -120], ['archer', 0, -330]], [['cultist', -420, 0], ['cultist', 420, 60], ['archer', -300, -300], ['archer', 300, 300]]][w] || [];
      for (const [t, ox, oy] of list) {
        const x = clamp(P.x + ox, 60, WW - 60), y = clamp(P.y + oy, 100, WH - 60), e = t === 'archer' ? new Archer(x, y) : new Enemy(t, x, y);
        this.enemies.push(e); this.puff(x, y);
      }
      this.objective = 'Defeat the shadows (wave ' + (w + 1) + '/2)';
    }
    respawn() { const P = this.P; P.hp = 5; P.dead = 0; P.inv = 1.5; P.kb = [0, 0]; P.stun = 0; P.atk = 0; P.dodge = 0; P.x = this.cp[0]; P.y = this.cp[1] + 30; this.arrows = []; if (this.wave >= 0) this.spawnWave(this.wave); if (this.bossFight) this.spawnBoss(); G.fadeTo(0, 1.6); }
    spawnBoss() { this.enemies = []; const b = new Mayavi(NODES[3][0] + 200, NODES[3][1] + 120); this.boss = b; this.enemies.push(b); this.puff(b.x, b.y); }
    nearN(i) { return Math.hypot(this.P.x - NODES[i][0], this.P.y - NODES[i][1]) < 90; }
    *run() {
      const L = this, P = this.P, say = G.say;
      yield 1.2;
      yield* say('Devanshi', 'That note... it is Aahana\u2019s veena. I can hear her through the trees. Aahana, I am coming.', 'determined');
      yield* say('Devanshi', 'These woods are full of illusions. I will follow the song.', 'neutral');
      L.objective = 'Follow the veena\u2019s song'; L.hint('WASD: Move      Shift: Dodge      Space: Sword', 7);
      yield () => L.nearN(1);
      /* ----- Vayu gives the bow ----- */
      L.cut = true; L.cp = NODES[1].slice(); L.node = 1; AUD.chime(); G.flash = 0.6; L.camSet(NODES[1][0], NODES[1][1] - 40); P.moving = false;
      yield* say('Vayu', 'Daughter of Durga, the wind carries your sister\u2019s song. Take my bow. Strike what you cannot reach.', 'neutral');
      P.bow = true; L.fx.burst(P.x, P.y - 50, 40, hex('#7af0b0'), 220, 0.9); L.camOv = null; L.cut = false;
      yield* say('Devanshi', 'A bow of wind. Thank you, Lord Vayu.', 'smile');
      L.hint('F: Shoot the bow (aims at the nearest enemy)', 8); L.objective = 'Follow the veena\u2019s song'; yield () => L.nearN(2);
      /* ----- waves ----- */
      L.cp = NODES[2].slice(); L.node = 2; AUD.setMood('tense');
      yield* say('Devanshi', 'Shadows... and archers hiding in the branches. Use the bow on them!', 'fierce');
      for (let w = 0; w < 2; w++) { L.wave = w; L.spawnWave(w); yield 0.5; yield () => L.enemies.every(e => e.gone); yield 1; }
      L.wave = -1; L.objective = 'Follow the veena\u2019s song'; AUD.chime(); yield () => L.nearN(3);
      /* ----- Mayavi ----- */
      L.cp = NODES[3].slice(); L.node = 3; L.cut = true; L.bossFight = false;
      yield* say('Mayavi', 'Which of us is real, little warrior? Your sister\u2019s song leads only to me.', 'fierce');
      L.cut = false; L.bossFight = true; L.spawnBoss(); L.objective = 'Mayavi: only the real one casts a shadow'; L.hint('Illusions flicker and cast no shadow. Strike the real one!', 8);
      yield 0.5; yield () => L.boss.hp <= 0;
      L.enemies.forEach(e => { if (e.clone) e.hp = 0; });
      L.bossFight = false; L.objective = ''; AUD.chime(); L.fx.burst(L.boss.x, L.boss.y - 40, 50, hex('#e080ff'), 260, 1); G.flash = 0.7;
      yield 2.0;
      yield* say('Devanshi', 'The illusions are gone. Hold on, Aahana. Wait for me.', 'determined');
      G.fadeTo(1, 0.9, () => { if (L.onComplete) L.onComplete(); }); yield 99;
    }
    update(dt) {
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      this.time += dt; const P = this.P;
      this.script.update(dt); if (this.aux) { this.aux.update(dt); if (this.aux.done) this.aux = null; }
      this.fx.update(dt);
      this.updatePlayer(dt, !!G.dlg || this.cut);
      if (!G.dlg) for (const e of this.enemies) e.update(dt, this);
      this.enemies = this.enemies.filter(e => !e.gone);
      if (this.hintT > 0 && !G.dlg) this.hintT -= dt;
      // bow
      P.bowCd = Math.max(0, P.bowCd - dt);
      if (P.bow && !G.dlg && !this.cut && P.stun <= 0 && !P.dead && G.hit('KeyF') && P.bowCd <= 0) {
        let best = null, bd = 520; for (const e of this.enemies) if (e.hp > 0) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = e; } }
        const tx = best ? best.x : P.x + P.face[0] * 100, ty = best ? best.y - 40 : P.y - 44 + P.face[1] * 100;
        this.shootAt(P.x, P.y - 44, tx, ty, 560, false); P.bowCd = 0.45; AUD.swing();
      }
      for (const a of this.arrows) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        if (a.h) { if (Math.hypot(a.x - P.x, a.y - (P.y - 40)) < 22 && this.hurtPlayer(1, a.x - a.vx, a.y - a.vy)) a.life = 0; }
        else for (const e of this.enemies) if (e.hp > 0 && Math.hypot(a.x - e.x, a.y - (e.y - 40)) < 26) { e.hurt(1, a.vx, a.vy); this.fx.burst(a.x, a.y, 8, hex('#9affc8'), 150, 0.3); AUD.hit(false); a.life = 0; break; }
        if (!this.lake && this.blocked(a.x, a.y + 40, 2, 2) && a.life < 2.1) { /* trees stop arrows */ a.life = 0; }
      }
      this.arrows = this.arrows.filter(a => a.life > 0);
      const T = this.camOv || [P.x, P.y - 20], tx = clamp(T[0] - SW / 2, 0, WW - SW), ty = clamp(T[1] - SH / 2, 0, WH - SH), k = this.camOv ? 1 : Math.min(1, dt * 6);
      this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    }
    draw() {
      const FB = C.getFB(), P = this.P, a = art(), t = G.t, sh = G.shake;
      const cx = Math.round(this.cam.x + (sh ? (Math.random() - 0.5) * 14 * sh : 0)), cy = Math.round(this.cam.y + (sh ? (Math.random() - 0.5) * 14 * sh : 0));
      C.blit(a.ground, -cx, -cy);
      const items = [], add = (y, fn) => items.push([y, fn]), on = (x, y, m) => x > cx - m && x < cx + SW + m && y > cy - 60 && y < cy + SH + 520;
      shadow(ART.char('devanshi', viewOf(P.face)), P.x - cx, P.y - cy, 0.3);
      for (const e of this.enemies) if (e.hp > 0 && !e.clone && on(e.x, e.y, 80)) shadow(e.type === 'imp' ? ART.char('imp', 'front') : ART.char('cultist', viewOf(e.face)), e.x - cx, e.y - cy, 0.28); // illusions cast no shadow
      for (const p of this.props) if (on(p.x, p.y, 300)) add(p.y, () => C.blit(p.s, p.x - p.s.ax - cx, p.y - p.s.ay - cy));
      for (const i of [0, 1, 2, 3]) { const n = NODES[i]; if (i >= this.node && on(n[0], n[1], 100)) add(n[1] - 5, () => { const p = 0.5 + 0.5 * Math.sin(t * 3 + i); ART.drawMandala(n[0] - cx, n[1] - 30 - cy, 26 + 4 * p, t, [hex('#bfe4ff'), hex('#6aa8ff'), hex('#ffffff')]); }); }
      for (const e of this.enemies) add(e.y, () => this.drawEnemy(e, cx, cy));
      add(P.y, () => { C.radial(P.x - cx, P.y - 40 - cy, 70, rgba(255, 150, 60, 70), 2); this.drawPlayer(cx, cy); });
      add(99999, () => { for (const m of this.motes) { const x = m.x + Math.sin(t * 0.6 + m.p) * 30 - cx, y = m.y + Math.cos(t * 0.5 + m.p) * 20 - cy; if (x > -10 && x < SW + 10 && y > -10 && y < SH + 10) C.disc(x, y, 2, rgba(200, 255, 160, Math.round(120 + 100 * Math.sin(t * 3 + m.p)))); } });
      items.sort((p, q) => p[0] - q[0]); for (const it of items) it[1]();
      for (const ar of this.arrows) { const ang = Math.atan2(ar.vy, ar.vx), x = ar.x - cx, y = ar.y - cy, c = ar.h ? rgba(255, 90, 60, 255) : rgba(170, 255, 210, 255); C.lineThick(x - Math.cos(ang) * 22, y - Math.sin(ang) * 22, x, y, 3, c); C.radial(x, y, 14, ar.h ? rgba(255, 60, 30, 120) : rgba(120, 255, 190, 120), 2); }
      this.fx.draw(cx, cy);
      const lights = [{ x: P.x - cx, y: P.y - 40 - cy, r: 220, c: [0.7, 0.9, 1], i: 0.55 }];
      for (const i of [0, 1, 2, 3]) if (i >= this.node) lights.push({ x: NODES[i][0] - cx, y: NODES[i][1] - 30 - cy, r: 150, c: [0.5, 0.7, 1], i: 0.8 });
      for (const arw of this.arrows) lights.push({ x: arw.x - cx, y: arw.y - cy, r: 70, c: arw.h ? [1, 0.3, 0.2] : [0.5, 1, 0.7], i: 0.6 });
      if (P.atk > 0) lights.push({ x: P.x - cx, y: P.y - 40 - cy, r: 170, c: [1, 0.55, 0.25], i: 0.6 });
      C.lighting(FB, [0.30, 0.42, 0.50], lights, 0.35);
      this.drawHud2(cx, cy);
    }
    drawEnemy(e, cx, cy) {
      if (!e.boss && !e.clone) return super.drawEnemy(e, cx, cy);
      const s = ART.char('cultist', viewOf(e.face)), fl = e.state === 'windup' && Math.floor(G.t * 14) % 2 === 0, big = e.boss ? 1.25 : 1.1;
      const al = e.clone ? 0.45 + 0.2 * Math.sin(G.t * 18 + e.ph) : 1;
      spr(s, e.x - cx, e.y - cy - (e.moving ? Math.abs(Math.sin(G.t * 10 + e.ph)) * 3 : 0), { sx: big, sy: big, alpha: e.alpha * al, mul: [1.3, 0.55, 1.5], flash: e.flash > 0 ? 0.8 : fl ? 0.65 : 0, flashColor: fl ? [255, 30, 30] : [255, 255, 255] });
    }
    drawHud2(cx, cy) {
      const P = this.P, A = Level1.preload(), t = G.t, b = this.boss;
      for (let i = 0; i < 5; i++) { const x = 30 + i * 34, y = 40; C.blit(A.diya, x - A.diya.ax + 14, y - A.diya.ay + 14); if (i < P.hp) ART.drawFlame(x + 14, y + 3, 18, t, i + 1, false); }
      if (P.bow) G.text('F  Bow' + (P.bowCd > 0 ? ' ...' : ''), 26, 78, { size: 15, color: '#9affc8' });
      if (this.objective) G.text(this.objective, 26, 58, { size: 18, color: '#ffe3a0' });
      if (this.hintT > 0 && !G.dlg && this.hintS) { const w = 12 + this.hintS.length * 8.4; C.rect(480 - w / 2, 474, w, 34, rgba(0, 0, 0, 150)); G.text(this.hintS, 480, 481, { size: 19, align: 'center', color: '#fff4d0' }); }
      if (b && b.hp > 0 && this.bossFight) { C.rect(330, 20, 300, 12, rgba(0, 0, 0, 190)); C.rect(332, 22, Math.round(296 * b.hp / b.maxhp), 8, hex('#b040e0')); G.text('Mayavi', 480, 34, { size: 14, align: 'center', color: '#e8b8ff' }); }
      const win = { x: 0, y: 0, w: WW, h: WH }, vp = { x: 800, y: 12, w: 148, h: 105 };
      C.rect(vp.x - 2, vp.y - 2, vp.w + 4, vp.h + 4, rgba(0, 0, 0, 170)); const rr = (x0, y0, x1, y1, c) => { const p = C.windowToViewport(x0, y0, win, vp), q = C.windowToViewport(x1, y1, win, vp); C.rect(Math.round(p[0]), Math.round(p[1]), Math.round(q[0] - p[0]), Math.round(q[1] - p[1]), c); };
      rr(0, 0, WW, WH, hex('#1e3a28'));
      const tr = art().trail; for (let i = 0; i + 1 < tr.length; i += 2) { const p = C.windowToViewport(tr[i][0], tr[i][1], win, vp); C.disc(Math.round(p[0]), Math.round(p[1]), 2, hex('#8a7a55')); }
      const dot = (x, y, c, r) => { const q = C.windowToViewport(x, y, win, vp); C.disc(Math.round(q[0]), Math.round(q[1]), r, c); };
      for (let i = this.node; i < 4; i++) dot(NODES[i][0], NODES[i][1], hex('#8ac4ff'), 3);
      for (const e of this.enemies) if (e.hp > 0) dot(e.x, e.y, e.clone ? hex('#a070c0') : hex('#e040ff'), 2); dot(P.x, P.y, hex('#ff3a3a'), 3);
      const v0 = C.windowToViewport(this.cam.x, this.cam.y, win, vp), v1 = C.windowToViewport(this.cam.x + SW, this.cam.y + SH, win, vp);
      const box = C.clipPolySH([[v0[0], v0[1]], [v1[0], v0[1]], [v1[0], v1[1]], [v0[0], v1[1]]], vp.x, vp.y, vp.x + vp.w, vp.y + vp.h); if (box.length > 2) C.polyline(box, rgba(255, 255, 255, 220), true);
    }
  }
  Level2.preload = art;
  return Level2;
})();
