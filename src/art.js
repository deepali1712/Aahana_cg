/* art.js - procedural world art (ground textures, rangoli, props, interlude art).
 * Everything is drawn with the CG library. Sprites are Surfaces with anchor (.ax,.ay)
 * = ground contact point (bottom centre) used for y-sorting.
 */
var ART = (function () {
  'use strict';
  const C = (typeof CG !== 'undefined') ? CG : require('./cg.js');
  const { rgba, hex, shade, mixc, withAlpha, clamp, M3 } = C;
  const ART = {};

  /* ---------- noise ---------- */
  const hash = (x, y, s) => {
    let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 2246822519)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) {
    let a = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < (oct || 3); i++) { a += vnoise(x * f, y * f, s + i) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return a / norm;
  }
  Object.assign(ART, { hash, vnoise, fbm });

  /* ---------- helpers ---------- */
  function mk(w, h, ax, ay, fn) { // build a sprite Surface, draw with fn(surface), restore target
    const prev = C.getTarget(), s = new C.Surface(w, h);
    s.ax = ax; s.ay = ay;
    C.setTarget(s); fn(s); C.setTarget(prev);
    return s;
  }
  ART.mk = mk;
  const shadowEl = (cx, cy, rx, ry, a) => C.ellipseFill(cx, cy, rx, ry, rgba(0, 0, 0, a === undefined ? 70 : a));
  ART.shadowEl = shadowEl;
  function bezPoly(a, b, c, d, n) { return C.bezierPoints([a, b, c, d], n || 16); }
  ART.bezPoly = bezPoly;
  function texRegion(S, x0, y0, w, h, fn) {
    const xa = Math.max(0, x0), ya = Math.max(0, y0), xb = Math.min(S.w, x0 + w), yb = Math.min(S.h, y0 + h);
    for (let y = ya; y < yb; y++) { const r = y * S.w; for (let x = xa; x < xb; x++) S.d[r + x] = fn(x, y); }
  }

  /* ---------- ground textures (CO2: per-pixel pattern fills) ---------- */
  const SAND_A = hex('#cfa86c'), SAND_B = hex('#b98d53');
  ART.sand = function (S, x0, y0, w, h) {
    texRegion(S, x0, y0, w, h, (x, y) => {
      let c = mixc(SAND_A, SAND_B, fbm(x / 80, y / 80, 1, 3));
      const m = vnoise(x / 5, y / 5, 7);
      if (m > 0.8) c = shade(c, 1.07); else if (m < 0.18) c = shade(c, 0.93);
      if (hash(x, y, 9) > 0.988) c = shade(c, 0.78);
      return c;
    });
  };
  const STONE = hex('#bfae92'), GROUT = hex('#6f5f4b');
  ART.pavers = function (S, x0, y0, w, h) {
    const tw = 56, th = 34;
    texRegion(S, x0, y0, w, h, (x, y) => {
      const row = Math.floor(y / th), off = (row & 1) ? tw / 2 : 0, col = Math.floor((x + off) / tw);
      const lx = (x + off) % tw, ly = y % th;
      if (lx < 2 || ly < 2) return GROUT;
      let k = 0.88 + hash(col, row, 3) * 0.24 + (vnoise(x / 3, y / 3, 5) - 0.5) * 0.12;
      if (lx < 4 || ly < 4) k *= 1.08; else if (lx > tw - 4 || ly > th - 3) k *= 0.92;
      return shade(STONE, k);
    });
  };
  const MUD_A = hex('#86613f'), MUD_B = hex('#6a4a2e');
  ART.crackedMud = function (S, x0, y0, w, h) {
    texRegion(S, x0, y0, w, h, (x, y) => {
      let c = mixc(MUD_A, MUD_B, fbm(x / 60, y / 60, 11, 3));
      if (hash(x, y, 4) > 0.99) c = shade(c, 0.8);
      return c;
    });
    const prev = C.getTarget(); C.setTarget(S); C.setClip(x0, y0, x0 + w, y0 + h);
    const r = C.rng(1234), crack = hex('#2e1d10'), edge = hex('#a07b52');
    const n = Math.floor(w * h / 5000);
    for (let i = 0; i < n; i++) {
      let x = x0 + r() * w, y = y0 + r() * h, a = r() * 6.28;
      const len = 6 + Math.floor(r() * 14);
      for (let k = 0; k < len; k++) {
        const nx = x + Math.cos(a) * 9, ny = y + Math.sin(a) * 9;
        C.line(x, y + 1, nx, ny + 1, edge); C.line(x, y, nx, ny, crack);
        if (r() < 0.12) { // branch
          const ba = a + (r() < 0.5 ? 1 : -1) * (0.9 + r() * 0.6);
          C.line(nx, ny, nx + Math.cos(ba) * 22, ny + Math.sin(ba) * 22, crack);
        }
        x = nx; y = ny; a += (r() - 0.5) * 0.9;
      }
    }
    C.resetClip(); C.setTarget(prev);
  };
  ART.ghatSteps = function (S, x0, y0, w, h) {
    const bh = 26;
    texRegion(S, x0, y0, w, h, (x, y) => {
      const ly = (y - y0) % bh;
      let k = 0.92 + (vnoise(x / 9, y / 9, 6) - 0.5) * 0.18 - (ly / bh) * 0.12;
      if (ly < 2) k = 1.22; else if (ly > bh - 3) k = 0.55;
      if (hash(x, y, 8) > 0.99) k *= 0.8;
      return shade(hex('#b8a78c'), k);
    });
  };
  ART.cellFloor = function (S, x0, y0, w, h) {
    const t = 48;
    texRegion(S, x0, y0, w, h, (x, y) => {
      const lx = x % t, ly = y % t, col = Math.floor(x / t), row = Math.floor(y / t);
      if (lx < 2 || ly < 2) return hex('#0e0d14');
      let k = 0.8 + hash(col, row, 5) * 0.3 + (vnoise(x / 4, y / 4, 2) - 0.5) * 0.14;
      if (lx < 4 || ly < 4) k *= 1.12;
      return shade(hex('#3a3a4c'), k);
    });
  };

  /* ---------- rangoli (CO2 polygon fill + CO3 rotation about a pivot) ---------- */
  function petalPoly(r0, r1, wid) {
    const left = bezPoly([0, -r0], [-wid, -r0 - (r1 - r0) * 0.2], [-wid * 0.9, -r0 - (r1 - r0) * 0.8], [0, -r1], 12);
    const right = bezPoly([0, -r0], [wid, -r0 - (r1 - r0) * 0.2], [wid * 0.9, -r0 - (r1 - r0) * 0.8], [0, -r1], 12).reverse();
    return left.concat(right);
  }
  ART.rangoli = function (cx, cy, R) {
    const pal = ['#ff9f1c', '#e5307a', '#ffffff', '#2fb36d', '#2f6fe0', '#ffd23f'].map(h => hex(h));
    C.disc(cx, cy, R + 6, rgba(40, 25, 10, 90));
    C.disc(cx, cy, R + 2, hex('#f6ead0')); C.disc(cx, cy, R - 4, hex('#d9c9a6'));
    const layer = (n, r0, r1, wid, c1, c2, rot) => {
      for (let i = 0; i < n; i++) {
        const a = rot + i * Math.PI * 2 / n, m = M3.about(cx, cy, M3.R(a));
        const pts = petalPoly(r0, r1, wid).map(p => M3.apply(M3.chain(M3.T(cx, cy), M3.R(a)), p[0], p[1]));
        C.fillPolygon(pts, i % 2 ? c2 : c1);
        C.polyline(pts, rgba(60, 20, 10, 230), true);
      }
    };
    layer(16, R * 0.62, R * 0.97, R * 0.16, pal[0], pal[1], 0);
    layer(12, R * 0.38, R * 0.66, R * 0.15, pal[4], pal[5], Math.PI / 12);
    layer(8, R * 0.14, R * 0.42, R * 0.13, pal[3], pal[2], 0);
    for (let i = 0; i < 24; i++) { const a = i * Math.PI * 2 / 24; C.disc(cx + Math.cos(a) * R * 1.0, cy + Math.sin(a) * R * 1.0, 3, i % 2 ? pal[2] : pal[5]); }
    C.circle(cx, cy, Math.round(R * 0.99), rgba(80, 30, 10, 220));
    C.disc(cx, cy, R * 0.14, pal[0]); C.disc(cx, cy, R * 0.08, pal[2]); C.disc(cx, cy, R * 0.04, pal[1]);
  };

  /* ---------- props ---------- */
  ART.tree = function (seed) {
    const r = C.rng(seed || 1);
    return mk(170, 200, 85, 194, () => {
      shadowEl(85, 192, 54, 12, 80);
      C.fillPolygon([[72, 194], [76, 118], [94, 118], [100, 194]], hex('#6b4423'));
      C.fillPolygon([[88, 194], [90, 118], [94, 118], [100, 194]], hex('#4d2f17'));
      const greens = [hex('#2c5a2a'), hex('#3a7a35'), hex('#4f9a41'), hex('#78bd56')];
      const blobs = [];
      for (let i = 0; i < 9; i++) blobs.push([85 + (r() - 0.5) * 80, 88 + (r() - 0.5) * 50, 26 + r() * 20]);
      blobs.sort((a, b) => a[1] - b[1]);
      for (let layer = 0; layer < 4; layer++)
        for (const b of blobs) C.disc(b[0] - layer * 3, b[1] - layer * 4 + 4, b[2] - layer * 5, greens[layer]);
      for (let i = 0; i < 60; i++) {
        const a = r() * 6.28, d = r() * 52;
        C.disc(85 + Math.cos(a) * d, 85 + Math.sin(a) * d * 0.7, 2, r() < 0.5 ? hex('#8fd16a') : hex('#1f4420'));
      }
    });
  };
  ART.house = function (variant) {
    const wall = variant ? hex('#d6a8a0') : hex('#dfb27a'), roof = variant ? hex('#a65a4a') : hex('#b9773c');
    return mk(210, 190, 105, 186, () => {
      shadowEl(105, 184, 98, 12, 80);
      C.fillPolygon([[14, 36], [196, 36], [206, 78], [4, 78]], roof);
      C.fillPolygon([[14, 36], [196, 36], [199, 46], [11, 46]], shade(roof, 1.18));
      C.rect(20, 78, 170, 106, wall); C.rect(20, 78, 170, 8, shade(wall, 0.82));
      C.rect(20, 78, 6, 106, shade(wall, 1.1)); C.rect(184, 78, 6, 106, shade(wall, 0.85));
      // warli diamond band
      for (let x = 30; x < 180; x += 16) {
        C.fillPolygon([[x + 8, 92], [x + 14, 98], [x + 8, 104], [x + 2, 98]], hex('#fff4e0'));
        C.fillPolygon([[x + 8, 96], [x + 11, 98], [x + 8, 100], [x + 5, 98]], shade(wall, 0.7));
      }
      // arched door with warm glow
      C.rect(86, 134, 38, 50, hex('#2a1608')); C.ellipseFill(105, 134, 19, 18, hex('#2a1608'));
      C.rect(90, 138, 30, 46, hex('#ffb347')); C.ellipseFill(105, 138, 15, 14, hex('#ffb347'));
      C.rect(90, 156, 30, 28, hex('#ff8f2b'));
      C.line(105, 124, 105, 184, hex('#5a3412'));
      // window
      C.rect(40, 126, 26, 26, hex('#4a2c12')); C.rect(43, 129, 20, 20, hex('#ffd27a'));
      C.line(53, 129, 53, 148, hex('#4a2c12')); C.line(43, 139, 62, 139, hex('#4a2c12'));
      C.rect(144, 126, 26, 26, hex('#4a2c12')); C.rect(147, 129, 20, 20, hex('#ffd27a'));
      C.line(157, 129, 157, 148, hex('#4a2c12')); C.line(147, 139, 166, 139, hex('#4a2c12'));
    });
  };
  ART.templeData = { w: 520, h: 440, ax: 260, ay: 436, door: [260, 292] };
  ART.temple = function () {
    const sand = hex('#e3b676');
    return mk(520, 440, 260, 436, () => {
      shadowEl(260, 434, 250, 12, 80);
      // stepped base
      const steps = [[40, 388, 440, 48], [72, 360, 376, 30], [104, 334, 312, 28]];
      steps.forEach((s, i) => { C.rect(s[0], s[1], s[2], s[3], shade(sand, 0.82 - i * 0.03)); C.rect(s[0], s[1], s[2], 7, shade(sand, 1.18)); C.rect(s[0], s[1] + s[3] - 5, s[2], 5, shade(sand, 0.6)); });
      // hall
      C.rect(130, 198, 260, 138, sand); C.rect(130, 198, 260, 8, shade(sand, 0.8));
      C.rect(120, 182, 280, 18, shade(sand, 0.72)); C.rect(120, 182, 280, 4, shade(sand, 1.15));
      for (let x = 126; x < 396; x += 10) C.rect(x, 192, 6, 7, shade(sand, 0.55)); // dentils
      // doorway glow
      C.rect(224, 250, 72, 86, hex('#3a1c08')); C.ellipseFill(260, 250, 36, 30, hex('#3a1c08'));
      C.rect(230, 256, 60, 80, hex('#ffc46a')); C.ellipseFill(260, 256, 30, 26, hex('#ffc46a'));
      C.rect(238, 290, 44, 46, hex('#ff9a35'));
      // sun-disc carving
      C.disc(260, 222, 13, shade(sand, 0.65)); C.disc(260, 222, 9, shade(sand, 1.1));
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; C.line(260 + Math.cos(a) * 15, 222 + Math.sin(a) * 15, 260 + Math.cos(a) * 21, 222 + Math.sin(a) * 21, shade(sand, 0.6)); }
      // pillars
      for (const px of [136, 170, 200, 306, 336, 366]) {
        C.rect(px, 206, 18, 130, shade(sand, 0.92)); C.rect(px, 206, 5, 130, shade(sand, 1.14)); C.rect(px + 13, 206, 5, 130, shade(sand, 0.62));
        C.rect(px - 3, 206, 24, 8, shade(sand, 0.7)); C.rect(px - 3, 328, 24, 8, shade(sand, 0.7));
      }
      // shikhara: curved tower from Bezier outline (CO6), pattern fill (CO2)
      const L = bezPoly([160, 182], [146, 130], [226, 100], [246, 58], 24);
      const Rr = L.map(p => [520 - p[0], p[1]]).reverse();
      C.fillPolygon(L.concat(Rr), (x, y) => {
        const t = clamp((x - 160) / 200, 0, 1);
        let k = 1.12 - t * 0.42;
        if (y % 13 < 2) k *= 0.74;
        if (Math.abs(((x - 260) % 17 + 17) % 17) < 1) k *= 0.88;
        return shade(sand, k);
      });
      C.polyline(L, hex('#8c5a24')); C.polyline(Rr, hex('#8c5a24'));
      for (let i = 0; i < 6; i++) { const y = 176 - i * 20, w2 = 92 - i * 12; C.rect(260 - w2, y, w2 * 2, 3, shade(sand, 1.25)); }
      C.ellipseFill(260, 56, 28, 11, shade(sand, 0.95)); C.ellipseFill(260, 52, 24, 8, shade(sand, 1.15));
      C.fillPolygon([[254, 46], [266, 46], [264, 30], [256, 30]], hex('#e8c24a'));
      C.disc(260, 28, 7, hex('#f2d15a'));
      C.line(260, 22, 260, 4, hex('#4a2c12'));
      C.fillPolygon([[261, 4], [284, 10], [261, 17]], hex('#e5532d'));
    });
  };
  ART.diya = function () {
    return mk(28, 22, 14, 20, () => {
      shadowEl(14, 19, 12, 3, 70);
      C.ellipseFill(14, 15, 11, 6, hex('#a8582b'));
      C.ellipseFill(14, 13, 11, 4, hex('#c9703a'));
      C.ellipseFill(14, 12, 8, 2, hex('#3a1a0a'));
      C.rect(13, 8, 2, 4, hex('#2a1a12'));
    });
  };
  ART.firePit = function () {
    return mk(140, 80, 70, 74, () => {
      shadowEl(70, 72, 62, 8, 80);
      C.ellipseFill(70, 54, 58, 24, hex('#4a3a30'));
      for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14, x = 70 + Math.cos(a) * 52, y = 54 + Math.sin(a) * 20; C.disc(x, y, 8, hex('#7a6a5a')); C.disc(x - 1, y - 2, 6, hex('#9a8a78')); }
      C.ellipseFill(70, 52, 40, 15, hex('#120a06'));
      C.line(40, 55, 100, 48, hex('#4a2a12')); C.line(40, 48, 100, 56, hex('#5a3418'));
      C.line(42, 56, 98, 49, hex('#3a200c'));
    });
  };
  ART.lampPillar = function () {
    return mk(40, 100, 20, 96, () => {
      shadowEl(20, 94, 16, 4, 70);
      C.rect(12, 40, 16, 54, hex('#b09a78')); C.rect(12, 40, 4, 54, hex('#d4c09a')); C.rect(24, 40, 4, 54, hex('#7a6a50'));
      C.rect(8, 86, 24, 10, hex('#9a8666')); C.rect(8, 34, 24, 8, hex('#9a8666'));
      C.ellipseFill(20, 32, 14, 6, hex('#c9703a')); C.ellipseFill(20, 30, 11, 3, hex('#3a1a0a'));
    });
  };
  ART.bush = function (seed) {
    const r = C.rng(seed || 3);
    return mk(80, 54, 40, 50, () => {
      shadowEl(40, 49, 34, 6, 70);
      const g = [hex('#2f6a30'), hex('#438a3b'), hex('#63ad4c')];
      for (let l = 0; l < 3; l++) for (let i = 0; i < 5; i++) C.disc(14 + i * 13 + (r() - 0.5) * 6 - l * 2, 34 - l * 5 + (r() - 0.5) * 6, 14 - l * 3, g[l]);
      for (let i = 0; i < 6; i++) C.disc(14 + r() * 52, 20 + r() * 18, 2, hex('#ffb3d9'));
    });
  };
  ART.rock = function (seed) {
    const r = C.rng(seed || 4);
    return mk(70, 46, 35, 42, () => {
      shadowEl(35, 41, 30, 5, 70);
      const pts = []; for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; pts.push([35 + Math.cos(a) * (24 + r() * 6), 28 + Math.sin(a) * (13 + r() * 4)]); }
      C.fillPolygon(pts, hex('#8a7c6a'));
      C.fillPolygon(pts.map(p => [p[0] - 2, p[1] - 4]).slice(0, 6), hex('#a89a86'));
    });
  };
  ART.dryShrub = function (seed) {
    const r = C.rng(seed || 5);
    return mk(60, 50, 30, 46, () => {
      shadowEl(30, 45, 22, 4, 60);
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, l = 16 + r() * 22; let x = 30, y = 44; const e = [30 + Math.cos(a) * l, 44 + Math.sin(a) * l]; C.line(x, y, e[0], e[1], hex('#5a4326')); C.line(e[0], e[1], e[0] + (r() - 0.5) * 12, e[1] - 6, hex('#7a5d36')); }
    });
  };
  ART.stoneRing = function (r) { // simple round stone for ghat edges
    return mk(30, 24, 15, 22, () => { shadowEl(15, 21, 12, 3, 60); C.ellipseFill(15, 14, 12, 8, hex('#8f8168')); C.ellipseFill(14, 12, 9, 5, hex('#aa9c82')); });
  };

  /* ---------- runtime garland (Bezier sag + marigold dots), CO6 ---------- */
  ART.drawGarland = function (ax, ay, bx, by, sag, t) {
    const mx = (ax + bx) / 2, my = Math.max(ay, by) + sag;
    const ctrl = [[ax, ay], [ax + (mx - ax) * 0.6, my], [bx - (bx - mx) * 0.6, my], [bx, by]];
    const pts = C.bezierPoints(ctrl, 28);
    C.polyline(pts, hex('#2f7a2f'));
    pts.forEach((p, i) => {
      const sway = Math.sin((t || 0) * 1.5 + i * 0.7) * 0.8;
      C.disc(p[0], p[1] + 2 + sway, 3, i % 3 === 0 ? hex('#ff7a00') : hex('#ffb703'));
      if (i % 4 === 0) C.disc(p[0], p[1] + 6 + sway, 2, hex('#e5307a'));
    });
  };

  /* ---------- interlude (cell) art ---------- */
  ART.cellPillar = function (glyph) { // 4 glyph shapes 0..3
    return mk(70, 120, 35, 114, () => {
      shadowEl(35, 112, 28, 6, 90);
      C.rect(14, 24, 42, 88, hex('#4a4a60')); C.rect(14, 24, 8, 88, hex('#6a6a86')); C.rect(48, 24, 8, 88, hex('#2a2a3a'));
      C.rect(8, 100, 54, 14, hex('#3a3a4c')); C.rect(8, 16, 54, 12, hex('#5a5a74'));
      const c = hex('#9fd8ff');
      C.circle(35, 62, 14, c);
      if (glyph === 0) C.line(35, 50, 35, 74, c);
      if (glyph === 1) C.polyline([[24, 72], [35, 50], [46, 72]], c, true);
      if (glyph === 2) { C.line(24, 62, 46, 62, c); C.line(35, 50, 35, 74, c); }
      if (glyph === 3) C.polyline([[26, 54], [44, 54], [26, 70], [44, 70]], c);
    });
  };
  ART.cellDoor = function () {
    return mk(160, 130, 80, 126, () => {
      shadowEl(80, 124, 64, 6, 90);
      C.rect(14, 20, 132, 106, hex('#3a3a4c')); C.ellipseFill(80, 20, 66, 20, hex('#3a3a4c'));
      C.rect(24, 30, 112, 96, hex('#26263a')); C.ellipseFill(80, 30, 56, 16, hex('#26263a'));
      C.line(80, 14, 80, 126, hex('#0e0d14'));
      for (let i = 0; i < 5; i++) C.rect(34, 44 + i * 16, 92, 3, hex('#34344c'));
      C.disc(80, 70, 12, hex('#1a1a28')); C.circle(80, 70, 12, hex('#6a6a9a'));
    });
  };

  return ART;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ART;
