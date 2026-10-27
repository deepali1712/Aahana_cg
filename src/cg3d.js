/* cg3d.js - Software graphics library (Part 2): curves, bitmaps, lighting, 3D.
 * Extends the CG object created by cg.js (cg.js must be loaded first).
 */
(function () {
  'use strict';
  const C = (typeof CG !== 'undefined') ? CG : require('./cg.js');
  const { clamp, lerp, rgba, cR, cG, cB, cA, mixc, shade, Surface, plot, over } = C;

  /* ================= CURVES (CO6) ================= */
  function bezierN(pts, t) { // de Casteljau, any degree, any dimension
    let p = pts.map(q => q.slice());
    for (let k = p.length - 1; k > 0; k--)
      for (let i = 0; i < k; i++) p[i] = p[i].map((v, j) => v + (p[i + 1][j] - v) * t);
    return p[0];
  }
  function bezier(p0, p1, p2, p3, t) { // cubic, explicit Bernstein form
    const u = 1 - t, b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
    return p0.map((_, j) => b0 * p0[j] + b1 * p1[j] + b2 * p2[j] + b3 * p3[j]);
  }
  function bezierPoints(pts, n) {
    n = n || 32; const out = [];
    for (let i = 0; i <= n; i++) out.push(pts.length === 4 ? bezier(pts[0], pts[1], pts[2], pts[3], i / n) : bezierN(pts, i / n));
    return out;
  }
  function bezierCurve(pts, c, n) { C.polyline(bezierPoints(pts, n || 40), c, false); }
  function bsplinePoint(p0, p1, p2, p3, t) { // uniform cubic B-spline segment
    const t2 = t * t, t3 = t2 * t;
    const b0 = (1 - t) * (1 - t) * (1 - t) / 6, b1 = (3 * t3 - 6 * t2 + 4) / 6, b2 = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6, b3 = t3 / 6;
    return p0.map((_, j) => b0 * p0[j] + b1 * p1[j] + b2 * p2[j] + b3 * p3[j]);
  }
  function bsplinePoints(pts, nPer) {
    nPer = nPer || 16; const out = [];
    for (let i = 0; i + 3 < pts.length; i++)
      for (let k = 0; k < nPer; k++) out.push(bsplinePoint(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], k / nPer));
    if (pts.length >= 4) { const n = pts.length; out.push(bsplinePoint(pts[n - 4], pts[n - 3], pts[n - 2], pts[n - 1], 1)); }
    return out;
  }
  function bezierSurfacePoint(net, u, v) { // net[i][j]: i along u, j along v
    const col = net.map(row => bezierN(row, v));
    return bezierN(col, u);
  }
  function bezierPatchMesh(net, nu, nv, colorFn) {
    const V = [], F = [], Cc = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv;
      V.push(bezierSurfacePoint(net, u, v));
      Cc.push(colorFn ? colorFn(u, v) : 0xFFFFFFFF);
    }
    const id = (i, j) => i * (nv + 1) + j;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      F.push([a, b, c], [a, c, d]); // CCW seen from +z when u->+x, v->+y
    }
    return { V, F, C: Cc };
  }
  Object.assign(C, { bezierN, bezier, bezierPoints, bezierCurve, bsplinePoint, bsplinePoints, bezierSurfacePoint, bezierPatchMesh });

  /* ================= BITMAPS ================= */
  function normMul(m) { return m === undefined ? null : (typeof m === 'number' ? [m, m, m] : m); }
  function applyOpts(c, flash, flashC, mul, alpha) {
    let r = cR(c), g = cG(c), b = cB(c), a = cA(c);
    if (mul) { r = Math.min(255, r * mul[0]); g = Math.min(255, g * mul[1]); b = Math.min(255, b * mul[2]); }
    if (flash) { r += (flashC[0] - r) * flash; g += (flashC[1] - g) * flash; b += (flashC[2] - b) * flash; }
    return rgba(r | 0, g | 0, b | 0, Math.round(a * alpha));
  }
  function blit(src, dx, dy, o) {
    o = o || {};
    const T = C.getTarget(), clip = C.getClip();
    dx = Math.round(dx); dy = Math.round(dy);
    const alpha = o.alpha === undefined ? 1 : o.alpha, flash = o.flash || 0, mul = normMul(o.mul), flip = !!o.flip;
    const flashC = o.flashColor || [255, 255, 255];
    const plain = !flash && !mul && alpha === 1;
    const xa = Math.max(clip[0], dx), xb = Math.min(clip[2], dx + src.w);
    const ya = Math.max(clip[1], dy), yb = Math.min(clip[3], dy + src.h);
    for (let y = ya; y < yb; y++) {
      const sr = (y - dy) * src.w, tr = y * T.w;
      for (let x = xa; x < xb; x++) {
        const sx = flip ? src.w - 1 - (x - dx) : x - dx;
        let c = src.d[sr + sx];
        const a = c >>> 24;
        if (a === 0) continue;
        if (!plain) c = applyOpts(c, flash, flashC, mul, alpha);
        if ((c >>> 24) === 255) T.d[tr + x] = c;
        else T.d[tr + x] = over(c, T.d[tr + x]);
      }
    }
  }
  function drawBitmap(src, m, o) { // affine: m maps source pixel space -> target space
    o = o || {};
    const eps = 1e-9;
    if (Math.abs(m[1]) < eps && Math.abs(m[3]) < eps && Math.abs(m[4] - 1) < eps && Math.abs(m[6]) < eps && Math.abs(m[7]) < eps) {
      if (Math.abs(m[0] - 1) < eps) { blit(src, m[2], m[5], o); return; }
      if (Math.abs(m[0] + 1) < eps) { blit(src, m[2] - src.w, m[5], Object.assign({}, o, { flip: !o.flip })); return; }
    }
    const im = C.M3.inv(m);
    if (!im) return;
    const T = C.getTarget(), clip = C.getClip();
    const corners = [[0, 0], [src.w, 0], [src.w, src.h], [0, src.h]].map(p => C.M3.apply(m, p[0], p[1]));
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const p of corners) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    const xa = Math.max(clip[0], Math.floor(minx)), xb = Math.min(clip[2] - 1, Math.ceil(maxx));
    const ya = Math.max(clip[1], Math.floor(miny)), yb = Math.min(clip[3] - 1, Math.ceil(maxy));
    const alpha = o.alpha === undefined ? 1 : o.alpha, flash = o.flash || 0, mul = normMul(o.mul), flashC = o.flashColor || [255, 255, 255];
    const sw = src.w, sh = src.h, sd = src.d;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const px = x + 0.5, py = y + 0.5;
      const u = im[0] * px + im[1] * py + im[2] - 0.5, v = im[3] * px + im[4] * py + im[5] - 0.5;
      if (u < -1 || v < -1 || u >= sw || v >= sh) continue;
      const ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
      let A = 0, R = 0, G = 0, B = 0;
      for (let k = 0; k < 4; k++) {
        const tx = ix + (k & 1), ty = iy + (k >> 1);
        if (tx < 0 || ty < 0 || tx >= sw || ty >= sh) continue;
        const wgt = ((k & 1) ? fx : 1 - fx) * ((k >> 1) ? fy : 1 - fy);
        const c = sd[ty * sw + tx], a = (c >>> 24) * wgt;
        A += a; R += cR(c) * a; G += cG(c) * a; B += cB(c) * a;
      }
      if (A < 1) continue;
      let c = rgba(Math.round(R / A), Math.round(G / A), Math.round(B / A), Math.round(A));
      if (flash || mul || alpha !== 1) c = applyOpts(c, flash, flashC, mul, alpha);
      const i = y * T.w + x;
      T.d[i] = (c >>> 24) === 255 ? c : over(c, T.d[i]);
    }
  }
  function resample(src, nw, nh) {
    nw = Math.max(1, Math.round(nw)); nh = Math.max(1, Math.round(nh));
    const out = new Surface(nw, nh), sx = src.w / nw, sy = src.h / nh, sd = src.d, sw = src.w, sh = src.h;
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let A = 0, R = 0, G = 0, B = 0, W = 0;
      if (sx > 1 || sy > 1) { // box filter (premultiplied)
        const fx0 = x * sx, fx1 = (x + 1) * sx, fy0 = y * sy, fy1 = (y + 1) * sy;
        for (let j = Math.floor(fy0); j < Math.min(sh, Math.ceil(fy1)); j++) {
          const wy = Math.min(j + 1, fy1) - Math.max(j, fy0);
          for (let i = Math.floor(fx0); i < Math.min(sw, Math.ceil(fx1)); i++) {
            const w = wy * (Math.min(i + 1, fx1) - Math.max(i, fx0)); if (w <= 0) continue;
            const c = sd[j * sw + i], a = (c >>> 24) * w;
            A += a; R += cR(c) * a; G += cG(c) * a; B += cB(c) * a; W += w;
          }
        }
        if (W > 0 && A > 0) out.d[y * nw + x] = rgba(Math.round(R / A), Math.round(G / A), Math.round(B / A), Math.round(A / W));
      } else { // bilinear
        const u = (x + 0.5) * sx - 0.5, v = (y + 0.5) * sy - 0.5, ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
        for (let k = 0; k < 4; k++) {
          const tx = clamp(ix + (k & 1), 0, sw - 1), ty = clamp(iy + (k >> 1), 0, sh - 1);
          const w = ((k & 1) ? fx : 1 - fx) * ((k >> 1) ? fy : 1 - fy);
          const c = sd[ty * sw + tx], a = (c >>> 24) * w;
          A += a; R += cR(c) * a; G += cG(c) * a; B += cB(c) * a;
        }
        if (A > 0) out.d[y * nw + x] = rgba(Math.round(R / A), Math.round(G / A), Math.round(B / A), Math.round(A));
      }
    }
    return out;
  }
  function crop(src, x, y, w, h) {
    const out = new Surface(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const sx = x + i, sy = y + j;
      if (sx >= 0 && sy >= 0 && sx < src.w && sy < src.h) out.d[j * w + i] = src.d[sy * src.w + sx];
    }
    return out;
  }
  function alphaBounds(src, thr) {
    thr = thr === undefined ? 8 : thr;
    let x0 = src.w, y0 = src.h, x1 = -1, y1 = -1;
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if ((src.d[y * src.w + x] >>> 24) > thr) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function outline(src, colour, t) { // sticker outline; returns a new, larger surface
    t = t || 2;
    const w = src.w + 2 * t, h = src.h + 2 * t, out = new Surface(w, h);
    out.ax = src.ax + t; out.ay = src.ay + t;
    const offs = [];
    for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) if (dx * dx + dy * dy <= t * t + 1) offs.push([dx, dy]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x - t, sy = y - t;
      if (sx >= 0 && sy >= 0 && sx < src.w && sy < src.h && (src.d[sy * src.w + sx] >>> 24) > 200) { out.d[y * w + x] = src.d[sy * src.w + sx]; continue; }
      let hit = false;
      for (const [dx, dy] of offs) {
        const nx = sx + dx, ny = sy + dy;
        if (nx >= 0 && ny >= 0 && nx < src.w && ny < src.h && (src.d[ny * src.w + nx] >>> 24) > 128) { hit = true; break; }
      }
      const own = (sx >= 0 && sy >= 0 && sx < src.w && sy < src.h) ? src.d[sy * src.w + sx] : 0;
      if (own >>> 24) out.d[y * w + x] = hit ? over(own, colour) : own;
      else if (hit) out.d[y * w + x] = colour;
    }
    return out;
  }
  function chromaKey(S, tol, feather) { // removes a flat background connected to the border
    tol = tol === undefined ? 60 : tol; feather = feather === undefined ? 40 : feather;
    const w = S.w, h = S.h, d = S.d;
    const corners = [d[0], d[w - 1], d[(h - 1) * w], d[h * w - 1]];
    const kr = corners.reduce((s, c) => s + cR(c), 0) / 4, kg = corners.reduce((s, c) => s + cG(c), 0) / 4, kb = corners.reduce((s, c) => s + cB(c), 0) / 4;
    const dist = c => Math.hypot(cR(c) - kr, cG(c) - kg, cB(c) - kb);
    const seen = new Uint8Array(w * h), stack = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = y * w + x; if (seen[i]) return; if (dist(d[i]) > tol + feather) return; seen[i] = 1; stack.push(i); };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0, dd = dist(d[i]);
      if (dd <= tol) d[i] = 0;
      else { const a = Math.round(cA(d[i]) * (dd - tol) / feather); d[i] = (d[i] & 0x00ffffff | (a << 24)) >>> 0; continue; }
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    return S;
  }
  Object.assign(C, { blit, drawBitmap, resample, crop, alphaBounds, outline, chromaKey });

  /* ================= LIGHTING (CO4) ================= */
  function lighting(S, amb, lights, vignette) {
    const w = S.w, h = S.h, q = 4, lw = Math.ceil(w / q) + 2, lh = Math.ceil(h / q) + 2;
    const lm = new Float32Array(lw * lh * 3);
    vignette = vignette || 0;
    for (let k = 0; k < lm.length; k += 3) { lm[k] = amb[0]; lm[k + 1] = amb[1]; lm[k + 2] = amb[2]; }
    for (let k = 0; k < lights.length; k++) { // each light only touches the light-map cells inside its radius
      const L = lights[k], r2 = L.r * L.r, inten = L.i === undefined ? 1 : L.i;
      const i0 = Math.max(0, Math.floor((L.x - L.r) / q)), i1 = Math.min(lw - 1, Math.ceil((L.x + L.r) / q));
      const j0 = Math.max(0, Math.floor((L.y - L.r) / q)), j1 = Math.min(lh - 1, Math.ceil((L.y + L.r) / q));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = i * q - L.x, dy = j * q - L.y, d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const t = 1 - Math.sqrt(d2) / L.r, f = t * t * inten, o = (j * lw + i) * 3;
        lm[o] += L.c[0] * f; lm[o + 1] += L.c[1] * f; lm[o + 2] += L.c[2] * f;
      }
    }
    if (vignette) for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
      const vx = (i * q / w - 0.5) * 2, vy = (j * q / h - 0.5) * 2, vv = clamp(1 - vignette * (vx * vx + vy * vy) / 2, 0, 1), o = (j * lw + i) * 3;
      lm[o] *= vv; lm[o + 1] *= vv; lm[o + 2] *= vv;
    }
    // per pixel row: blend the two light-map rows once (vertical lerp), then step the light across each q-pixel cell incrementally
    const rowL = new Float32Array(lw * 3), d = S.d, cells = Math.ceil(w / q), iq = 1 / q;
    for (let y = 0; y < h; y++) {
      const j = (y / q) | 0, fy = y / q - j, o0 = j * lw * 3, o1 = o0 + lw * 3, g = 1 - fy, row = y * w;
      for (let k = 0; k < lw * 3; k++) rowL[k] = lm[o0 + k] * g + lm[o1 + k] * fy;
      for (let i = 0; i < cells; i++) {
        const o = i * 3, dr = (rowL[o + 3] - rowL[o]) * iq, dg = (rowL[o + 4] - rowL[o + 1]) * iq, db = (rowL[o + 5] - rowL[o + 2]) * iq;
        let mr = rowL[o], mg = rowL[o + 1], mb = rowL[o + 2];
        const xa = i * q, xb = Math.min(w, xa + q);
        for (let x = xa; x < xb; x++) {
          const c = d[row + x];
          let r = (c & 255) * mr, gg = ((c >>> 8) & 255) * mg, bb = ((c >>> 16) & 255) * mb;
          d[row + x] = ((c & 0xff000000) | ((bb > 255 ? 255 : bb) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r)) >>> 0;
          mr += dr; mg += dg; mb += db;
        }
      }
    }
  }
  function fade(S, colour, alpha) {
    if (alpha <= 0) return;
    const k = clamp(alpha, 0, 1), r = cR(colour), g = cG(colour), b = cB(colour), d = S.d;
    for (let i = 0; i < d.length; i++) {
      const c = d[i];
      const nr = (c & 255) + (r - (c & 255)) * k, ng = ((c >>> 8) & 255) + (g - ((c >>> 8) & 255)) * k, nb = ((c >>> 16) & 255) + (b - ((c >>> 16) & 255)) * k;
      d[i] = ((c & 0xff000000) | (nb << 16) | (ng << 8) | nr) >>> 0;
    }
  }
  Object.assign(C, { lighting, fade });

  /* ================= 3D (CO3 - CO6) ================= */
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  };
  const M4 = {
    id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    T: (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1],
    S: (x, y, z) => [x, 0, 0, 0, 0, y === undefined ? x : y, 0, 0, 0, 0, z === undefined ? x : z, 0, 0, 0, 0, 1],
    RX: a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; },
    RY: a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; },
    RZ: a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    mul(a, b) {
      const r = new Array(16);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j];
        r[i * 4 + j] = s;
      }
      return r;
    },
    chain(...ms) { let r = ms[0]; for (let i = 1; i < ms.length; i++) r = M4.mul(r, ms[i]); return r; },
    point: (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]],
    dir: (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[4] * p[0] + m[5] * p[1] + m[6] * p[2], m[8] * p[0] + m[9] * p[1] + m[10] * p[2]]
  };
  function meshNormals(mesh) { // area-weighted vertex normals
    const N = mesh.V.map(() => [0, 0, 0]);
    for (const f of mesh.F) {
      const a = mesh.V[f[0]], b = mesh.V[f[1]], c = mesh.V[f[2]];
      const n = v3.cross(v3.sub(b, a), v3.sub(c, a));
      for (const i of f) { N[i][0] += n[0]; N[i][1] += n[1]; N[i][2] += n[2]; }
    }
    return N.map(v3.norm);
  }
  function transformMesh(mesh, m) { return { V: mesh.V.map(v => M4.point(m, v)), F: mesh.F, C: mesh.C }; }
  function mergeMeshes(list) {
    const out = { V: [], F: [], C: [] };
    for (const m of list) {
      const o = out.V.length;
      for (const v of m.V) out.V.push(v);
      for (const c of m.C) out.C.push(c);
      for (const f of m.F) out.F.push([f[0] + o, f[1] + o, f[2] + o]);
    }
    return out;
  }
  function makeZBuffer(w, h) { const z = { w, h, d: new Float32Array(w * h) }; z.clear = () => z.d.fill(Infinity); z.clear(); return z; }

  function fillTriangle(p0, p1, p2, c0, c1, c2, zb) {
    const T = C.getTarget(), clip = C.getClip();
    const area = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
    if (Math.abs(area) < 1e-9) return;
    const xa = Math.max(clip[0], Math.floor(Math.min(p0[0], p1[0], p2[0]))), xb = Math.min(clip[2] - 1, Math.ceil(Math.max(p0[0], p1[0], p2[0])));
    const ya = Math.max(clip[1], Math.floor(Math.min(p0[1], p1[1], p2[1]))), yb = Math.min(clip[3] - 1, Math.ceil(Math.max(p0[1], p1[1], p2[1])));
    const same = c0 === c1 && c1 === c2, inv = 1 / area, EPS = -1e-7;
    const r0 = cR(c0), g0 = cG(c0), b0 = cB(c0), a0 = cA(c0), r1 = cR(c1), g1 = cG(c1), b1 = cB(c1), a1 = cA(c1), r2 = cR(c2), g2 = cG(c2), b2 = cB(c2), a2 = cA(c2);
    for (let y = ya; y <= yb; y++) {
      const py = y + 0.5;
      for (let x = xa; x <= xb; x++) {
        const px = x + 0.5;
        const w0 = ((p2[0] - p1[0]) * (py - p1[1]) - (p2[1] - p1[1]) * (px - p1[0])) * inv;
        const w1 = ((p0[0] - p2[0]) * (py - p2[1]) - (p0[1] - p2[1]) * (px - p2[0])) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 < EPS || w1 < EPS || w2 < EPS) continue;
        if (zb) {
          const z = w0 * p0[2] + w1 * p1[2] + w2 * p2[2], zi = y * zb.w + x;
          if (z >= zb.d[zi]) continue;
          zb.d[zi] = z;
        }
        const c = same ? c0 : rgba((w0 * r0 + w1 * r1 + w2 * r2) | 0, (w0 * g0 + w1 * g1 + w2 * g2) | 0, (w0 * b0 + w1 * b1 + w2 * b2) | 0, (w0 * a0 + w1 * a1 + w2 * a2) | 0);
        const i = y * T.w + x;
        T.d[i] = (c >>> 24) === 255 ? c : over(c, T.d[i]);
      }
    }
  }
  // cam = {eye, f, near, ortho, vp:{cx,cy,scale}}, camera looks down -Z. light = {dir (towards light), amb, dif}
  function renderMesh(mesh, model, cam, light, o) {
    o = o || {};
    const W = mesh.V.map(v => M4.point(model, v));
    const gouraud = o.shading !== 'flat';
    const Nw = gouraud ? meshNormals({ V: W, F: mesh.F }) : null;
    const eye = cam.eye || [0, 0, 0], near = cam.near || 0.1, vp = cam.vp;
    const P = W.map(v => {
      const x = v[0] - eye[0], y = v[1] - eye[1], z = v[2] - eye[2], depth = -z;
      if (cam.ortho) return [vp.cx + x * vp.scale, vp.cy - y * vp.scale, depth, depth];
      const k = cam.f / Math.max(depth, 1e-6);
      return [vp.cx + x * k * vp.scale, vp.cy - y * k * vp.scale, depth, depth];
    });
    const L = v3.norm(light.dir), amb = light.amb === undefined ? 0.3 : light.amb, dif = light.dif === undefined ? 0.8 : light.dif;
    const tris = [];
    for (const f of mesh.F) {
      const [i0, i1, i2] = f;
      if (!cam.ortho && (P[i0][3] <= near || P[i1][3] <= near || P[i2][3] <= near)) continue;
      let n = v3.norm(v3.cross(v3.sub(W[i1], W[i0]), v3.sub(W[i2], W[i0])));
      const toEye = cam.ortho ? [0, 0, 1] : v3.sub(eye, W[i0]);
      const facing = v3.dot(n, toEye);
      let flip = 1;
      if (facing <= 0) { if (o.twoSided) flip = -1; else if (o.cull !== false) continue; }
      let cols;
      if (gouraud) {
        cols = f.map(i => shade(mesh.C[i], Math.min(1.4, amb + dif * Math.max(0, v3.dot(Nw[i], L) * flip))));
      } else {
        const I = Math.min(1.4, amb + dif * Math.max(0, v3.dot(n, L) * flip));
        const base = mixc(mixc(mesh.C[i0], mesh.C[i1], 0.5), mesh.C[i2], 1 / 3);
        const c = shade(base, I); cols = [c, c, c];
      }
      tris.push({ p: [P[i0], P[i1], P[i2]], c: cols, d: (P[i0][2] + P[i1][2] + P[i2][2]) / 3 });
    }
    if (o.painter) tris.sort((a, b) => b.d - a.d);
    for (const t of tris) fillTriangle(t.p[0], t.p[1], t.p[2], t.c[0], t.c[1], t.c[2], o.painter ? null : o.zbuf);
  }
  Object.assign(C, { v3, M4, meshNormals, transformMesh, mergeMeshes, makeZBuffer, fillTriangle, renderMesh });
})();
