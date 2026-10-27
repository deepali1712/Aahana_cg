/* engine.js - game loop, input, cutscene script runner, dialogue box, text overlay, fades, particles.
 * Global `G`. Scenes are objects { enter(), update(dt), draw() }.
 * Text is the only thing drawn with canvas fillText (after CG.present); every pixel of art comes from CG.
 */
var G = (function () {
  'use strict';
  const C = CG, { rgba, hex, withAlpha, clamp, M3 } = C;
  const G = { W: 960, H: 540, keys: {}, pressed: new Set(), t: 0, dt: 0, scene: null, paused: false,
    fadeA: 1, fadeT: 0, fadeS: 1.5, fadeCb: null, texts: [], shake: 0, flash: 0, dlg: null, auto: false, god: false, dlgLock: 0 };

  /* ---------- input ---------- */
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', () => { if (typeof AUD !== 'undefined') AUD.init(); });
    window.addEventListener('keydown', e => {
      const c = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) e.preventDefault();
      if (!G.keys[c]) G.pressed.add(c);
      G.keys[c] = true;
      if (typeof AUD !== 'undefined') AUD.init();
    });
    window.addEventListener('keyup', e => { G.keys[e.code] = false; });
    window.addEventListener('blur', () => { G.keys = {}; });
  }
  G.down = (...cs) => cs.some(c => G.keys[c]);
  G.hit = (...cs) => cs.some(c => G.pressed.has(c));
  G.eat = (...cs) => cs.forEach(c => G.pressed.delete(c));
  G.axis = () => {
    let x = 0, y = 0;
    if (G.down('KeyA', 'ArrowLeft')) x -= 1; if (G.down('KeyD', 'ArrowRight')) x += 1;
    if (G.down('KeyW', 'ArrowUp')) y -= 1; if (G.down('KeyS', 'ArrowDown')) y += 1;
    const l = Math.hypot(x, y); return l ? [x / l, y / l] : [0, 0];
  };

  /* ---------- text overlay (queued during draw, flushed after present) ---------- */
  G.text = function (str, x, y, o) { G.texts.push({ s: str, x, y, o: o || {} }); };
  function wrap(ctx, str, maxW) {
    const out = []; let line = '';
    for (const w of str.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line); return out;
  }
  G.flushText = function (ctx) {
    for (const q of G.texts) {
      const o = q.o, size = o.size || 20;
      ctx.font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + size + 'px ' + (o.font || 'Georgia, "Times New Roman", serif');
      ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
      const lines = o.maxW ? wrap(ctx, q.s, o.maxW) : [q.s], lh = o.lh || size * 1.3;
      let left = o.reveal === undefined ? 1e9 : o.reveal;
      lines.forEach((ln, i) => {
        if (left <= 0) return;
        const s = ln.length <= left ? ln : ln.slice(0, left); left -= ln.length + 1;
        const y = q.y + i * lh;
        if (o.shadow !== false) { ctx.fillStyle = o.shadowColor || 'rgba(0,0,0,0.75)'; ctx.fillText(s, q.x + 1.5, y + 1.5); }
        if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 14; }
        ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
        ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, q.x, y);
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      });
    }
    G.texts.length = 0;
  };

  /* ---------- scripted sequences (generators) ---------- */
  G.Script = class {
    constructor(gen) { this.g = gen; this.w = null; this.done = false; }
    update(dt) {
      while (!this.done) {
        if (this.w) {
          if (this.w.t !== undefined) { this.w.t -= dt; if (this.w.t > 0) return; dt = 0; }
          else if (!this.w.f()) return;
          this.w = null;
        }
        const r = this.g.next();
        if (r.done) { this.done = true; return; }
        const v = r.value;
        if (typeof v === 'number') { this.w = { t: v }; return; } // always costs at least one frame
        this.w = { f: v };
      }
    }
  };
  G.say = function* (who, text, expr, opts) {
    G.dlg = { who, text, expr: expr || 'neutral', n: 0, done: false, t: 0, opts: opts || {} };
    const d = G.dlg;
    yield () => d.done;
    G.dlg = null;
  };
  G.tween = function* (dur, fn) {
    let t = 0;
    while (t < dur) { t += G.dt; fn(Math.min(1, t / dur)); yield 0; }
    fn(1);
  };

  /* ---------- fades / scene switching ---------- */
  G.fadeTo = function (a, speed, cb) { G.fadeT = a; G.fadeS = speed || 1.5; G.fadeCb = cb || null; };
  G.go = function (scene, fadeInSpeed) {
    G.scene = scene; G.dlg = null; G.texts.length = 0;
    if (scene.enter) scene.enter();
    G.fadeA = 1; G.fadeTo(0, fadeInSpeed || 1.5);
  };
  G.transition = function (scene, outSpeed) { G.fadeTo(1, outSpeed || 1.5, () => G.go(scene)); };

  /* ---------- particles (world space, owned by whoever calls) ---------- */
  G.Fx = class {
    constructor() { this.p = []; }
    burst(x, y, n, col, speed, life, grav) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, s = speed * (0.3 + Math.random() * 0.7);
        this.p.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, col, r: 1 + Math.random() * 2, g: grav || 0 });
      }
    }
    update(dt) {
      for (const q of this.p) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.vx *= 0.98; q.life -= dt; }
      this.p = this.p.filter(q => q.life > 0);
    }
    draw(cx, cy) {
      for (const q of this.p) C.disc(q.x - cx, q.y - cy, q.r * (0.5 + q.life / q.max), withAlpha(q.col, Math.round(255 * clamp(q.life / q.max, 0, 1))));
    }
  };

  /* ---------- portraits ---------- */
  const portCache = {};
  const ORB = { 'Vishnu': [hex('#cfe8ff'), hex('#3a7aff'), hex('#ffffff')], 'Lakshmi': [hex('#fff0b0'), hex('#ff9ac8'), hex('#ffffff')], 'Naga Queen': [hex('#d8ffb0'), hex('#3aa040'), hex('#ffe070')], 'Vayu': [hex('#d8ffe8'), hex('#5ad08a'), hex('#ffffff')], 'Maa Durga': [hex('#ffcf4a'), hex('#ff4a2a'), hex('#fff0b0')], 'Maa Saraswati': [hex('#bfe4ff'), hex('#6aa8ff'), hex('#ffffff')],
    Tamasur: [hex('#b04aff'), hex('#ff2a4a'), hex('#e0b0ff')], Cultists: [hex('#8a3a9a'), hex('#e0301a'), hex('#e0b0ff')], Cultist: [hex('#8a3a9a'), hex('#e0301a'), hex('#e0b0ff')] };
  G.portrait = function (name, expr) {
    const key = name.toLowerCase();
    if (!['devanshi', 'aahana', 'pujari'].includes(key)) return null;
    const k = key + expr;
    if (!portCache[k]) { const s = ART.portrait(key, expr); portCache[k] = C.resample(s, 112, 112); }
    return portCache[k];
  };

  /* ---------- dialogue box ---------- */
  function updateDlg(dt) {
    const d = G.dlg; if (!d) return;
    d.t += dt; d.n += dt * 48;
    if (G.dlgLock > 0) { G.dlgLock -= dt; return; }
    const adv = G.hit('Enter', 'KeyE', 'Space');
    if (adv) { G.eat('Enter', 'KeyE', 'Space'); if (d.n < d.text.length) d.n = d.text.length; else d.done = true; }
    else if (G.auto && d.n >= d.text.length + 8) d.done = true;
  }
  function drawDlg() {
    const d = G.dlg; if (!d) return;
    const x = 30, y = 374, w = 900, h = 140;
    C.rect(x + 4, y + 5, w, h, rgba(0, 0, 0, 90));
    C.rect(x, y, w, h, hex('#2a160c')); C.rect(x + 3, y + 3, w - 6, h - 6, hex('#f0dfb6')); C.rect(x + 3, y + 3, w - 6, 4, hex('#e2c88c'));
    C.polyline([[x + 9, y + 9], [x + w - 10, y + 9], [x + w - 10, y + h - 10], [x + 9, y + h - 10]], hex('#b8832f'), true);
    // portrait frame
    const px = x + 22, py = y + 14;
    C.rect(px - 3, py - 3, 118, 118, hex('#2a160c')); C.rect(px, py, 112, 112, hex('#3a2a52'));
    const pt = G.portrait(d.who, d.expr);
    if (pt) C.blit(pt, px, py);
    else { const cols = ORB[d.who] || ORB.Tamasur; C.setClip(px, py, px + 112, py + 112); ART.drawMandala(px + 56, py + 56, 46, G.t, cols); C.resetClip(); }
    G.text(d.who, x + 160, y + 18, { size: 21, bold: true, color: '#9a3a0a', shadow: false });
    G.text(d.text, x + 160, y + 48, { size: 22, color: '#2a160c', shadow: false, maxW: 720, lh: 29, reveal: Math.floor(d.n), italic: !!d.opts.italic });
    if (d.n >= d.text.length && Math.floor(G.t * 2) % 2 === 0) G.text('Enter \u25BE', x + w - 22, y + h - 34, { size: 16, align: 'right', color: '#7a4a1a', shadow: false });
  }

  /* ---------- frame ---------- */
  G.tick = function (dt, draw) {
    G.dt = dt; G.t += dt;
    if (G.hit('Escape') && G.scene && G.scene.pausable) G.paused = !G.paused;
    if (!G.paused) {
      updateDlg(dt);
      if (G.scene) G.scene.update(dt);
      G.shake = Math.max(0, G.shake - dt * 2.2); G.flash = Math.max(0, G.flash - dt * 1.6);
      if (typeof AUD !== 'undefined') AUD.tick(dt);
    }
    if (G.fadeA !== G.fadeT) {
      const s = G.fadeS * dt;
      G.fadeA = G.fadeA < G.fadeT ? Math.min(G.fadeT, G.fadeA + s) : Math.max(G.fadeT, G.fadeA - s);
      if (G.fadeA === G.fadeT && G.fadeCb) { const cb = G.fadeCb; G.fadeCb = null; cb(); }
    }
    if (draw !== false) G.render();
    G.pressed.clear();
  };
  G.render = function () {
    const FB = C.getFB();
    C.setTarget(FB);
    if (G.scene) G.scene.draw();
    drawDlg();
    if (G.flash > 0) C.fade(FB, 0xFFFFFFFF, G.flash);
    if (G.paused) { C.fade(FB, 0xFF000000, 0.55); G.text('PAUSED', 480, 220, { size: 44, align: 'center', color: '#ffd27a', bold: true }); G.text('Esc: resume', 480, 280, { size: 20, align: 'center', color: '#fff' }); }
    if (G.fadeA > 0) C.fade(FB, 0xFF000000, G.fadeA);
    C.present();
    G.flushText(C.getCtx());
  };
  G.sim = function (sec, step) { step = step || 1 / 30; for (let t = 0; t < sec; t += step) G.tick(step, false); };

  G.start = function (canvas) {
    C.init(canvas);
    let last = performance.now();
    const frame = ts => { const dt = Math.min(0.05, (ts - last) / 1000); last = ts; G.tick(dt); requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  };
  return G;
})();
