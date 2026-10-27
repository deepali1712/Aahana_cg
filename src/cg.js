/* cg.js  -  Software graphics library (Part 1: 2D core)
 * Aahana - Computer Graphics mini project.
 * Colours are packed 0xAABBGGRR unsigned ints (little-endian RGBA).
 * Part 2 (bitmaps, lighting, curves, 3D) lives in cg3d.js and extends this object.
 */
var CG = (function () {
  'use strict';
  const CG = {};
  CG.W = 960; CG.H = 540;

  /* ---------- colour / util ---------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (r, g, b, a) => ((((a === undefined ? 255 : a) & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
  const cR = c => c & 255, cG = c => (c >>> 8) & 255, cB = c => (c >>> 16) & 255, cA = c => c >>> 24;
  function hex(s, a) {
    s = s.replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    return rgba(parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16), a === undefined ? 255 : a);
  }
  function mixc(c1, c2, t) {
    return rgba(Math.round(lerp(cR(c1), cR(c2), t)), Math.round(lerp(cG(c1), cG(c2), t)),
      Math.round(lerp(cB(c1), cB(c2), t)), Math.round(lerp(cA(c1), cA(c2), t)));
  }
  function shade(c, k) {
    return rgba(clamp(Math.round(cR(c) * k), 0, 255), clamp(Math.round(cG(c) * k), 0, 255), clamp(Math.round(cB(c) * k), 0, 255), cA(c));
  }
  const withAlpha = (c, a) => ((c & 0x00ffffff) | ((clamp(a | 0, 0, 255)) << 24)) >>> 0;
  function rng(seed) { // mulberry32
    let s = seed >>> 0;
    const f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a, b) => a + (b - a) * f();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
    return f;
  }
  Object.assign(CG, { clamp, lerp, rgba, hex, cR, cG, cB, cA, mixc, shade, withAlpha, rng });

  /* ---------- surfaces and target / clip ---------- */
  class Surface {
    constructor(w, h, d) {
      this.w = w | 0; this.h = h | 0;
      this.d = d || new Uint32Array(this.w * this.h);
      this.ax = 0; this.ay = 0; // anchor (ground contact point) for sprites
    }
    clear(c) { this.d.fill(c === undefined ? 0 : c); return this; }
    clone() { const s = new Surface(this.w, this.h, new Uint32Array(this.d)); s.ax = this.ax; s.ay = this.ay; return s; }
  }
  CG.Surface = Surface;
  let T = new Surface(1, 1), cx0 = 0, cy0 = 0, cx1 = 1, cy1 = 1;
  function setTarget(s) { T = s; cx0 = 0; cy0 = 0; cx1 = s.w; cy1 = s.h; }
  const getTarget = () => T;
  function setClip(x0, y0, x1, y1) { cx0 = Math.max(0, x0 | 0); cy0 = Math.max(0, y0 | 0); cx1 = Math.min(T.w, x1 | 0); cy1 = Math.min(T.h, y1 | 0); }
  function resetClip() { cx0 = 0; cy0 = 0; cx1 = T.w; cy1 = T.h; }
  const getClip = () => [cx0, cy0, cx1, cy1];
  Object.assign(CG, { setTarget, getTarget, setClip, resetClip, getClip });

  /* ---------- display (double buffered frame buffer) ---------- */
  let FB = null, ctx = null, img = null, cvs = null;
  CG.init = function (canvas) {
    cvs = canvas; canvas.width = CG.W; canvas.height = CG.H;
    ctx = canvas.getContext('2d');
    img = ctx.createImageData(CG.W, CG.H);
    FB = new Surface(CG.W, CG.H, new Uint32Array(img.data.buffer));
    FB.clear(0xFF000000);
    setTarget(FB);
    return FB;
  };
  CG.present = function () { ctx.putImageData(img, 0, 0); };
  CG.getFB = () => FB;
  CG.getCtx = () => ctx;
  CG.getCanvas = () => cvs;

  /* ---------- pixels ---------- */
  function over(src, dst) {
    const sa = src >>> 24;
    if (sa === 255) return src;
    if (sa === 0) return dst;
    const da = dst >>> 24;
    if (da === 0) return src;
    const k = da * (255 - sa) / 255;
    const oa = sa + k;
    const r = (cR(src) * sa + cR(dst) * k) / oa, g = (cG(src) * sa + cG(dst) * k) / oa, b = (cB(src) * sa + cB(dst) * k) / oa;
    return rgba(Math.round(r), Math.round(g), Math.round(b), Math.round(oa));
  }
  function plot(x, y, c) {
    x = x | 0; y = y | 0;
    if (x < cx0 || x >= cx1 || y < cy0 || y >= cy1) return;
    const a = c >>> 24;
    if (a === 255) { T.d[y * T.w + x] = c; return; }
    if (a === 0) return;
    const i = y * T.w + x;
    T.d[i] = over(c, T.d[i]);
  }
  function getPixel(x, y) {
    if (x < 0 || y < 0 || x >= T.w || y >= T.h) return 0;
    return T.d[(y | 0) * T.w + (x | 0)];
  }
  function hspan(xa, xb, y, c) {
    y = y | 0;
    if (y < cy0 || y >= cy1) return;
    if (xa > xb) { const t = xa; xa = xb; xb = t; }
    xa = Math.max(cx0, xa | 0); xb = Math.min(cx1 - 1, xb | 0);
    if (xa > xb) return;
    const a = c >>> 24, d = T.d, row = y * T.w;
    if (a === 255) { d.fill(c, row + xa, row + xb + 1); return; }
    if (a === 0) return;
    for (let x = xa; x <= xb; x++) d[row + x] = over(c, d[row + x]);
  }
  function rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) hspan(x, x + w - 1, y + j, c);
  }
  Object.assign(CG, { over, plot, getPixel, hspan, rect });

  /* ---------- lines (CO1 / CO5) ---------- */
  function clipLineCS(x0, y0, x1, y1, xmin, ymin, xmax, ymax) { // Cohen-Sutherland
    const code = (x, y) => (x < xmin ? 1 : x > xmax ? 2 : 0) | (y < ymin ? 4 : y > ymax ? 8 : 0);
    let c0 = code(x0, y0), c1 = code(x1, y1);
    for (let guard = 0; guard < 20; guard++) {
      if (!(c0 | c1)) return [x0, y0, x1, y1];
      if (c0 & c1) return null;
      const co = c0 || c1;
      let x, y;
      if (co & 8) { x = x0 + (x1 - x0) * (ymax - y0) / (y1 - y0); y = ymax; }
      else if (co & 4) { x = x0 + (x1 - x0) * (ymin - y0) / (y1 - y0); y = ymin; }
      else if (co & 2) { y = y0 + (y1 - y0) * (xmax - x0) / (x1 - x0); x = xmax; }
      else { y = y0 + (y1 - y0) * (xmin - x0) / (x1 - x0); x = xmin; }
      if (co === c0) { x0 = x; y0 = y; c0 = code(x0, y0); } else { x1 = x; y1 = y; c1 = code(x1, y1); }
    }
    return null;
  }
  function line(x0, y0, x1, y1, c) { // Bresenham with CS clipping to the clip window
    const r = clipLineCS(x0, y0, x1, y1, cx0, cy0, cx1 - 1, cy1 - 1);
    if (!r) return;
    x0 = Math.round(r[0]); y0 = Math.round(r[1]); x1 = Math.round(r[2]); y1 = Math.round(r[3]);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (; ;) {
      plot(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function lineDDA(x0, y0, x1, y1, c) {
    const dx = x1 - x0, dy = y1 - y0, steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
    if (steps === 0) { plot(Math.round(x0), Math.round(y0), c); return; }
    const xi = dx / steps, yi = dy / steps;
    let x = x0, y = y0;
    for (let i = 0; i <= steps; i++) { plot(Math.round(x), Math.round(y), c); x += xi; y += yi; }
  }
  function lineThick(x0, y0, x1, y1, w, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * w / 2, ny = dx / L * w / 2;
    fillPolygon([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c);
  }
  function polyline(pts, c, closed) {
    for (let i = 0; i + 1 < pts.length; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
    if (closed && pts.length > 2) line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], c);
  }
  function clipPolySH(pts, xmin, ymin, xmax, ymax) { // Sutherland-Hodgman
    const edges = [
      [p => p[0] >= xmin, (a, b) => [xmin, a[1] + (b[1] - a[1]) * (xmin - a[0]) / (b[0] - a[0])]],
      [p => p[0] <= xmax, (a, b) => [xmax, a[1] + (b[1] - a[1]) * (xmax - a[0]) / (b[0] - a[0])]],
      [p => p[1] >= ymin, (a, b) => [a[0] + (b[0] - a[0]) * (ymin - a[1]) / (b[1] - a[1]), ymin]],
      [p => p[1] <= ymax, (a, b) => [a[0] + (b[0] - a[0]) * (ymax - a[1]) / (b[1] - a[1]), ymax]]
    ];
    let out = pts;
    for (const [inside, inter] of edges) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
        if (inside(cur)) { if (!inside(prev)) out.push(inter(prev, cur)); out.push(cur); }
        else if (inside(prev)) out.push(inter(prev, cur));
      }
      if (!out.length) break;
    }
    return out;
  }
  Object.assign(CG, { clipLineCS, line, lineDDA, lineThick, polyline, clipPolySH });

  /* ---------- circles / ellipses (CO1 / CO2) ---------- */
  function circle(cx, cy, r, c) { // midpoint circle (outline)
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    let x = 0, y = r, p = 1 - r;
    while (x <= y) {
      plot(cx + x, cy + y, c); plot(cx - x, cy + y, c); plot(cx + x, cy - y, c); plot(cx - x, cy - y, c);
      plot(cx + y, cy + x, c); plot(cx - y, cy + x, c); plot(cx + y, cy - x, c); plot(cx - y, cy - x, c);
      x++;
      if (p < 0) p += 2 * x + 1; else { y--; p += 2 * (x - y) + 1; }
    }
  }
  function disc(cx, cy, r, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) {
      const v = r * r - dy * dy;
      if (v < 0) continue;
      const e = Math.floor(Math.sqrt(v));
      hspan(cx - e, cx + e, cy + dy, c);
    }
  }
  function ellipse(cx, cy, rx, ry, c) { // midpoint ellipse (outline)
    cx = Math.round(cx); cy = Math.round(cy); rx = Math.round(rx); ry = Math.round(ry);
    if (rx <= 0 || ry <= 0) return;
    const rx2 = rx * rx, ry2 = ry * ry;
    let x = 0, y = ry, px = 0, py = 2 * rx2 * y;
    const four = () => { plot(cx + x, cy + y, c); plot(cx - x, cy + y, c); plot(cx + x, cy - y, c); plot(cx - x, cy - y, c); };
    let p = ry2 - rx2 * ry + 0.25 * rx2;
    while (px < py) {
      four(); x++; px += 2 * ry2;
      if (p < 0) p += ry2 + px; else { y--; py -= 2 * rx2; p += ry2 + px - py; }
    }
    p = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
    while (y >= 0) {
      four(); y--; py -= 2 * rx2;
      if (p > 0) p += rx2 - py; else { x++; px += 2 * ry2; p += rx2 - py + px; }
    }
  }
  function ellipseFill(cx, cy, rx, ry, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    const R = Math.ceil(ry);
    for (let dy = -R; dy <= R; dy++) {
      const t = 1 - (dy * dy) / (ry * ry);
      if (t < 0) continue;
      const e = Math.floor(rx * Math.sqrt(t));
      hspan(cx - e, cx + e, cy + dy, c);
    }
  }
  function radial(cx, cy, r, c, power) { // soft glow, alpha falls off with distance
    power = power || 2;
    const r2 = r * r, base = cA(c), x0 = Math.max(cx0, Math.floor(cx - r)), x1 = Math.min(cx1 - 1, Math.ceil(cx + r));
    const y0 = Math.max(cy0, Math.floor(cy - r)), y1 = Math.min(cy1 - 1, Math.ceil(cy + r));
    const rgb = c & 0x00ffffff;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ddx = x - cx, ddy = y - cy, dd2 = ddx * ddx + ddy * ddy;
      if (dd2 >= r2) continue;
      const q1 = 1 - Math.sqrt(dd2) / r;
      const a = Math.round(base * (power === 2 ? q1 * q1 : Math.pow(q1, power)));
      if (a > 0) plot(x, y, (rgb | (a << 24)) >>> 0);
    }
  }
  function arcRing(cx, cy, rIn, rOut, a0, a1, c) {
    const TAU = Math.PI * 2, span = a1 - a0;
    const x0 = Math.max(cx0, Math.floor(cx - rOut)), x1 = Math.min(cx1 - 1, Math.ceil(cx + rOut));
    const y0 = Math.max(cy0, Math.floor(cy - rOut)), y1 = Math.min(cy1 - 1, Math.ceil(cy + rOut));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d < rIn || d > rOut) continue;
      let a = Math.atan2(dy, dx) - a0;
      a = ((a % TAU) + TAU) % TAU;
      if (a <= span) plot(x, y, c);
    }
  }
  Object.assign(CG, { circle, disc, ellipse, ellipseFill, radial, arcRing });

  /* ---------- polygon fill, flood fill, boundary fill (CO2) ---------- */
  function fillPolygon(pts, c) { // scanline, even-odd. c may be a colour or fn(x,y)->colour
    const n = pts.length;
    if (n < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) { if (pts[i][1] < minY) minY = pts[i][1]; if (pts[i][1] > maxY) maxY = pts[i][1]; }
    const y0 = Math.max(cy0, Math.ceil(minY - 0.5)), y1 = Math.min(cy1 - 1, Math.floor(maxY - 0.5));
    const isFn = typeof c === 'function';
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.ceil(xs[k] - 0.5), xb = Math.ceil(xs[k + 1] - 0.5) - 1;
        if (isFn) { for (let x = Math.max(cx0, xa); x <= Math.min(cx1 - 1, xb); x++) plot(x, y, c(x, y)); }
        else hspan(xa, xb, y, c);
      }
    }
  }
  function floodFill(x, y, newC, surface) { // 4-connected, scanline stack
    const S = surface || T;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= S.w || y >= S.h) return;
    const d = S.d, w = S.w, h = S.h, old = d[y * w + x];
    if (old === newC) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [sx, sy] = stack.pop();
      if (d[sy * w + sx] !== old) continue;
      let l = sx, r = sx;
      while (l > 0 && d[sy * w + l - 1] === old) l--;
      while (r < w - 1 && d[sy * w + r + 1] === old) r++;
      for (let i = l; i <= r; i++) d[sy * w + i] = newC;
      for (const ny of [sy - 1, sy + 1]) {
        if (ny < 0 || ny >= h) continue;
        let inRun = false;
        for (let i = l; i <= r; i++) {
          const m = d[ny * w + i] === old;
          if (m && !inRun) { stack.push([i, ny]); inRun = true; } else if (!m) inRun = false;
        }
      }
    }
  }
  function boundaryFill(x, y, fillC, boundC, surface) { // 4-connected, stops at boundC
    const S = surface || T, d = S.d, w = S.w, h = S.h;
    const stack = [[x | 0, y | 0]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const v = d[py * w + px];
      if (v === boundC || v === fillC) continue;
      d[py * w + px] = fillC;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }
  Object.assign(CG, { fillPolygon, floodFill, boundaryFill });

  /* ---------- 2D transforms (CO3), row-major 3x3, column vectors ---------- */
  const M3 = {
    id: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    T: (tx, ty) => [1, 0, tx, 0, 1, ty, 0, 0, 1],
    S: (sx, sy) => [sx, 0, 0, 0, sy === undefined ? sx : sy, 0, 0, 0, 1],
    R: a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
    Shear: (shx, shy) => [1, shx || 0, 0, shy || 0, 1, 0, 0, 0, 1],
    ReflectX: () => [1, 0, 0, 0, -1, 0, 0, 0, 1], // flips y (mirror about the x axis)
    ReflectY: () => [-1, 0, 0, 0, 1, 0, 0, 0, 1], // flips x (mirror about the y axis)
    mul(a, b) { // apply b first, then a
      const r = new Array(9);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
      return r;
    },
    chain(...ms) { let r = ms[0]; for (let i = 1; i < ms.length; i++) r = M3.mul(r, ms[i]); return r; },
    apply: (m, x, y) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]],
    about: (px, py, m) => M3.chain(M3.T(px, py), m, M3.T(-px, -py)),
    inv(m) {
      const [a, b, c, d, e, f] = m, det = a * e - b * d;
      if (Math.abs(det) < 1e-12) return null;
      const id = 1 / det;
      return [e * id, -b * id, (b * f - c * e) * id, -d * id, a * id, (c * d - a * f) * id, 0, 0, 1];
    }
  };
  CG.M3 = M3;

  /* ---------- window to viewport (CO5): win/vp = {x,y,w,h} ---------- */
  CG.windowToViewport = function (x, y, win, vp) {
    return [vp.x + (x - win.x) * vp.w / win.w, vp.y + (y - win.y) * vp.h / win.h];
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CG;
  return CG;
})();
