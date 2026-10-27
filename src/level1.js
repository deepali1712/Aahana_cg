/* level1.js - Level 1 "Saraswati Ghat". Beat sheet from HANDOVER section 5 (phases A-E).
 * Phase A dusk exploration, B eclipse, C goddesses, D combat tutorial (3 waves), E abduction.
 * Constructor takes a start phase (0..4) so tests can jump in.
 */
var Level1 = (function () {
  'use strict';
  const C = CG, { rgba, hex, withAlpha, clamp, lerp, mixc, M3 } = C;
  const WW = 1920, WH = 1360, SW = 960, SH = 540;
  const DUSK = [0.80, 0.66, 0.62], ECL = [0.28, 0.32, 0.50], BLESS = [0.55, 0.50, 0.55];
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const ease = t => t * t * (3 - 2 * t);
  const DIYAS = [[700, 520], [1220, 520], [640, 760], [1280, 760], [960, 930]];
  const SPAWN = [[400, 1200], [1500, 1200], [960, 1320]];
  const FIRE = [960, 1150], HAND = [960, 1060];

  /* ---------- one-time art ---------- */
  let A = null;
  function assets() {
    if (A) return A;
    A = { ground: new C.Surface(WW, WH) };
    const g = A.ground; C.setTarget(g);
    ART.sand(g, 0, 0, WW, WH);
    ART.crackedMud(g, 0, 1000, WW, 360);
    // bank edge: dark soft band where the plaza sand meets the dry river
    for (let y = 990; y < 1012; y++) C.hspan(0, WW - 1, y, rgba(40, 25, 12, Math.round(110 * (1 - Math.abs(y - 1001) / 12))));
    ART.pavers(g, 560, 420, 800, 480);
    ART.ghatSteps(g, 760, 900, 400, 120);
    C.rect(756, 900, 4, 120, rgba(0, 0, 0, 90)); C.rect(1160, 900, 4, 120, rgba(0, 0, 0, 90));
    ART.rangoli(960, 700, 150);
    // worn paths (alpha-blended discs on the sand)
    for (let i = 0; i < 60; i++) { const x = 200 + i * 28, y = 440 + Math.sin(i * 0.4) * 8; C.disc(x < 560 ? x : 560, y, 18, rgba(150, 115, 70, 22)); }
    A.temple = ART.temple(); A.house = [ART.house(0), ART.house(1)];
    A.tree = [ART.tree(1), ART.tree(2), ART.tree(3)]; A.diya = ART.diya(); A.pit = ART.firePit(); A.lamp = ART.lampPillar();
    A.bush = [ART.bush(1), ART.bush(2)]; A.rock = [ART.rock(1), ART.rock(2)]; A.shrub = [ART.dryShrub(1), ART.dryShrub(2), ART.dryShrub(3)];
    A.sword = ART.sword();
    return A;
  }

  /* ---------- sprite drawing helpers ---------- */
  function spr(s, x, y, o) {
    o = o || {};
    const sx = o.sx || 1, sy = o.sy || 1, rot = o.rot || 0;
    const m = M3.chain(M3.T(x, y), M3.T(0, -45), M3.R(rot), M3.T(0, 45), M3.S(sx, sy), M3.T(-s.ax, -s.ay));
    C.drawBitmap(s, m, { alpha: o.alpha, flash: o.flash, flashColor: o.flashColor, mul: o.mul });
  }
  function shadow(s, x, y, a) {
    const m = M3.chain(M3.T(x, y), M3.Shear(0.9, 0), M3.S(1, -0.3), M3.T(-s.ax, -s.ay));
    C.drawBitmap(s, m, { mul: [0, 0, 0], alpha: a || 0.3 });
  }
  const viewOf = f => Math.abs(f[0]) > Math.abs(f[1]) * 0.9 ? (f[0] < 0 ? 'side' : 'right') : (f[1] < 0 ? 'back' : 'front');

  /* ---------- enemies ---------- */
  const TYPES = {
    cultist: { hp: 3, speed: 105, melee: 64, wind: 0.55, lunge: 0.18, rec: 0.7, lungeSpd: 360 },
    imp: { hp: 2, speed: 150, melee: 52, wind: 0.35, lunge: 0.16, rec: 0.6, lungeSpd: 420 }
  };
  class Enemy {
    constructor(type, x, y) {
      Object.assign(this, TYPES[type], { type, x, y, hw: 14, hh: 8, state: 'chase', st: 0, face: [0, 1], kb: [0, 0], hs: 0, flash: 0, alpha: 1, dying: 0, gone: false, maxhp: TYPES[type].hp, ph: Math.random() * 6, lv: [0, 0], did: false, moving: false });
    }
    get dead() { return this.hp <= 0; }
    hurt(n, dx, dy) {
      if (this.hp <= 0) return;
      this.hp -= n; this.flash = 0.15; this.hs = 0.2; this.state = 'chase';
      const l = Math.hypot(dx, dy) || 1; this.kb = [dx / l * 160, dy / l * 160];
    }
    update(dt, L) {
      const P = L.P;
      if (this.hp <= 0) { if (!this.dying) { this.dying = 0.4; L.fx.burst(this.x, this.y - 30, 18, this.type === 'imp' ? hex('#a040ff') : hex('#ff6a2a'), 150, 0.6); } this.dying -= dt; this.alpha = Math.max(0, this.dying / 0.4); if (this.dying <= 0) this.gone = true; return; }
      this.flash = Math.max(0, this.flash - dt);
      if (this.hs > 0) { this.hs -= dt; L.tryMove(this, this.kb[0] * dt * 3, this.kb[1] * dt * 3); this.kb = [this.kb[0] * 0.85, this.kb[1] * 0.85]; return; }
      const dx = P.x - this.x, dy = P.y - this.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
      this.moving = false;
      if (this.state === 'chase') {
        this.face = [nx, ny];
        if (d > this.melee - 8) {
          const sp = this.speed * dt, ox = this.x, oy = this.y;
          if (this.detT > 0) { this.detT -= dt; L.tryMove(this, (nx * 0.5 - ny * this.det) * sp * 1.4, (ny * 0.5 + nx * this.det) * sp * 1.4); } // slide around scenery
          else L.tryMove(this, nx * sp, ny * sp);
          if (Math.hypot(this.x - ox, this.y - oy) < sp * 0.35) { if (!(this.detT > 0)) this.det = Math.random() < 0.5 ? 1 : -1; this.detT = 0.7; }
          this.moving = true;
        }
        else { this.state = 'windup'; this.st = this.wind; }
      } else if (this.state === 'windup') {
        this.face = [nx, ny]; this.st -= dt;
        if (this.st <= 0) { this.state = 'lunge'; this.st = this.lunge; this.lv = [nx, ny]; this.did = false; }
      } else if (this.state === 'lunge') {
        L.tryMove(this, this.lv[0] * this.lungeSpd * dt, this.lv[1] * this.lungeSpd * dt);
        if (!this.did && d < this.melee + 10) { this.did = true; L.hurtPlayer(1, this.x, this.y); }
        this.st -= dt; if (this.st <= 0) { this.state = 'recover'; this.st = this.rec; }
      } else if (this.state === 'recover') { this.st -= dt; if (this.st <= 0) this.state = 'chase'; }
      // soft separation so enemies do not stack
      for (const o of L.enemies) if (o !== this && o.hp > 0) { const ex = this.x - o.x, ey = this.y - o.y, ed = Math.hypot(ex, ey); if (ed > 0 && ed < 36) L.tryMove(this, ex / ed * 60 * dt, ey / ed * 60 * dt); }
    }
  }

  /* ---------- the level ---------- */
  class Level1 {
    constructor(startPhase, onComplete) {
      this.ph = startPhase || 0; this.onComplete = onComplete || null; this.pausable = true;
    }
    enter() {
      assets();
      const P = this.P = { name: 'devanshi', x: 960, y: 800, hw: 12, hh: 8, hp: 5, face: [0, -1], atk: 0, atkHit: false, dodge: 0, dodgeCd: 0, dv: [0, 1], inv: 0, stun: 0, kb: [0, 0], flash: 0, sword: false, moving: false, ph: 0, dead: 0 };
      this.Ah = { name: 'aahana', x: 900, y: 650, hw: 10, hh: 6, face: [0, 1], moving: false, ph: 1.7, mode: 'follow', held: false };
      this.cam = { x: 0, y: 0 }; this.camOv = null;
      this.fx = new G.Fx(); this.enemies = []; this.rit = []; this.lit = 0; this.ecl = 0; this.bless = 0; this.aura = 0;
      this.fireOn = false; this.fireP = 0; this.rta = { s: -1 }; this.gods = null; this.hand = null; this.cut = false; this.combat = false;
      this.objective = ''; this.hintS = ''; this.hintT = 0; this.wave = -1; this.hitstop = 0; this.time = 0; this.slash = 0;
      this.build();
      this.setup(this.ph);
      const cx = clamp(P.x - SW / 2, 0, WW - SW), cy = clamp(P.y - SH / 2, 0, WH - SH); this.cam = { x: cx, y: cy };
      this.script = new G.Script(this.run(this.ph)); this.aux = null;
      AUD.setMood('calm'); AUD.setRaag('yaman');
    }
    /* ----- world construction ----- */
    build() {
      const a = A, cols = this.cols = [], props = this.props = [];
      const add = (s, x, y, solid) => { props.push({ s, x, y }); if (solid) cols.push(solid); };
      add(a.temple, 960, 420, { x: 700, y: 330, w: 520, h: 90 });
      [[260, 560, 0], [250, 860, 1], [1660, 560, 1], [1670, 860, 0]].forEach(([x, y, v]) => { const s = a.house[v]; add(s, x, y, { x: x - s.w * 0.42, y: y - 70, w: s.w * 0.84, h: 70 }); });
      [[130, 330, 0], [470, 330, 1], [1450, 330, 2], [1800, 360, 0], [90, 700, 1], [1830, 720, 2], [440, 700, 2], [1480, 700, 0], [120, 1010 - 20, 1], [1790, 990, 2]].forEach(([x, y, v]) => add(a.tree[v], x, y, { x: x - 14, y: y - 14, w: 28, h: 14 }));
      [[600, 640], [1320, 640], [600, 880], [1320, 880]].forEach(([x, y]) => { add(a.lamp, x, y, { x: x - 8, y: y - 8, w: 16, h: 8 }); });
      [[540, 480, 0], [1380, 470, 1], [300, 700, 1], [1610, 730, 0], [800, 960, 1], [1130, 960, 0]].forEach(([x, y, v]) => add(a.bush[v], x, y));
      [[200, 1100, 0], [520, 1230, 1], [1400, 1140, 0], [1700, 1260, 1], [350, 1300, 0], [1250, 1310, 1], [760, 1080, 1]].forEach(([x, y, v]) => add(a.rock[v], x, y));
      [[160, 1160, 0], [700, 1290, 1], [1580, 1200, 2], [1000, 1010, 2], [1850, 1120, 0], [880, 1300, 1]].forEach(([x, y, v]) => add(a.shrub[v], x, y));
      props.push({ s: a.pit, x: FIRE[0], y: FIRE[1], pit: true }); cols.push({ x: FIRE[0] - 55, y: FIRE[1] - 22, w: 110, h: 22 });
      this.diyas = DIYAS.map(([x, y], i) => ({ x, y, lit: false, seed: i + 1 }));
      this.vill = [
        { name: 'villagerA', x: 700, y: 640, tx: 700, ty: 640, wait: 1, sp: 40, st: 'wander', face: [0, 1], ph: 0 }, { name: 'villagerB', x: 1200, y: 640, tx: 1200, ty: 640, wait: 2, sp: 38, st: 'wander', face: [0, 1], ph: 2 },
        { name: 'villagerC', x: 820, y: 840, tx: 820, ty: 840, wait: 0.5, sp: 42, st: 'wander', face: [0, 1], ph: 4 }, { name: 'villagerA', x: 1100, y: 870, tx: 1100, ty: 870, wait: 3, sp: 36, st: 'wander', face: [0, 1], ph: 1 },
        { name: 'pujari', x: 880, y: 468, tx: 880, ty: 468, wait: 99, sp: 0, st: 'idle', face: [0, 1], ph: 3, talk: 0 }];
    }
    setup(ph) {
      if (ph >= 1) { this.diyas.forEach(d => d.lit = true); this.lit = 5; }
      if (ph >= 2) {
        this.ecl = 1; this.fireOn = true; this.fireP = 1; this.vill = []; this.rta = { s: 9 };
        [[850, 1090], [1070, 1090], [840, 1230], [1080, 1230]].forEach(([x, y]) => this.rit.push({ name: 'cultist', x, y, tx: x, ty: y, face: [0, y > FIRE[1] ? -1 : 1], ph: Math.random() * 6 }));
      }
      if (ph >= 3) { this.aura = 1; this.bless = 1; this.P.sword = true; this.combat = true; Object.assign(this.Ah, { x: 900, y: 480, mode: 'stay' }); this.P.y = 820; }
    }
    /* ----- collision / movement ----- */
    blocked(x, y, hw, hh) {
      if (x < hw || x > WW - hw || y < hh + 20 || y > WH - 4) return true;
      for (const r of this.cols) if (x + hw > r.x && x - hw < r.x + r.w && y > r.y && y - hh < r.y + r.h) return true;
      return false;
    }
    tryMove(e, dx, dy) {
      const nx = e.x + dx; if (!this.blocked(nx, e.y, e.hw, e.hh)) e.x = nx;
      const ny = e.y + dy; if (!this.blocked(e.x, ny, e.hw, e.hh)) e.y = ny;
    }
    *walk(e, tx, ty, sp) {
      let stuck = 0;
      for (; ;) {
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 6) break;
        const s = Math.min(d, sp * G.dt), ox = e.x, oy = e.y;
        this.tryMove(e, dx / d * s, dy / d * s); e.face = [dx / d, dy / d]; e.moving = true;
        stuck = Math.hypot(e.x - ox, e.y - oy) < s * 0.2 ? stuck + G.dt : 0; if (stuck > 1.5) break;
        yield 0;
      }
      e.moving = false;
    }
    camSet(x, y) { this.camOv = [x, y]; }
    hint(s, t) { this.hintS = s; this.hintT = t || 5; }
    hurtPlayer(n, fx, fy) {
      const P = this.P; if (P.inv > 0 || P.dodge > 0 || P.hp <= 0 || G.god) return false;
      P.hp -= n; P.inv = 0.9; P.stun = 0.2; P.flash = 0.2; G.shake = Math.max(G.shake, 0.35); AUD.hit(false);
      const dx = P.x - fx, dy = P.y - fy, l = Math.hypot(dx, dy) || 1; P.kb = [dx / l * 170, dy / l * 170];
      this.fx.burst(P.x, P.y - 40, 10, hex('#ff3a3a'), 130, 0.4);
      return true;
    }
    spawnWave(w) {
      this.enemies = []; const S = SPAWN;
      const list = [[['cultist', S[0]], ['cultist', S[1]]], [['cultist', S[0]], ['cultist', S[1]], ['cultist', S[2]]], [['cultist', S[0]], ['cultist', S[1]], ['imp', [700, 1300]], ['imp', [1220, 1300]]]][w];
      for (const [t, p] of list) { const e = new Enemy(t, p[0], p[1]); this.enemies.push(e); this.fx.burst(p[0], p[1] - 30, 14, hex('#8a3a9a'), 120, 0.6); }
      this.objective = 'Defeat the cult (wave ' + (w + 1) + '/3)';
    }

    /* ----- the story ----- */
    *run(ph) {
      const L = this, P = this.P, say = G.say;
      if (ph <= 0) {
        yield 1.0;
        yield* say('Aahana', 'Didi! There you are. Amma said every diya on the ghat must be lit before the eclipse begins.', 'smile');
        yield* say('Devanshi', 'An eclipse on Navratri night? Strange. Fine, I will light the lamps. You stay close.', 'neutral');
        L.objective = 'Light the festival diyas (0/5)'; L.hint('WASD / Arrow keys: Move      E: Interact', 7);
        yield () => L.lit >= 5;
      }
      if (ph <= 1) { /* ---------- Phase B: eclipse ---------- */
        L.objective = ''; yield 0.8;
        yield* say('Aahana', 'Look, the sun is going dark!', 'scared');
        L.rta = { s: 0 }; AUD.boom(); AUD.setMood('tense');
        L.vill.forEach(v => { v.st = 'flee'; v.sp = 190; v.tx = v.x < 960 ? -60 : WW + 60; v.ty = v.y; });
        yield* G.tween(4, p => { L.ecl = p; G.shake = Math.max(G.shake, 0.12 * p); });
        const ring = [[850, 1090], [1070, 1090], [840, 1230], [1080, 1230]], from = [[500, 1250], [1420, 1250], [700, 1340], [1220, 1340]];
        L.rit = ring.map((r, i) => ({ name: 'cultist', x: from[i][0], y: from[i][1], tx: r[0], ty: r[1], face: [0, -1], ph: i * 1.3 }));
        yield () => L.rit.every(c => Math.hypot(c.tx - c.x, c.ty - c.y) < 6);
        L.cut = true; L.fireOn = true; G.flash = 0.8; AUD.boom();
        yield* G.tween(1.5, p => { L.fireP = p; });
        const a = [P.x, P.y], b = [HAND[0], HAND[1] - 40], c1 = [a[0] - 260, (a[1] + b[1]) / 2 - 80], c2 = [b[0] + 320, (a[1] + b[1]) / 2 + 60];
        yield* G.tween(2.6, p => { const q = C.bezier(a, c1, c2, b, ease(p)); L.camSet(q[0], q[1]); }); // camera pan along a Bezier path
        yield* say('Cultists', 'Rta, break! Open the gate of Patala!', 'fierce');
        L.rta = { s: 0.001, snap: true }; G.flash = 1; G.shake = 1; AUD.boom();
        yield* G.tween(1.4, p => { L.rta.s = p; });
        L.rta.s = 9; yield 0.6; L.camOv = null; L.cut = false; yield 0.8;
      }
      if (ph <= 2) { /* ---------- Phase C: the goddesses ---------- */
        L.cut = true; L.gods = { p: 0, m: 0 }; AUD.chime(); L.Ah.x = P.x - 70; L.Ah.y = P.y - 8; L.camSet((P.x + L.Ah.x) / 2, P.y - 70); // frame both sisters
        yield* G.tween(1.6, p => { L.gods.p = ease(p); });
        yield* say('Maa Durga', 'Child of the lamp, the world\u2019s order has been torn. Take up my strength.', 'neutral');
        yield* say('Maa Saraswati', 'And child of the book, take my wisdom. Alone, each of you is half. Together, you are the answer.', 'neutral');
        yield* G.tween(1.4, p => { L.gods.m = ease(p); L.bless = ease(p); });
        L.gods = null; L.aura = 1; P.sword = true; G.flash = 0.9; AUD.chime(); L.fx.burst(P.x, P.y - 50, 40, hex('#ffcf4a'), 220, 0.9);
        yield 0.5;
        yield* say('Devanshi', 'This sword... it feels alive. Stay behind me, Aahana. Here they come!', 'determined');
        L.camOv = null; L.cut = false; L.combat = true; Object.assign(L.Ah, { mode: 'go', gx: 900, gy: 480 }); L.hint('Space: Attack', 6);
        L.rit = []; L.fx.burst(960, 1150, 30, hex('#6a2a8a'), 200, 0.9);
      }
      if (ph <= 3) { /* ---------- Phase D: three waves ---------- */
        for (let w = 0; w < 3; w++) {
          L.wave = w; if (w === 1) L.hint('Shift: Dodge. Roll away when they flash red.', 7);
          L.spawnWave(w); AUD.setMood('tense');
          yield 0.5; yield () => L.enemies.every(e => e.gone); yield 1.0;
        }
        L.objective = ''; L.wave = -1; AUD.chime(); yield 0.8;
      }
      /* ---------- Phase E: the abduction ---------- */
      L.cut = true; L.P.kb = [0, 0]; AUD.setMood('tense');
      L.fx.burst(HAND[0], HAND[1], 40, hex('#a040ff'), 240, 1.2);
      G.shake = 1; AUD.boom();
      L.hand = { x: HAND[0], y: HAND[1], s: 0.1, open: 0 };
      yield* G.tween(2.4, p => { L.hand.s = 0.1 + 1.5 * ease(p); L.hand.open = p; const q = [lerp(L.cam.x + SW / 2, HAND[0], p), lerp(L.cam.y + SH / 2, HAND[1] - 80, p)]; L.camSet(q[0], q[1]); G.shake = Math.max(G.shake, 0.3); });
      yield* say('Tamasur', 'The loom is mine now... and so is the wisdom of the lotus-born.', 'fierce');
      yield* say('Devanshi', 'Aahana, get back! I will not let you touch her!', 'fierce');
      L.camOv = null;
      const pw = L.walk(P, HAND[0], HAND[1] - 120, 300); // Devanshi charges the hand
      for (let r = pw.next(); !r.done && Math.hypot(P.x - HAND[0], P.y - HAND[1]) > 140; r = pw.next()) { P.moving = true; yield 0; }
      P.moving = false; G.flash = 1; G.shake = 1; AUD.hit(true); P.hp = Math.max(P.hp, 1);
      P.kb = [0, -520]; P.stun = 0.9; P.flash = 0.4; L.fx.burst(P.x, P.y - 40, 24, hex('#ffffff'), 260, 0.6);
      yield 1.2;
      // the hand reaches across the plaza to Aahana along a Bezier path
      const A0 = [HAND[0], HAND[1]], A1 = [L.Ah.x, L.Ah.y - 60], k1 = [A0[0] - 380, A0[1] - 250], k2 = [A1[0] + 360, A1[1] + 260];
      L.Ah.mode = 'frozen';
      yield* G.tween(2.2, p => { const q = C.bezier(A0, k1, k2, A1, ease(p)); L.hand.x = q[0]; L.hand.y = q[1]; L.camSet(q[0], q[1]); });
      L.Ah.held = true; L.hand.open = 0.1;
      yield* say('Aahana', 'Didi!', 'scared');
      yield* G.tween(2.0, p => { const q = C.bezier(A1, k2, k1, A0, ease(p)); L.hand.x = q[0]; L.hand.y = q[1]; L.camSet(q[0], q[1]); G.shake = Math.max(G.shake, 0.4); });
      G.fadeTo(1, 0.9, () => { if (L.onComplete) L.onComplete(); });
      yield 99;
    }

    /* ----- per-frame update ----- */
    update(dt) {
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      this.time += dt; const P = this.P;
      this.script.update(dt); if (this.aux) { this.aux.update(dt); if (this.aux.done) this.aux = null; }
      this.fx.update(dt);
      const frozen = !!G.dlg || this.cut;
      this.updatePlayer(dt, frozen);
      this.updateAahana(dt);
      this.updateNpcs(dt);
      if (!G.dlg) for (const e of this.enemies) e.update(dt, this);
      this.enemies = this.enemies.filter(e => !e.gone);
      if (this.hintT > 0 && !G.dlg) this.hintT -= dt;
      if (this.fireOn && Math.random() < dt * 30) this.fx.burst(FIRE[0] + (Math.random() - 0.5) * 60, FIRE[1] - 30, 1, hex('#ffb040'), 60, 1.2, -90);
      if (this.rta.s > 0 && this.rta.snap && this.rta.s < 1 && Math.random() < 0.9) this.fx.burst(480 + this.cam.x, 80 + this.cam.y, 3, hex('#ffe070'), 260, 0.8, 200);
      // camera
      const T = this.camOv || [P.x, P.y - 20];
      const tx = clamp(T[0] - SW / 2, 0, WW - SW), ty = clamp(T[1] - SH / 2, 0, WH - SH), k = this.camOv ? 1 : Math.min(1, dt * 6);
      this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    }
    updatePlayer(dt, frozen) {
      const P = this.P;
      P.inv = Math.max(0, P.inv - dt); P.flash = Math.max(0, P.flash - dt); P.dodgeCd = Math.max(0, P.dodgeCd - dt);
      P.ph += dt;
      if (Math.hypot(P.kb[0], P.kb[1]) > 5) { this.tryMove(P, P.kb[0] * dt, P.kb[1] * dt); const f = Math.pow(0.02, dt); P.kb = [P.kb[0] * f, P.kb[1] * f]; }
      if (P.stun > 0) { P.stun -= dt; P.moving = false; return; }
      if (P.hp <= 0 && !P.dead) { P.dead = 1; G.fadeTo(1, 1.6, () => this.respawn()); }
      if (P.dead || frozen) { if (frozen && !this.cut) P.moving = false; return; }
      if (P.dodge > 0) {
        P.dodge -= dt; this.tryMove(P, P.dv[0] * 464 * dt, P.dv[1] * 464 * dt); P.moving = true; return;
      }
      const ax = G.axis(), slow = P.atk > 0 ? 0.35 : 1;
      P.moving = ax[0] !== 0 || ax[1] !== 0;
      if (P.moving) { this.tryMove(P, ax[0] * 190 * slow * dt, ax[1] * 190 * slow * dt); if (P.atk <= 0) P.face = ax; }
      if (this.combat) {
        if (G.hit('Space') && P.sword && P.atk <= 0) this.startAttack();
        if (G.hit('ShiftLeft', 'ShiftRight') && P.dodgeCd <= 0 && P.atk <= 0.1) { P.dodge = 0.28; P.dodgeCd = 0.7; P.dv = P.moving ? ax : P.face; P.face = P.dv; AUD.swing(); this.fx.burst(P.x, P.y - 4, 8, hex('#d9c9a6'), 90, 0.4); }
      }
      if (P.atk > 0) {
        const before = P.atk; P.atk -= dt;
        if (P.atk < 0.28 - 0.10 && before >= 0.28 - 0.10 && !P.atkHit) { P.atkHit = true; this.strike(); }
        if (P.atk > 0.13) this.tryMove(P, P.face[0] * 120 * dt, P.face[1] * 120 * dt);
        if (P.atk < 0) P.atk = 0;
      }
      this.interact();
    }
    startAttack() {
      const P = this.P; P.atk = 0.28; P.atkHit = false; AUD.swing();
      let best = null, bd = 130;
      for (const e of this.enemies) if (e.hp > 0) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = e; } }
      if (best) { const l = Math.hypot(best.x - P.x, best.y - P.y) || 1; P.face = [(best.x - P.x) / l, (best.y - P.y) / l]; } // gentle aim assist
    }
    strike() {
      const P = this.P; let hit = false;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
        if (d < 88 + 14 && (dx * P.face[0] + dy * P.face[1]) / (d || 1) > Math.cos(70 * Math.PI / 180)) {
          e.hurt(1, dx, dy); hit = true; this.fx.burst(e.x, e.y - 40, 10, hex('#ffe9b0'), 180, 0.35);
        }
      }
      if (hit) { G.shake = Math.max(G.shake, 0.22); this.hitstop = 0.05; AUD.hit(false); }
    }
    interact() {
      const P = this.P; this.near = null;
      let bd = 70;
      for (const d of this.diyas) if (!d.lit && this.ph <= 0 && this.lit < 5 && this.objective) { const dd = Math.hypot(d.x - P.x, d.y - P.y); if (dd < bd) { bd = dd; this.near = { t: 'diya', o: d }; } }
      for (const v of this.vill) if (v.name === 'pujari' && v.st === 'idle') { const dd = Math.hypot(v.x - P.x, v.y - P.y); if (dd < bd) { bd = dd; this.near = { t: 'pujari', o: v }; } }
      if (this.near && G.hit('KeyE') && !this.aux) {
        const n = this.near;
        if (n.t === 'diya') {
          n.o.lit = true; this.lit++; AUD.pluck(392 * Math.pow(2, this.lit / 12 * 2), 0.35); this.fx.burst(n.o.x, n.o.y - 14, 12, hex('#ffb040'), 90, 0.6);
          this.objective = 'Light the festival diyas (' + this.lit + '/5)';
          if (this.lit >= 5) this.objective = 'Light the festival diyas (5/5)';
        } else {
          const v = n.o; v.talk = (v.talk || 0) + 1;
          this.aux = new G.Script((function* () {
            yield* G.say('Pujari', v.talk === 1 ? 'They say the Saraswati flowed here once. On Navratri we light lamps hoping she returns.' : 'Light all five diyas, child. The goddess loves a bright ghat.', 'neutral');
          })());
        }
      }
    }
    respawn() {
      const P = this.P; P.hp = 5; P.dead = 0; P.inv = 1.5; P.kb = [0, 0]; P.stun = 0; P.x = 960; P.y = 800; P.atk = 0; P.dodge = 0;
      if (this.wave >= 0) this.spawnWave(this.wave);
      G.fadeTo(0, 1.6);
    }
    updateAahana(dt) {
      const A = this.Ah, P = this.P; A.moving = false;
      if (A.held || A.mode === 'frozen') return;
      let tx = null, ty = null;
      if (A.mode === 'follow') { const d = Math.hypot(P.x - A.x, P.y - A.y); if (d > 100) { tx = P.x; ty = P.y; } }
      else if (A.mode === 'go' || A.mode === 'stay') { if (A.gx !== undefined && Math.hypot(A.gx - A.x, A.gy - A.y) > 6) { tx = A.gx; ty = A.gy; } }
      if (tx !== null) { const dx = tx - A.x, dy = ty - A.y, d = Math.hypot(dx, dy); this.tryMove(A, dx / d * 170 * dt, dy / d * 170 * dt); A.face = [dx / d, dy / d]; A.moving = true; }
      else if (A.mode === 'stay') A.face = [0, 1];
    }
    updateNpcs(dt) {
      for (const v of this.vill) {
        v.moving = false;
        if (v.st === 'idle') continue;
        const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy);
        if (d > 6) { v.x += dx / d * v.sp * dt; v.y += dy / d * v.sp * dt; v.face = [dx / d, dy / d]; v.moving = true; }
        else if (v.st === 'wander') { v.wait -= dt; if (v.wait <= 0) { v.wait = 1 + Math.random() * 3; v.tx = 600 + Math.random() * 720; v.ty = 480 + Math.random() * 400; } }
      }
      this.vill = this.vill.filter(v => !(v.st === 'flee' && (v.x < -40 || v.x > WW + 40)));
      for (const c of this.rit) {
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy); c.moving = d > 6;
        if (d > 6) { c.x += dx / d * 120 * dt; c.y += dy / d * 120 * dt; c.face = [dx / d, dy / d]; }
        else c.face = [(FIRE[0] - c.x) * 0.3, FIRE[1] - c.y];
      }
    }

    /* ----- drawing ----- */
    drawChar(e, cx, cy, o) {
      o = o || {};
      const view = o.view || viewOf(e.face), s = ART.char(e.name, view);
      const moving = e.moving, ph = e.ph || 0;
      const bob = (moving ? Math.abs(Math.sin(G.t * 11 + ph)) * 3 : Math.sin(G.t * 2 + ph) * 0.8) + (o.lift || 0);
      const sq = moving ? 1 + Math.sin(G.t * 22 + ph) * 0.025 : 1 + Math.sin(G.t * 2 + ph) * 0.012;
      spr(s, e.x - cx, e.y - cy - bob, { sy: sq, sx: 2 - sq, alpha: o.alpha, flash: o.flash, flashColor: o.flashColor, rot: o.rot, mul: o.mul });
    }
    drawEnemy(e, cx, cy) {
      const lift = e.type === 'imp' ? 20 + Math.sin(G.t * 6 + e.ph) * 4 : 0;
      let flash = e.flash > 0 ? 0.8 : 0, fc = [255, 255, 255];
      if (e.state === 'windup' && Math.floor(G.t * 14) % 2 === 0) { flash = 0.65; fc = [255, 30, 30]; }
      const s = e.type === 'imp' ? ART.char('imp', 'front') : ART.char('cultist', viewOf(e.face));
      const bob = e.moving ? Math.abs(Math.sin(G.t * 10 + e.ph)) * 3 : 0, wob = e.state === 'windup' ? (Math.random() - 0.5) * 3 : 0;
      spr(s, e.x - cx + wob, e.y - cy - lift - bob, { alpha: e.alpha * (e.type === 'imp' ? 0.9 : 1), flash, flashColor: fc, sy: e.state === 'windup' ? 0.94 : 1 });
      if (e.hp > 0 && e.hp < e.maxhp) { const bx = e.x - cx - 16, by = e.y - cy - 118 - lift; C.rect(bx - 1, by - 1, 34, 6, rgba(0, 0, 0, 200)); C.rect(bx, by, Math.round(32 * e.hp / e.maxhp), 4, hex('#e83a3a')); }
    }
    drawPlayer(cx, cy) {
      const P = this.P, a = Math.atan2(P.face[1], P.face[0]);
      const blink = P.inv > 0 && Math.floor(G.t * 20) % 2 === 0;
      if (P.dodge > 0) {
        const p = 1 - P.dodge / 0.28, dir = P.dv[0] >= 0 ? 1 : -1;
        spr(ART.char('devanshi', viewOf(P.dv)), P.x - cx, P.y - cy - 2, { rot: p * Math.PI * 2 * dir, sy: 0.85, alpha: 0.9 });
        return;
      }
      let bob = P.moving ? Math.abs(Math.sin(G.t * 11)) * 3 : Math.sin(G.t * 2) * 0.8;
      if (!blink) this.drawChar(P, cx, cy, { flash: P.flash > 0 ? 0.7 : 0 });
      if (P.sword) {
        const hx = P.x - cx + P.face[0] * 18, hy = P.y - cy - 52 - bob + P.face[1] * 8;
        let ang;
        if (P.atk > 0) { const p = 1 - P.atk / 0.28; ang = a - 1.2 + 2.4 * p; } else ang = P.face[0] >= 0 ? -1.15 : -Math.PI + 1.15;
        const m = M3.chain(M3.T(hx, hy), M3.R(ang + Math.PI / 2), M3.T(-A.sword.ax, -A.sword.ay));
        C.drawBitmap(A.sword, m, { alpha: blink ? 0.5 : 1 });
        if (P.atk > 0) { const p = 1 - P.atk / 0.28; ART.drawSlash(P.x - cx, P.y - cy - 44, 74, a, p); }
      }
    }
    draw() {
      const FB = C.getFB(), P = this.P, a = A;
      const sh = G.shake, sx = sh ? (Math.random() - 0.5) * 14 * sh : 0, sy = sh ? (Math.random() - 0.5) * 14 * sh : 0;
      const cx = Math.round(this.cam.x + sx), cy = Math.round(this.cam.y + sy);
      C.blit(a.ground, -cx, -cy);
      const t = G.t, items = [], add = (y, fn) => items.push([y, fn]);
      const on = (x, y, m) => x > cx - m && x < cx + SW + m && y > cy - 60 && y < cy + SH + 520;
      // shadows first
      const chars = [P, this.Ah, ...this.vill, ...this.rit];
      for (const e of chars) if (on(e.x, e.y, 80)) shadow(ART.char(e.name, viewOf(e.face)), e.x - cx, e.y - cy, 0.3);
      for (const e of this.enemies) if (e.hp > 0 && on(e.x, e.y, 80)) shadow(e.type === 'imp' ? ART.char('imp', 'front') : ART.char('cultist', viewOf(e.face)), e.x - cx, e.y - cy + (e.type === 'imp' ? 0 : 0), 0.28);
      for (const p of this.props) if (on(p.x, p.y, 300)) add(p.y, () => C.blit(p.s, p.x - p.s.ax - cx, p.y - p.s.ay - cy));
      for (const d of this.diyas) {
        add(d.y, () => C.blit(a.diya, d.x - a.diya.ax - cx, d.y - a.diya.ay - cy));
        if (d.lit) add(d.y + 0.1, () => ART.drawFlame(d.x - cx, d.y - 14 - cy, 20 + Math.sin(t * 9 + d.seed) * 1.5, t, d.seed));
      }
      if (this.fireOn) add(FIRE[1] + 1, () => { const f = ease(this.fireP); C.radial(FIRE[0] - cx, FIRE[1] - 50 - cy, 150 * f, rgba(255, 150, 50, 80), 2); ART.drawFlame(FIRE[0] - 34 - cx, FIRE[1] - 18 - cy, 74 * f, t, 1, false); ART.drawFlame(FIRE[0] - cx, FIRE[1] - 14 - cy, 118 * f, t, 2, false); ART.drawFlame(FIRE[0] + 36 - cx, FIRE[1] - 18 - cy, 82 * f, t, 3, false); });
      for (const v of this.vill) add(v.y, () => this.drawChar(v, cx, cy));
      for (const c of this.rit) add(c.y, () => this.drawChar(c, cx, cy, { flash: 0 }));
      add(this.Ah.y, () => { const A2 = this.Ah; if (A2.held) { const q = { x: this.hand.x, y: this.hand.y + 40, face: [0, 1], name: 'aahana', ph: 0, moving: false }; spr(ART.char('aahana', 'front'), q.x - cx, q.y - cy, { rot: Math.sin(t * 5) * 0.25 }); } else this.drawChar(A2, cx, cy); });
      for (const e of this.enemies) add(e.y, () => this.drawEnemy(e, cx, cy));
      add(P.y, () => {
        if (this.aura > 0) C.radial(P.x - cx, P.y - 40 - cy, 70, rgba(255, 150, 60, Math.round(70 * this.aura)), 2);
        this.drawPlayer(cx, cy);
      });
      if (this.aura > 0) add(this.Ah.y - 0.5, () => C.radial(this.Ah.x - cx, this.Ah.y - 40 - cy, 60, rgba(140, 190, 255, Math.round(70 * this.aura)), 2));
      // garlands hang above everything
      add(99999, () => { ART.drawGarland(600 - cx, 560 - cy, 1320 - cx, 560 - cy, 46, t); ART.drawGarland(600 - cx, 800 - cy, 1320 - cx, 800 - cy, 40, t + 1); });
      items.sort((p, q) => p[0] - q[0]); for (const it of items) it[1]();
      this.fx.draw(cx, cy);

      // lighting pass (CO4): ambient + point lights
      let amb = mix3(DUSK, ECL, this.ecl); amb = mix3(amb, BLESS, this.bless);
      const lights = [], fl = (k) => 1 + Math.sin(t * 13 + k) * 0.06 + Math.sin(t * 7.3 + k * 2) * 0.05;
      for (const d of this.diyas) if (d.lit) lights.push({ x: d.x - cx, y: d.y - 14 - cy, r: 120, c: [1, 0.62, 0.25], i: 0.9 * fl(d.seed) });
      lights.push({ x: 960 - cx, y: 300 - cy, r: 260, c: [1, 0.75, 0.4], i: 0.8 });
      if (this.fireOn) lights.push({ x: FIRE[0] - cx, y: FIRE[1] - 40 - cy, r: 320, c: [1, 0.3, 0.1], i: 1.1 * ease(this.fireP) * fl(5) });
      if (P.atk > 0) lights.push({ x: P.x - cx, y: P.y - 40 - cy, r: 170, c: [1, 0.55, 0.25], i: 0.6 });
      if (this.aura > 0) { lights.push({ x: P.x - cx, y: P.y - 40 - cy, r: 130, c: [1, 0.6, 0.3], i: 0.45 }); lights.push({ x: this.Ah.x - cx, y: this.Ah.y - 40 - cy, r: 110, c: [0.5, 0.7, 1], i: 0.4 }); }
      for (const l of [[600, 640], [1320, 640], [600, 880], [1320, 880]]) lights.push({ x: l[0] - cx, y: l[1] - 80 - cy, r: 110, c: [1, 0.7, 0.35], i: 0.5 * this.ecl });
      C.lighting(FB, amb, lights, 0.25);

      // overlays above the light: hand, goddess mandalas, Rta thread
      if (this.hand) ART.drawTamasurHand(this.hand.x - cx, this.hand.y - cy, this.hand.s, t, this.hand.open);
      this.drawGods(cx, cy);
      this.drawRta();
      this.drawHud(cx, cy);
    }
    drawGods(cx, cy) {
      const g = this.gods; if (!g) return;
      const P = this.P, A2 = this.Ah, R = 70 * g.p * (1 - g.m * 0.7);
      const pos = (b, e) => [lerp(b[0], e[0], g.m) - cx, lerp(b[1], e[1], g.m) - cy];
      const d = pos([P.x, P.y - 190], [P.x, P.y - 50]), s = pos([A2.x, A2.y - 180], [A2.x, A2.y - 50]);
      if (R > 2) { ART.drawMandala(d[0], d[1], R, G.t, [hex('#ffcf4a'), hex('#ff4a2a'), hex('#fff0b0')]); ART.drawMandala(s[0], s[1], R, -G.t, [hex('#e8f4ff'), hex('#6aa8ff'), hex('#ffffff')]); }
    }
    drawRta() {
      const r = this.rta; if (r.s < 0) return;
      const t = G.t, P0 = [-20, 80], P1 = [260, 10 + Math.sin(t) * 12], P2 = [640, 150 + Math.cos(t * 1.2) * 12], P3 = [980, 60];
      const pts = C.bezierPoints([P0, P1, P2, P3], 48), half = 24;
      const s = Math.min(1, r.s);
      const seg = (arr, col, w) => { for (let i = 0; i + 1 < arr.length; i++) C.lineThick(arr[i][0], arr[i][1], arr[i + 1][0], arr[i + 1][1], w, col); };
      let parts;
      if (r.s === 0) parts = [pts]; // whole thread
      else { // snapped: each half rotates about its own anchor (CO3 rotation about a pivot) and droops
        const ang = ease(s) * 0.9, mL = M3.about(P0[0], P0[1], M3.R(ang)), mR = M3.about(P3[0], P3[1], M3.R(-ang));
        parts = [pts.slice(0, half + 1).map(p => M3.apply(mL, p[0], p[1])), pts.slice(half).map(p => M3.apply(mR, p[0], p[1]))];
      }
      const dim = r.s >= 1 ? 0.4 : 1;
      for (const arr of parts) { seg(arr, rgba(255, 190, 60, Math.round(70 * dim)), 12); seg(arr, rgba(255, 215, 100, Math.round(230 * dim)), 4); seg(arr, rgba(255, 250, 220, Math.round(255 * dim)), 1.5); }
      if (r.s > 0 && r.s < 1 && r.snap) { const m = parts.length > 1 ? parts[0][half] : pts[half]; C.radial(m[0], m[1], 60 * (1 - s) + 10, rgba(255, 240, 200, 200), 2); }
    }
    drawHud(cx, cy) {
      const P = this.P, t = G.t;
      if (this.near && !G.dlg) { const n = this.near.o, bx = n.x - cx, by = n.y - cy - (this.near.t === 'diya' ? 34 : 130); C.disc(bx, by, 13, hex('#2a160c')); C.disc(bx, by, 11, hex('#f0dfb6')); G.text('E', bx, by - 9, { size: 16, bold: true, align: 'center', color: '#2a160c', shadow: false }); }
      // arrows at the screen edge point to enemies that are off-screen
      if (!G.dlg) for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - cx - SW / 2, dy = e.y - 30 - cy - SH / 2;
        if (Math.abs(dx) < SW / 2 && Math.abs(dy) < SH / 2) continue;
        const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, k = Math.min((SW / 2 - 26) / Math.abs(ux || 1e-6), (SH / 2 - 26) / Math.abs(uy || 1e-6));
        const px = SW / 2 + ux * k, py = SH / 2 + uy * k;
        C.fillPolygon([[px + ux * 13, py + uy * 13], [px - ux * 8 - uy * 10, py - uy * 8 + ux * 10], [px - ux * 8 + uy * 10, py - uy * 8 - ux * 10]], rgba(255, 70, 70, 230));
      }
      // health: diya flames
      for (let i = 0; i < 5; i++) { const x = 30 + i * 34, y = 40; C.blit(A.diya, x - A.diya.ax + 14, y - A.diya.ay + 14); if (i < P.hp) ART.drawFlame(x + 14, y + 3, 18, t, i + 1, false); }
      if (this.objective) G.text(this.objective, 26, 62, { size: 18, color: '#ffe3a0' });
      if (this.hintT > 0 && !G.dlg && this.hintS) { const w = 12 + this.hintS.length * 8.4; C.rect(480 - w / 2, 474, w, 34, rgba(0, 0, 0, 150)); G.text(this.hintS, 480, 481, { size: 19, align: 'center', color: '#fff4d0' }); }
      // minimap (CO5): window-to-viewport mapping of the world onto a small viewport
      const win = { x: 0, y: 0, w: WW, h: WH }, vp = { x: 800, y: 12, w: 148, h: 105 };
      C.rect(vp.x - 2, vp.y - 2, vp.w + 4, vp.h + 4, rgba(0, 0, 0, 170));
      const rr = (x0, y0, x1, y1, c) => { const a = C.windowToViewport(x0, y0, win, vp), b = C.windowToViewport(x1, y1, win, vp); C.rect(Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1]), c); };
      rr(0, 0, WW, WH, hex('#9c7a48')); rr(560, 420, 1360, 900, hex('#b9a888')); rr(0, 1000, WW, WH, hex('#5a4030')); rr(700, 330, 1220, 420, hex('#c9703a'));
      const dot = (x, y, c, r) => { const q = C.windowToViewport(x, y, win, vp); C.disc(Math.round(q[0]), Math.round(q[1]), r || 2, c); };
      for (const d of this.diyas) dot(d.x, d.y, d.lit ? hex('#ffb040') : hex('#7a4a2a'), 2);
      if (this.fireOn) dot(FIRE[0], FIRE[1], hex('#ff4a1a'), 3);
      for (const e of this.enemies) if (e.hp > 0) dot(e.x, e.y, hex('#c040ff'), 2);
      dot(this.Ah.x, this.Ah.y, hex('#bfe0ff'), 2); dot(P.x, P.y, hex('#ff3a3a'), 3);
      const v0 = C.windowToViewport(this.cam.x, this.cam.y, win, vp), v1 = C.windowToViewport(this.cam.x + SW, this.cam.y + SH, win, vp);
      const box = C.clipPolySH([[v0[0], v0[1]], [v1[0], v0[1]], [v1[0], v1[1]], [v0[0], v1[1]]], vp.x, vp.y, vp.x + vp.w, vp.y + vp.h); // Sutherland-Hodgman
      if (box.length > 2) C.polyline(box, rgba(255, 255, 255, 220), true);
    }
  }
  Level1.preload = assets;
  Level1.H = { Enemy, spr, shadow, viewOf, mix3, ease, WW, WH, SW, SH };
  return Level1;
})();
