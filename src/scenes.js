/* scenes.js - title screen, story cards, Interlude 1 (The Cell), game flow, boot, test hooks. */
var Scenes = (function () {
  'use strict';
  const C = CG, { rgba, hex, withAlpha, clamp, lerp, mixc, M3 } = C;
  const S = {};
  const ease = t => t * t * (3 - 2 * t);

  /* ---------- the Rta loom: golden Bezier threads (CO6), used behind story cards and the title ---------- */
  function drawLoom(t, alpha) {
    const a = alpha === undefined ? 1 : alpha;
    for (let i = 0; i < 16; i++) { // warp threads
      const x = 30 + i * 60, sway = Math.sin(t * 0.6 + i) * 14;
      const pts = C.bezierPoints([[x, 0], [x + sway, 180], [x - sway, 360], [x, 540]], 28);
      C.polyline(pts, rgba(255, 205, 100, Math.round(34 * a)), false);
    }
    for (let j = 0; j < 5; j++) { // weft threads weave across
      const y = 90 + j * 90, ph = t * 0.5 + j * 1.3;
      const pts = C.bezierPoints([[0, y], [300, y + Math.sin(ph) * 40], [660, y - Math.sin(ph) * 40], [960, y]], 40);
      C.polyline(pts, rgba(255, 225, 140, Math.round(50 * a)), false);
    }
  }

  /* ---------- title ---------- */
  let bgTitle = null;
  function titleBg() {
    if (bgTitle) return bgTitle;
    bgTitle = new C.Surface(960, 540); C.setTarget(bgTitle);
    const top = hex('#0c0620'), mid = hex('#2c1448'), low = hex('#6a2a44');
    for (let y = 0; y < 540; y++) { const t = y / 540; C.hspan(0, 959, y, t < 0.6 ? mixc(top, mid, t / 0.6) : mixc(mid, low, (t - 0.6) / 0.4)); }
    const r = C.rng(7);
    for (let i = 0; i < 90; i++) { const x = r() * 960, y = r() * 330; C.plot(x, y, rgba(255, 245, 220, 80 + Math.floor(r() * 150))); }
    C.setTarget(C.getFB());
    return bgTitle;
  }
  S.Title = class {
    enter() { this.t = 0; titleBg(); AUD.setMood('song'); this.blink = 0; }
    update(dt) {
      this.t += dt;
      if (G.hit('Enter', 'Space') && G.fadeA === 0 && !this.go) { this.go = true; AUD.init(); AUD.pluck(392, 0.5); G.transition(S.mk.intro()); }
    }
    draw() {
      const t = this.t, FB = C.getFB();
      C.blit(titleBg(), 0, 0);
      drawLoom(t, 0.8);
      ART.drawMandala(480, 318, 215, t, [hex('#ffcf4a'), hex('#ff7a2a'), hex('#fff0b0')]);
      ART.drawMandala(480, 318, 150, -t * 1.2, [hex('#ff9ac0'), hex('#ffd24a'), hex('#ffffff')]);
      ART.drawLotus(t * 0.6, 480, 335, 175);
      for (let i = 0; i < 14; i++) { const a = t * 0.3 + i * 0.45, rr = 230 + Math.sin(t + i) * 12; C.disc(480 + Math.cos(a) * rr, 318 + Math.sin(a) * rr * 0.82, 2, rgba(255, 230, 150, 200)); }
      G.text('AAHANA', 480, 18, { size: 88, align: 'center', color: '#ffe2a0', bold: true, glow: '#ff9a2a' });
      G.text('the first ray of dawn', 480, 112, { size: 24, align: 'center', italic: true, color: '#ffd8e8' });
      if (Math.floor(t * 1.6) % 2 === 0) G.text('Press ENTER', 480, 458, { size: 26, align: 'center', color: '#fff4d0', bold: true });
      G.text(AUD.on ? 'M: music on / off' : 'Press any key to start the music', 480, 498, { size: 16, align: 'center', color: '#e8d6a8' });
      if (AUD.toast > 0) G.text(AUD.muted ? 'Music OFF' : 'Music ON', 480, 20, { size: 20, align: 'center', color: '#ffd27a' });
      G.text('Pranit Waghmare and Deepali Ganachari  |  Computer Graphics Mini Project  |  Guide: Dr. Santosh Tamboli', 480, 508, { size: 14, align: 'center', color: '#d8c8e8' });
    }
  };

  /* ---------- story cards (typed text on the loom) ---------- */
  S.introPages = [
    { t: 'Before the first dawn, the world was a single loom. Its threads are called Rta: the order that tells the sun when to rise and the rivers where to flow.' },
    { t: 'Long ago the great river Saraswati vanished from the earth. Only her silent ghat remains, where every Navratri the village lights lamps for her return.' },
    { t: 'I am Aahana. This is the story of the night the threads broke, and of my sister, who walked into the dark to bring me home.' }
  ];
  S.Cards = class {
    constructor(pages, next, opts) { this.pages = pages; this.next = next; this.i = 0; this.n = 0; this.t = 0; this.opts = opts || {}; this.leaving = false; }
    enter() { AUD.setMood(this.opts.mood || 'calm'); }
    update(dt) {
      this.t += dt; const p = this.pages[this.i]; this.n += dt * (p.big ? 30 : 38);
      if (G.hit('Enter', 'Space', 'KeyE') && !this.leaving) {
        if (this.n < p.t.length) this.n = p.t.length;
        else if (this.i < this.pages.length - 1) { this.i++; this.n = 0; }
        else { this.leaving = true; G.transition(this.next && this.next(), 1.2); }
      }
      if (G.auto && this.n > p.t.length + 20 && !this.leaving) { if (this.i < this.pages.length - 1) { this.i++; this.n = 0; } else { this.leaving = true; G.transition(this.next && this.next(), 1.2); } }
    }
    draw() {
      C.getFB().clear(0xFF07040e);
      drawLoom(this.t, 1);
      const p = this.pages[this.i];
      C.radial(480, 270, 330, rgba(255, 190, 90, 30), 2);
      if (p.big) {
        G.text(p.t, 480, 190, { size: 44, align: 'center', bold: true, color: '#ffe2a0', glow: '#ff9a2a', maxW: 820, lh: 56, reveal: Math.floor(this.n) });
        if (p.sub) G.text(p.sub, 480, 300, { size: 24, align: 'center', italic: true, color: '#f3e6c4', maxW: 700, lh: 34, alpha: clamp((this.n - p.t.length) / 15, 0, 1) });
      } else G.text(p.t, 480, 170, { size: 27, align: 'center', italic: true, color: '#f6ead0', maxW: 720, lh: 42, reveal: Math.floor(this.n) });
      if (this.n >= p.t.length && Math.floor(this.t * 2) % 2 === 0) G.text('Enter', 480, 480, { size: 17, align: 'center', color: '#b8a888' });
      for (let k = 0; k < this.pages.length; k++) C.disc(450 + k * 30, 462, k === this.i ? 4 : 2, rgba(255, 220, 140, k === this.i ? 230 : 110));
    }
  };

  /* ---------- Interlude 1: The Cell (Aahana, sound puzzle) ---------- */
  const PX = [230, 400, 560, 730], PY = 372, KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF'], KEYL = ['A', 'S', 'D', 'F'];
  const SEQS = [[0, 2, 1, 3], [1, 3, 0, 2, 1]];
  let cellBg = null;
  function cellBackground() {
    if (cellBg) return cellBg;
    cellBg = new C.Surface(960, 540); C.setTarget(cellBg);
    ART.cellFloor(cellBg, 0, 170, 960, 370);
    // wall band: dark bricks with a vertical light falloff
    for (let y = 0; y < 170; y++) for (let x = 0; x < 960; x++) {
      const row = Math.floor(y / 28), off = (row % 2) * 40, lx = (x + off) % 80, ly = y % 28;
      let k = 0.55 + ART.hash(Math.floor((x + off) / 80), row, 3) * 0.25 - y / 170 * 0.25;
      if (lx < 2 || ly < 2) k = 0.2;
      cellBg.d[y * 960 + x] = C.shade(hex('#2e2e44'), k);
    }
    C.rect(0, 166, 960, 6, hex('#0e0d14'));
    // resonance rings engraved on the floor
    for (let i = 0; i < 4; i++) C.ellipse(480, 400, 150 + i * 70, 40 + i * 18, rgba(110, 130, 190, 70 - i * 12));
    C.setTarget(C.getFB());
    return cellBg;
  }
  S.Interlude1 = class {
    constructor(onComplete) { this.onComplete = onComplete; this.pausable = true; }
    enter() {
      cellBackground();
      this.pil = [0, 1, 2, 3].map(i => ART.cellPillar(i)); this.door = ART.cellDoor();
      this.act = [0, 0, 0, 0]; this.rings = []; this.pressed = [0, 0, 0, 0];
      this.state = 'intro'; this.round = 0; this.inp = []; this.seq = SEQS[0]; this.ok = false; this.fail = false; this.fin = false;
      this.doorY = 0; this.lock = -1; this.hintS = ''; this.pluckT = -1; this.wave = -1; this.veena = false; this.time = 0; this.shake = 0;
      this.script = new G.Script(this.run());
      AUD.setMood('calm'); AUD.setRaag('yaman');
    }
    light(i, vol) { this.act[i] = 1; this.rings.push({ x: PX[i], y: PY - 66, r: 8, life: 1 }); AUD.pluck(AUD.noteFreq(i), vol || 0.55); }
    *run() {
      const L = this;
      yield 1.0;
      yield* G.say('Aahana', 'The stone is humming... the pillars answer to sound. If I repeat what they sing, perhaps the lock will listen.', 'calm');
      for (let r = 0; r < 2; r++) {
        L.round = r; L.seq = SEQS[r];
        for (; ;) {
          L.state = 'watch'; L.hintS = 'Listen to the pillars...'; yield 0.8;
          for (const n of L.seq) { L.light(n); yield 0.75; }
          yield 0.3; L.state = 'input'; L.inp = []; L.ok = false; L.fail = false; L.hintS = 'Your turn: press A  S  D  F';
          yield () => L.ok || L.fail;
          if (L.ok) break;
          L.state = 'wrong'; L.hintS = 'The stone falls silent. Listen again.'; AUD.buzz(); L.shake = 0.5; yield 1.2;
        }
        L.state = 'right'; AUD.chime(); L.hintS = r === 0 ? 'The runes glow brighter. Once more, longer.' : ''; yield 1.2;
      }
      // the lock rings and the door slides open
      L.state = 'door'; L.hintS = ''; L.lock = 0; AUD.chime(); AUD.boom();
      yield* G.tween(1.6, p => { L.lock = p; });
      yield* G.tween(2.0, p => { L.doorY = -118 * ease(p); L.shake = 0.25; });
      yield 0.6;
      yield* G.say('Tamasur', 'Wisdom... sing for me, little one.', 'fierce');
      L.veena = true; yield 0.5;
      yield* G.say('Aahana', 'Didi... please hear me.', 'scared');
      L.state = 'send'; L.pluckT = 0; AUD.pluck(493.9, 0.7); setTimeout(() => AUD.pluck(587.3, 0.6), 220); // one note, sent as a wave
      yield* G.tween(3.0, p => { L.wave = p; });
      G.flash = 1; yield 0.7;
      L.fin = true;
      G.fadeTo(1, 1.0, () => { if (L.onComplete) L.onComplete(); });
      yield 99;
    }
    update(dt) {
      this.time += dt; this.script.update(dt);
      this.shake = Math.max(0, this.shake - dt);
      for (let i = 0; i < 4; i++) { this.act[i] = Math.max(0, this.act[i] - dt * 1.6); this.pressed[i] = Math.max(0, this.pressed[i] - dt * 4); }
      for (const r of this.rings) { r.r += dt * 170; r.life -= dt * 0.9; } this.rings = this.rings.filter(r => r.life > 0);
      if (this.state === 'input' && !G.dlg) {
        for (let i = 0; i < 4; i++) if (G.hit(KEYS[i])) {
          this.pressed[i] = 1; this.light(i, 0.6);
          if (i === this.seq[this.inp.length]) { this.inp.push(i); if (this.inp.length === this.seq.length) this.ok = true; } else this.fail = true;
        }
      }
    }
    draw() {
      const FB = C.getFB(), t = this.time, sh = this.shake, ox = sh ? Math.round((Math.random() - 0.5) * 8 * sh) : 0;
      C.blit(cellBackground(), ox, 0);
      // torches
      for (const x of [70, 890]) { C.rect(x - 4 + ox, 118, 8, 40, hex('#3a2a1a')); C.rect(x - 10 + ox, 112, 20, 8, hex('#6a4a2a')); ART.drawFlame(x + ox, 114, 38, t, x, true); }
      // door: dark opening, then the door slides up behind a clip window
      C.rect(400 + ox, 50, 160, 118, hex('#05040a'));
      if (this.doorY < -60) C.radial(480 + ox, 150, 150, rgba(190, 215, 255, Math.round(120 * (-this.doorY - 60) / 58)), 2);
      C.setClip(0, 0, 960, 170); C.blit(this.door, 480 - this.door.ax + ox, 170 - this.door.ay + this.doorY); C.setClip(0, 0, 960, 540);
      // y-sorted: pillars and Aahana
      const items = PX.map((x, i) => [PY, () => C.blit(this.pil[i], x - this.pil[i].ax + ox, PY - this.pil[i].ay)]);
      items.push([478, () => {
        const s = ART.char('aahana', this.veena ? 'veena' : 'front'), b = Math.sin(t * 2) * 0.8;
        const sm = M3.chain(M3.T(480, 478), M3.Shear(0.9, 0), M3.S(1, -0.3), M3.T(-s.ax, -s.ay)); C.drawBitmap(s, sm, { mul: [0, 0, 0], alpha: 0.3 });
        C.drawBitmap(s, M3.chain(M3.T(480 + ox, 478 - b), M3.T(-s.ax, -s.ay)));
      }]);
      items.sort((a, b) => a[0] - b[0]); items.forEach(i => i[1]());
      // key caps under each pillar
      for (let i = 0; i < 4; i++) { const x = PX[i] - 17, y = PY + 8, on = this.pressed[i] > 0; C.rect(x - 2, y - 2, 38, 30, hex('#0e0d14')); C.rect(x, y, 34, 26, on ? hex('#9fd8ff') : hex('#3a3a54')); }
      // lighting: cold ambient, torch light, glowing pillars, spill from the open door
      const lights = [{ x: 70 + ox, y: 130, r: 260, c: [1, 0.6, 0.3], i: 0.8 }, { x: 890 + ox, y: 130, r: 260, c: [1, 0.6, 0.3], i: 0.8 }, { x: 480, y: 440, r: 120, c: [0.7, 0.8, 1], i: 0.25 }];
      PX.forEach((x, i) => lights.push({ x, y: PY - 60, r: 190, c: [0.45, 0.72, 1], i: 0.18 + this.act[i] * 1.3 }));
      if (this.doorY < -60) lights.push({ x: 480, y: 190, r: 340, c: [0.75, 0.85, 1], i: 0.9 * (-this.doorY - 60) / 58 });
      C.lighting(FB, [0.30, 0.33, 0.48], lights, 0.3);
      // glow + sound visuals drawn after the light pass
      for (let i = 0; i < 4; i++) {
        if (this.act[i] > 0) C.radial(PX[i], PY - 62, 80, rgba(170, 220, 255, Math.round(170 * this.act[i])), 2);
        C.circle(PX[i], PY - 62, 16, rgba(190, 235, 255, Math.round(90 + 165 * this.act[i])));
      }
      for (const r of this.rings) { const a = Math.round(220 * clamp(r.life, 0, 1)); C.circle(r.x, r.y, Math.round(r.r), rgba(170, 225, 255, a)); C.circle(r.x, r.y, Math.round(r.r * 0.7), rgba(255, 255, 255, Math.round(a * 0.5))); }
      for (let i = 0; i < 3; i++) { // sine waves between neighbouring pillars
        const amp = Math.max(this.act[i], this.act[i + 1]) * 16; if (amp < 0.5) continue;
        const pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([lerp(PX[i], PX[i + 1], u), PY - 62 + Math.sin(u * 18 - t * 18) * amp * Math.sin(Math.PI * u)]); }
        C.polyline(pts, rgba(180, 230, 255, 200), false);
      }
      if (this.lock >= 0 && this.lock < 1) for (let k = 0; k < 3; k++) { const p = clamp(this.lock * 1.4 - k * 0.2, 0, 1); if (p > 0 && p < 1) C.circle(480, 110, Math.round(10 + p * 130), rgba(255, 220, 140, Math.round(230 * (1 - p)))); }
      if (this.state === 'send') this.drawSend(t);
      // text
      G.text('The Cell', 480, 14, { size: 22, align: 'center', italic: true, color: '#b8c4ea' });
      if (this.round >= 0 && this.state !== 'intro' && !G.dlg) G.text('Round ' + (this.round + 1) + ' of 2', 480, 40, { size: 17, align: 'center', color: '#9fb0d8' });
      if (this.hintS && !G.dlg) G.text(this.hintS, 480, 500, { size: 20, align: 'center', color: '#e8f0ff' });
      if (!G.dlg) for (let i = 0; i < 4; i++) G.text(KEYL[i], PX[i], PY + 10, { size: 20, bold: true, align: 'center', color: this.pressed[i] > 0 ? '#0e0d14' : '#cfd8ff', shadow: false });
      if (this.state === 'input') for (let i = 0; i < this.seq.length; i++) C.disc(480 + (i - (this.seq.length - 1) / 2) * 26, 74, 6, i < this.inp.length ? hex('#9fd8ff') : rgba(120, 140, 190, 120));
    }
    drawSend(t) { // the note travels as a glowing sine wave along a Bezier path, off-screen toward the forest
      const p = clamp(this.wave, 0, 1), path = [[480, 420], [260, 300], [720, 130], [1060, 40]];
      const pts = C.bezierPoints(path, 80), n = Math.floor(p * 80);
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const off = Math.sin(i * 0.5 - t * 20) * 9, fade = clamp(1 - (n - i) / 60, 0.1, 1);
        C.lineThick(a[0] - dy / l * off, a[1] + dx / l * off, b[0] - dy / l * off, b[1] + dx / l * off, 3, rgba(255, 235, 170, Math.round(235 * fade)));
      }
      if (n > 1) { const h = pts[n]; C.radial(h[0], h[1], 46, rgba(255, 240, 190, 230), 2); }
    }
  };

  /* ---------- flow: mk.* build scenes, flow.* jump straight to them ---------- */
  const mk = S.mk = {}, flow = S.flow = {};
  mk.title = () => new S.Title();
  mk.intro = () => new S.Cards(S.introPages, () => mk.level1(0), { mood: 'song' });
  mk.level1 = ph => new Level1(ph || 0, () => G.go(new S.Cards([{ t: 'Level 1 complete', sub: 'Saraswati Ghat', big: true }], () => mk.interlude1())));
  mk.interlude1 = () => new S.Interlude1(() => G.go(new S.Cards([{ t: 'Level 2: Chhaya Van', sub: 'The forest of shadows', big: true }], () => mk.level2())));
  mk.level2 = ph => new Level2(ph || 0, () => G.go(new S.Cards([{ t: 'Level 2 complete', sub: 'Chhaya Van', big: true }, { t: 'Level 3: Kamal Sarovar', sub: 'The lake of lotus', big: true }], () => mk.level3())));
  mk.level3 = ph => new Level3(ph || 0, () => G.go(new S.Cards([{ t: 'Level 3 complete', sub: 'Kamal Sarovar', big: true }, { t: 'Demo ends here', sub: 'Levels 4 and 5 are still to come. Thank you for playing!', big: true }], () => mk.title())));
  Object.keys(mk).forEach(k => { flow[k] = (...a) => G.go(mk[k](...a)); });

  S.boot = function (canvas) {
    G.start(canvas);
    const q = new URLSearchParams(location.search);
    const go = () => {
      if (q.get('auto')) G.auto = true;
      if (q.get('god')) G.god = true;
      const s = q.get('s');
      if (s === 'level1') flow.level1(+q.get('p') || 0); else if (s === 'level2') flow.level2(); else if (s === 'level3') flow.level3(); else if (s === 'interlude1') flow.interlude1(); else if (s === 'intro') flow.intro(); else flow.title();
      setTimeout(() => { try { Level1.preload(); ['devanshi', 'aahana', 'cultist'].forEach(n => ['front', 'back', 'side', 'right'].forEach(v => ART.char(n, v))); ART.char('imp', 'front'); ART.char('aahana', 'veena'); } catch (e) { console.warn(e); } }, 50);
    };
    G.scene = { update() { }, draw() { C.getFB().clear(0xFF000000); G.text('Loading...', 480, 250, { size: 28, align: 'center', color: '#ffd27a' }); } };
    G.fadeA = 0;
    Promise.resolve(ART.loadAssets ? ART.loadAssets() : null).then(go, go);
    window.__game = { G, CG: C, ART, AUD, S, flow, Level1, Level2, Level3 };
  };
  return S;
})();
