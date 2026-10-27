// Unit tests for the graphics library. Run: node tests/test_cg.js
const CG = require('../src/cg.js');
require('../src/cg3d.js');
let n = 0, fails = 0;
function ok(cond, name) { n++; if (!cond) { fails++; console.log('FAIL: ' + name); } }
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-6 : e);
const WHITE = 0xFFFFFFFF;
function fresh(w, h) { const s = new CG.Surface(w || 64, h || 64); CG.setTarget(s); return s; }
function count(s, c) { let k = 0; for (let i = 0; i < s.d.length; i++) if (s.d[i] === c) k++; return k; }

// colour
ok(CG.rgba(1, 2, 3, 4) === 0x04030201, 'rgba packing');
ok(CG.cR(CG.hex('#ff8000')) === 255 && CG.cG(CG.hex('#ff8000')) === 128, 'hex parse');
ok(CG.mixc(CG.rgba(0, 0, 0), CG.rgba(200, 100, 50), 0.5) === CG.rgba(100, 50, 25), 'mixc');
{ const r = CG.rng(5), r2 = CG.rng(5); ok(r() === r2(), 'rng deterministic'); }

// lines
{ let s = fresh(); CG.line(2, 2, 20, 2, WHITE); ok(count(s, WHITE) === 19, 'horizontal line pixels');
  s = fresh(); CG.line(0, 0, 10, 10, WHITE); ok(count(s, WHITE) === 11 && s.d[5 * 64 + 5] === WHITE, 'diagonal Bresenham');
  s = fresh(); CG.lineDDA(0, 0, 10, 5, WHITE); ok(s.d[0] === WHITE && s.d[5 * 64 + 10] === WHITE, 'DDA endpoints');
  s = fresh(); CG.line(-50, 10, 200, 10, WHITE); ok(count(s, WHITE) === 64, 'line clipped to surface');
  s = fresh(); CG.line(-50, -50, -10, -10, WHITE); ok(count(s, WHITE) === 0, 'line fully outside rejected'); }
// Cohen-Sutherland
{ const r = CG.clipLineCS(-10, 5, 20, 5, 0, 0, 10, 10); ok(r && near(r[0], 0) && near(r[2], 10), 'CS clip horizontal');
  ok(CG.clipLineCS(-5, -5, -1, 20, 0, 0, 10, 10) === null, 'CS trivial reject'); }
// circles / ellipses
{ let s = fresh(100, 100); CG.disc(50, 50, 20, WHITE); const a = count(s, WHITE); ok(near(a, Math.PI * 400, 30), 'disc area ' + a);
  s = fresh(100, 100); CG.ellipseFill(50, 50, 30, 15, WHITE); const b = count(s, WHITE); ok(near(b, Math.PI * 30 * 15, 40), 'ellipse fill area ' + b);
  s = fresh(100, 100); CG.circle(50, 50, 20, WHITE); ok(s.d[50 * 100 + 70] === WHITE && s.d[30 * 100 + 50] === WHITE && s.d[50 * 100 + 50] === 0, 'circle outline');
  s = fresh(100, 100); CG.ellipse(50, 50, 30, 15, WHITE); ok(s.d[50 * 100 + 80] === WHITE && s.d[35 * 100 + 50] === WHITE, 'ellipse outline'); }
// polygon fill
{ let s = fresh(); CG.fillPolygon([[10, 10], [30, 10], [30, 30], [10, 30]], WHITE); ok(count(s, WHITE) === 400, 'square polygon area');
  s = fresh(); CG.fillPolygon([[10, 10], [30, 10], [10, 30]], WHITE); const t = count(s, WHITE); ok(near(t, 200, 12), 'triangle area ' + t);
  s = fresh(); CG.fillPolygon([[10, 10], [30, 10], [30, 30], [10, 30]], (x, y) => ((x + y) & 1) ? WHITE : 0xFF0000FF); ok(count(s, 0xFF0000FF) === 200, 'pattern fill'); }
// flood / boundary fill
{ const BK = 0xFF000000; let s = fresh().clear(BK); CG.rect(10, 10, 20, 20, WHITE); CG.rect(11, 11, 18, 18, BK); CG.floodFill(20, 20, 0xFF00FF00, s); ok(count(s, 0xFF00FF00) === 18 * 18, 'flood fill inside box');
  s = fresh().clear(BK); CG.rect(10, 10, 20, 20, WHITE); CG.rect(11, 11, 18, 18, BK); CG.boundaryFill(20, 20, 0xFF00FF00, WHITE, s); ok(count(s, 0xFF00FF00) === 18 * 18, 'boundary fill'); }
// Sutherland-Hodgman
{ const r = CG.clipPolySH([[-10, -10], [20, -10], [20, 20], [-10, 20]], 0, 0, 10, 10);
  const xs = r.map(p => p[0]), ys = r.map(p => p[1]);
  ok(Math.min(...xs) === 0 && Math.max(...xs) === 10 && Math.min(...ys) === 0 && Math.max(...ys) === 10, 'SH clip box'); }
// matrices
{ const M = CG.M3; let p = M.apply(M.T(5, 7), 1, 1); ok(p[0] === 6 && p[1] === 8, 'translate');
  p = M.apply(M.R(Math.PI / 2), 1, 0); ok(near(p[0], 0) && near(p[1], 1), 'rotate 90');
  p = M.apply(M.about(10, 10, M.R(Math.PI)), 12, 10); ok(near(p[0], 8) && near(p[1], 10), 'rotate about pivot');
  p = M.apply(M.ReflectY(), 3, 4); ok(p[0] === -3 && p[1] === 4, 'reflect');
  p = M.apply(M.mul(M.T(1, 0), M.S(2)), 1, 1); ok(p[0] === 3 && p[1] === 2, 'compose order');
  const m = M.chain(M.T(3, 4), M.R(0.7), M.S(2, 3)), q = M.apply(M.inv(m), ...M.apply(m, 5, -2)); ok(near(q[0], 5) && near(q[1], -2), 'inverse'); }
// window -> viewport
{ const p = CG.windowToViewport(50, 25, { x: 0, y: 0, w: 100, h: 50 }, { x: 10, y: 10, w: 200, h: 100 }); ok(p[0] === 110 && p[1] === 60, 'window to viewport'); }
// curves
{ const a = CG.bezier([0, 0], [0, 10], [10, 10], [10, 0], 0.5); ok(near(a[0], 5) && near(a[1], 7.5), 'bezier midpoint');
  const b = CG.bezierN([[0, 0], [0, 10], [10, 10], [10, 0]], 0.5); ok(near(b[0], 5) && near(b[1], 7.5), 'de Casteljau = Bernstein');
  const s = CG.bsplinePoint([0, 0], [1, 0], [2, 0], [3, 0], 0); ok(near(s[0], 1), 'bspline basis');
  const net = []; for (let i = 0; i < 4; i++) { net.push([]); for (let j = 0; j < 4; j++) net[i].push([i, j, 0]); }
  const sp = CG.bezierSurfacePoint(net, 0.5, 0.5); ok(near(sp[0], 1.5) && near(sp[1], 1.5), 'bezier surface point');
  const m = CG.bezierPatchMesh(net, 4, 4); ok(m.V.length === 25 && m.F.length === 32, 'patch mesh size'); }
// bitmaps
{ const src = new CG.Surface(4, 4).clear(0xFF0000FF); let s = fresh(); CG.blit(src, 10, 10); ok(count(s, 0xFF0000FF) === 16, 'blit');
  s = fresh(); CG.blit(src, 62, 62); ok(count(s, 0xFF0000FF) === 4, 'blit clipped');
  const half = new CG.Surface(4, 1); half.d[0] = 0xFF0000FF; s = fresh(); CG.blit(half, 10, 10, { flip: true }); ok(s.d[10 * 64 + 13] === 0xFF0000FF, 'blit flip');
  s = fresh(); CG.drawBitmap(src, CG.M3.chain(CG.M3.T(20, 20), CG.M3.R(Math.PI / 4), CG.M3.S(2)), {}); const k = s.d.filter(v => v !== 0).length; ok(k > 50 && k < 110, 'rotated bitmap area ' + k);
  const rs = CG.resample(new CG.Surface(8, 8).clear(0xFF00FF00), 4, 4); ok(rs.w === 4 && rs.d[5] === 0xFF00FF00, 'resample down');
  const up = CG.resample(new CG.Surface(2, 2).clear(0xFF00FF00), 6, 6); ok(up.d[14] === 0xFF00FF00, 'resample up');
  const ab = new CG.Surface(10, 10); ab.d[3 * 10 + 4] = WHITE; ab.d[6 * 10 + 7] = WHITE; const bb = CG.alphaBounds(ab); ok(bb.x === 4 && bb.y === 3 && bb.w === 4 && bb.h === 4, 'alphaBounds');
  ok(CG.crop(ab, 4, 3, 4, 4).d[0] === WHITE, 'crop');
  const o = CG.outline(CG.crop(ab, 4, 3, 1, 1), 0xFF000000, 2); ok(o.w === 5 && o.d[2 * 5 + 2] === WHITE && o.d[2 * 5 + 3] === 0xFF000000, 'outline'); }
// chroma key
{ const s = new CG.Surface(20, 20).clear(0xFFFF00FF); for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) s.d[y * 20 + x] = 0xFF2040C0;
  s.d[0] = 0xFFFF00FF; CG.chromaKey(s); ok(s.d[0] === 0 && s.d[10 * 20 + 10] === 0xFF2040C0, 'chroma key removes bg keeps subject'); }
// lighting / fade
{ const s = fresh(64, 64).clear(0xFFFFFFFF); CG.lighting(s, [0.5, 0.5, 0.5], [], 0); ok(CG.cR(s.d[100]) >= 126 && CG.cR(s.d[100]) <= 128, 'ambient light');
  const s2 = fresh(64, 64).clear(0xFF808080); CG.lighting(s2, [0, 0, 0], [{ x: 32, y: 32, r: 40, c: [1, 1, 1], i: 1 }], 0); ok(CG.cR(s2.d[32 * 64 + 32]) > CG.cR(s2.d[0]), 'point light brighter at centre');
  const s3 = fresh(8, 8).clear(0xFF000000); CG.fade(s3, 0xFFFFFFFF, 0.5); ok(near(CG.cR(s3.d[0]), 127, 1), 'fade'); }
// 3D
{ const M4 = CG.M4, p = M4.point(M4.chain(M4.T(1, 2, 3), M4.RY(Math.PI / 2)), [1, 0, 0]); ok(near(p[0], 1) && near(p[1], 2) && near(p[2], 2), 'M4 transform');
  const cube = (() => { const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const F = [[0, 3, 2], [0, 2, 1], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
    return { V, F, C: V.map(() => 0xFF2060E0) }; })();
  const N = CG.meshNormals(cube); ok(N.every(v => near(CG.v3.len(v), 1)), 'normals unit');
  const s = fresh(100, 100).clear(0xFF000000); const zb = CG.makeZBuffer(100, 100);
  CG.renderMesh(cube, M4.T(0, 0, -5), { eye: [0, 0, 0], f: 2, near: 0.1, vp: { cx: 50, cy: 50, scale: 20 } }, { dir: [0, 0, 1], amb: 0.3, dif: 0.8 }, { shading: 'flat', cull: true, zbuf: zb });
  const lit = count(s, 0xFF000000); ok(lit < 10000 && s.d[50 * 100 + 50] !== 0xFF000000, 'cube rendered with z-buffer');
  const s2 = fresh(100, 100).clear(0xFF000000);
  CG.renderMesh(cube, M4.T(0, 0, -5), { eye: [0, 0, 0], f: 2, near: 0.1, vp: { cx: 50, cy: 50, scale: 20 } }, { dir: [0, 0, 1] }, { painter: true });
  ok(count(s2, 0xFF000000) === lit, 'painter == z-buffer silhouette');
  const s3 = fresh(100, 100).clear(0xFF000000); CG.renderMesh(cube, M4.T(0, 0, 5), { eye: [0, 0, 0], f: 2, near: 0.1, vp: { cx: 50, cy: 50, scale: 20 } }, { dir: [0, 0, 1] }, {}); ok(count(s3, 0xFF000000) === 10000, 'object behind camera not drawn'); }

console.log(fails ? fails + ' of ' + n + ' FAILED' : 'all tests passed (' + n + ')');
process.exit(fails ? 1 : 0);
