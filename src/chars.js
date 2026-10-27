/* chars.js - procedural placeholder characters, portraits, runtime effects, 3D lotus,
 * and the loader that lets user-supplied PNG sprites replace the placeholders.
 * Extends ART (art.js must be loaded first).
 */
(function () {
  'use strict';
  const C = (typeof CG !== 'undefined') ? CG : require('./cg.js');
  const A = (typeof ART !== 'undefined') ? ART : require('./art.js');
  const { rgba, hex, shade, mixc, withAlpha, clamp, M3, M4 } = C;
  const mk = A.mk;
  const OUT = hex('#2a160c');

  /* ---------- character palettes ---------- */
  const PAL = {
    devanshi: { skin: hex('#e9b58b'), hair: hex('#1c1212'), style: 'tail', top: hex('#c8201e'), trim: hex('#f0b429'), bottom: hex('#ff9a1f'), shoes: hex('#6a3a1a'), band: hex('#c8201e'), bracer: hex('#f0b429'), hem: 94 },
    aahana: { skin: hex('#ebb991'), hair: hex('#2a1818'), style: 'loose', top: hex('#f6f4ee'), trim: hex('#7fb4e8'), bottom: hex('#8fc0ee'), shoes: hex('#e8e0d0'), flower: true, hem: 100 },
    villagerA: { skin: hex('#d9a47a'), hair: hex('#2a1a12'), style: 'short', top: hex('#3f8f6a'), trim: hex('#f5e6c8'), bottom: hex('#f5e6c8'), shoes: hex('#5a3a22'), hem: 98, turban: hex('#e5532d') },
    villagerB: { skin: hex('#e0ae86'), hair: hex('#1a1210'), style: 'loose', top: hex('#d94f8a'), trim: hex('#ffd23f'), bottom: hex('#4a6fd0'), shoes: hex('#5a3a22'), hem: 100, flower: true },
    villagerC: { skin: hex('#c99468'), hair: hex('#3a2a22'), style: 'short', top: hex('#e8a43a'), trim: hex('#7a3a1a'), bottom: hex('#fff4e0'), shoes: hex('#5a3a22'), hem: 98 },
    pujari: { skin: hex('#d9a47a'), hair: hex('#e8e4dc'), style: 'bald', top: hex('#fff4e0'), trim: hex('#ff9a1f'), bottom: hex('#fff4e0'), shoes: hex('#8a6a4a'), hem: 100, beard: hex('#eee8de'), shawl: hex('#ff8a1f'), tilak: true }
  };
  A.PAL = PAL;

  /* ---------- expressions ---------- */
  function face(cx, cy, sc, view, expr) {
    const S = v => v * sc, eyeC = hex('#2a1810'), W = hex('#ffffff');
    const side = view === 'side';
    const eyes = side ? [[cx - S(10), cy + S(4)]] : [[cx - S(8.5), cy + S(4)], [cx + S(8.5), cy + S(4)]];
    for (const e of eyes) {
      let ry = S(5.4);
      if (expr === 'smile' || expr === 'calm') ry = S(4.6);
      if (expr === 'scared') ry = S(6.4);
      C.ellipseFill(e[0], e[1], S(4.4), ry, W);
      const ix = side ? e[0] - S(1.2) : e[0];
      C.ellipseFill(ix, e[1] + S(0.6), S(3), ry * 0.8, expr === 'fierce' ? hex('#4a1810') : eyeC);
      C.disc(ix - S(1), e[1] - S(1.2), Math.max(1, S(1.1)), W);
    }
    // eyebrows by expression
    const brow = (x0, y0, x1, y1) => C.lineThick(x0, y0, x1, y1, Math.max(1.5, S(2)), hex('#2a1810'));
    for (let i = 0; i < eyes.length; i++) {
      const e = eyes[i], dir = side ? -1 : (i === 0 ? -1 : 1); // -1 = left eye
      const bx0 = e[0] - S(5) * 1, bx1 = e[0] + S(5), by = e[1] - S(9);
      const inner = dir < 0 ? [bx1, by] : [bx0, by], outer = dir < 0 ? [bx0, by] : [bx1, by];
      let ia = 0, oa = 0; // inner/outer vertical offsets
      if (expr === 'determined') { ia = S(2.5); oa = -S(0.5); }
      else if (expr === 'fierce') { ia = S(4.5); oa = -S(1.5); }
      else if (expr === 'worried' || expr === 'scared') { ia = -S(3.2); oa = S(1.2); }
      else if (expr === 'calm') { ia = -S(0.4); oa = S(0.6); }
      else if (expr === 'smile') { ia = -S(0.5); oa = -S(0.5); }
      brow(inner[0], inner[1] + ia, outer[0], outer[1] + oa);
    }
    // blush
    for (const e of eyes) C.ellipseFill(e[0] + (side ? -S(1) : 0), e[1] + S(8), S(3.6), S(2), rgba(255, 110, 110, 90));
    // mouth
    const mx = side ? cx - S(9) : cx, my = cy + S(11.5), mc = hex('#6a2a22');
    if (expr === 'smile') { C.polyline(C.bezierPoints([[mx - S(5), my - S(1)], [mx - S(3), my + S(3.5)], [mx + S(3), my + S(3.5)], [mx + S(5), my - S(1)]], 10), mc); }
    else if (expr === 'scared') { C.ellipseFill(mx, my + S(1), S(2.6), S(3.4), hex('#5a1a18')); }
    else if (expr === 'fierce') { C.polyline([[mx - S(4), my + S(1.5)], [mx, my - S(0.5)], [mx + S(4), my + S(1.5)]], mc); }
    else if (expr === 'worried') { C.polyline(C.bezierPoints([[mx - S(4), my + S(2)], [mx - S(2), my - S(1)], [mx + S(2), my - S(1)], [mx + S(4), my + S(2)]], 8), mc); }
    else if (expr === 'determined') { C.lineThick(mx - S(3.5), my + S(0.5), mx + S(3.5), my + S(0.5), Math.max(1, S(1.4)), mc); }
    else { C.polyline(C.bezierPoints([[mx - S(3.5), my], [mx - S(1.5), my + S(2)], [mx + S(1.5), my + S(2)], [mx + S(3.5), my]], 8), mc); }
  }

  /* ---------- head ---------- */
  function head(cx, cy, sc, view, o, expr) {
    const S = v => v * sc, hair = o.hair, hl = shade(o.hair, 1.9), skin = o.skin;
    if (view === 'back') {
      if (o.style === 'loose') C.fillPolygon([[cx - S(21), cy], [cx + S(21), cy], [cx + S(25), cy + S(44)], [cx + S(10), cy + S(50)], [cx - S(10), cy + S(50)], [cx - S(25), cy + S(44)]], shade(hair, 0.9));
      if (o.turban) { C.ellipseFill(cx, cy + S(2), S(22), S(19), o.turban); C.ellipseFill(cx, cy - S(8), S(18), S(8), shade(o.turban, 1.2)); return; }
      C.ellipseFill(cx, cy + S(3), S(21), S(20), o.style === 'bald' ? skin : hair);
      C.arcRing(cx, cy + S(3), S(14), S(17), Math.PI * 1.15, Math.PI * 1.7, hl);
      if (o.style === 'tail') tail(cx, cy, sc, 'back', o);
      if (o.flower) { C.disc(cx + S(13), cy - S(6), S(4), hex('#ffffff')); C.disc(cx + S(13), cy - S(6), S(1.6), hex('#ffd23f')); }
      return;
    }
    const side = view === 'side', fx = side ? cx - S(2) : cx, rx = side ? S(19) : S(21);
    if (o.style === 'loose') { // long hair behind
      const x0 = side ? cx : cx - S(24), x1 = side ? cx + S(24) : cx + S(24);
      C.fillPolygon([[x0, cy - S(4)], [x1, cy - S(4)], [x1 + S(2), cy + S(44)], [x0 - S(2), cy + S(44)]], shade(hair, 0.9));
    }
    if (o.style === 'tail' && side) tail(cx, cy, sc, 'side', o);
    // ears
    if (!side) { C.disc(cx - S(21), cy + S(5), S(3.6), skin); C.disc(cx + S(21), cy + S(5), S(3.6), skin); }
    C.ellipseFill(fx, cy + S(3), rx, S(19.5), skin);
    if (side) C.disc(cx + S(7), cy + S(5), S(3.4), shade(skin, 0.92));
    // hair cap and bangs
    if (o.style !== 'bald' && !o.turban) {
      const cap = [[fx - rx - S(1), cy + S(2)]];
      for (let i = 0; i <= 14; i++) { const a = Math.PI + i * Math.PI / 14; cap.push([fx + Math.cos(a) * (rx + S(2)), cy + S(2) + Math.sin(a) * S(22)]); }
      cap.push([fx + rx + S(1), cy + S(2)]);
      // bangs
      if (!side) {
        cap.push([fx + rx - S(2), cy + S(6)], [fx + S(12), cy - S(5)], [fx + S(6), cy - S(1)], [fx, cy - S(7)], [fx - S(6), cy - S(1)], [fx - S(12), cy - S(5)], [fx - rx + S(2), cy + S(6)]);
      } else {
        cap.push([fx + rx, cy + S(10)], [fx + S(2), cy - S(2)], [fx - S(6), cy - S(7)], [fx - rx + S(2), cy - S(1)]);
      }
      C.fillPolygon(cap, hair);
      C.arcRing(fx, cy + S(2), S(14), S(17), Math.PI * 1.15, Math.PI * 1.65, hl);
    }
    if (o.turban) { C.ellipseFill(fx, cy - S(8), S(23), S(12), o.turban); C.ellipseFill(fx, cy - S(12), S(18), S(7), shade(o.turban, 1.25)); C.rect(fx - rx, cy - S(2), rx * 2, S(3), shade(o.turban, 0.7)); }
    if (o.band) C.lineThick(fx - rx, cy - S(5), fx + rx, cy - S(5), Math.max(2, S(3.2)), o.band);
    if (o.flower) { C.disc(side ? cx + S(8) : cx + S(13), cy - S(9), S(4.2), hex('#ffffff')); C.disc(side ? cx + S(8) : cx + S(13), cy - S(9), S(1.6), hex('#ffd23f')); }
    if (o.tilak) { C.lineThick(fx, cy - S(2), fx, cy + S(2), Math.max(1.5, S(2)), hex('#d32020')); }
    face(fx, cy, sc, view, expr || 'neutral');
    if (o.beard) C.fillPolygon([[fx - S(14), cy + S(12)], [fx + S(14), cy + S(12)], [fx + S(8), cy + S(30)], [fx, cy + S(34)], [fx - S(8), cy + S(30)]], o.beard);
  }
  function tail(cx, cy, sc, view, o) {
    const S = v => v * sc;
    if (view === 'back') { // ponytail hanging over the back
      const L = C.bezierPoints([[cx - S(5), cy - S(14)], [cx - S(12), cy + S(10)], [cx - S(2), cy + S(34)], [cx, cy + S(58)]], 14), R = C.bezierPoints([[cx + S(5), cy - S(14)], [cx + S(12), cy + S(10)], [cx + S(2), cy + S(34)], [cx, cy + S(58)]], 14).reverse();
      C.fillPolygon(L.concat(R), shade(o.hair, 1.0));
      C.lineThick(cx - S(8), cy - S(12), cx + S(8), cy - S(12), S(3), o.bracer || hex('#f0b429'));
    } else {
      const U = C.bezierPoints([[cx + S(12), cy - S(8)], [cx + S(34), cy - S(14)], [cx + S(36), cy + S(18)], [cx + S(22), cy + S(50)]], 14), D = C.bezierPoints([[cx + S(14), cy - S(1)], [cx + S(24), cy], [cx + S(26), cy + S(24)], [cx + S(22), cy + S(50)]], 14).reverse();
      C.fillPolygon(U.concat(D), o.hair);
      C.disc(cx + S(14), cy - S(5), S(3.2), o.bracer || hex('#f0b429'));
    }
  }

  /* ---------- body ---------- */
  function body(view, o) {
    const sk = o.skin, side = view === 'side', hem = o.hem || 96;
    const legC = o.bottom;
    if (side) { C.rect(41, hem - 4, 8, 114 - hem + 4, shade(legC, 0.85)); C.rect(37, hem - 4, 8, 114 - hem + 4, legC); C.ellipseFill(36, 116, 7, 4, o.shoes); C.ellipseFill(40, 116, 7, 4, shade(o.shoes, 0.8)); }
    else { C.rect(34, hem - 4, 9, 114 - hem + 4, legC); C.rect(45, hem - 4, 9, 114 - hem + 4, legC); C.line(44, hem, 44, 114, shade(legC, 0.7)); C.ellipseFill(38, 116, 7, 4, o.shoes); C.ellipseFill(50, 116, 7, 4, o.shoes); }
    C.rect(40, 56, 8, 10, shade(sk, 0.92)); // neck
    const t = o.top, tr = o.trim;
    if (side) {
      C.fillPolygon([[34, 62], [54, 62], [56, hem], [32, hem]], t);
      C.rect(32, hem - 4, 24, 4, tr);
      C.fillPolygon([[38, 64], [46, 64], [46, 88], [38, 88]], shade(t, 0.88)); C.disc(42, 92, 4, sk);
      if (o.bracer) C.rect(38, 84, 8, 4, o.bracer);
    } else {
      C.fillPolygon([[29, 62], [59, 62], [62, hem], [26, hem]], t);
      if (view === 'front') { C.polyline([[38, 62], [44, 74], [50, 62]], tr); C.polyline([[39, 62], [44, 72], [49, 62]], tr); }
      C.rect(26, hem - 4, 36, 4, tr);
      if (o.sash) C.rect(28, hem - 14, 32, 4, o.sash);
      C.fillPolygon([[23, 64], [30, 63], [29, 86], [21, 87]], shade(t, 0.9)); C.disc(24, 90, 4, sk);
      C.fillPolygon([[65, 64], [58, 63], [59, 86], [67, 87]], shade(t, 0.9)); C.disc(64, 90, 4, sk);
      if (o.bracer) { C.rect(21, 82, 9, 4, o.bracer); C.rect(58, 82, 9, 4, o.bracer); }
    }
    if (o.shawl) { C.fillPolygon([[26, 62], [62, 62], [58, 86], [44, 76], [30, 86]], o.shawl); }
  }
  function drawChibi(o, view, expr) {
    body(view, o);
    head(44, 36, 1, view, o, expr);
  }

  /* ---------- enemies ---------- */
  function drawCultist(view) {
    const robe = hex('#3a1f55'), dark = hex('#24123a'), trim = hex('#c9a43a');
    C.fillPolygon([[28, 60], [60, 60], [72, 117], [16, 117]], robe);
    C.fillPolygon([[44, 60], [60, 60], [72, 117], [48, 117]], dark);
    C.rect(16, 111, 56, 5, trim); C.polyline([[44, 66], [44, 112]], trim);
    C.fillPolygon([[22, 64], [30, 62], [28, 90], [18, 92]], shade(robe, 1.1)); C.fillPolygon([[66, 64], [58, 62], [60, 90], [70, 92]], shade(robe, 1.1));
    C.disc(20, 94, 4, hex('#8a6a8a')); C.disc(68, 94, 4, hex('#8a6a8a'));
    C.ellipseFill(44, 38, 26, 27, robe); C.ellipseFill(44, 46, 21, 21, hex('#14091f'));
    if (view === 'back') { C.ellipseFill(44, 40, 24, 25, shade(robe, 0.9)); C.line(44, 18, 44, 62, trim); C.circle(44, 40, 7, trim); return; }
    const mx = view === 'side' ? 38 : 44;
    C.ellipseFill(mx, 46, 14, 17, hex('#f4ecdc')); // mask
    C.lineThick(mx, 32, mx, 60, 3, hex('#c8201e')); C.lineThick(mx - 9, 44, mx + 9, 44, 2, hex('#c8201e'));
    for (const ex of (view === 'side' ? [mx - 4] : [mx - 6, mx + 6])) { C.ellipseFill(ex, 40, 3.2, 3.8, hex('#ffd23f')); C.radial(ex, 40, 8, rgba(255, 200, 40, 120), 2); }
  }
  function drawImp() {
    C.fillPolygon([[16, 12], [22, 2], [27, 14]], hex('#1a0a24')); C.fillPolygon([[44, 12], [38, 2], [33, 14]], hex('#1a0a24'));
    C.ellipseFill(30, 32, 22, 20, rgba(40, 14, 60, 230)); C.ellipseFill(30, 28, 18, 14, rgba(70, 26, 100, 220));
    for (const x of [14, 24, 36, 46]) C.fillPolygon([[x, 44], [x + 5, 54], [x + 8, 42]], rgba(40, 14, 60, 220));
    for (const ex of [22, 38]) { C.ellipseFill(ex, 28, 4, 5, hex('#ff3b3b')); C.disc(ex, 28, 2, hex('#ffe0a0')); }
    C.polyline([[22, 38], [26, 41], [34, 41], [38, 38]], hex('#ff6a6a'));
  }

  /* ---------- props that belong to characters ---------- */
  A.sword = function () { // anchor = hand grip (ax, ay), blade points up (-y)
    return mk(22, 84, 11, 70, () => {
      C.fillPolygon([[11, 0], [16, 8], [15, 56], [7, 56], [6, 8]], hex('#dfe6ee'));
      C.fillPolygon([[11, 0], [16, 8], [15, 56], [11, 56]], hex('#aab6c4'));
      C.line(11, 4, 11, 54, hex('#ffffff'));
      C.rect(2, 56, 18, 5, hex('#f0b429')); C.rect(2, 56, 18, 1, hex('#fff0a0'));
      C.rect(8, 61, 6, 14, hex('#8a1a1a')); C.disc(11, 77, 4, hex('#f0b429'));
    });
  };
  A.veena = function () {
    return mk(100, 70, 50, 35, () => {
      const wood = hex('#8a4a1a'), gold = hex('#f0b429');
      C.lineThick(20, 52, 84, 18, 7, wood); C.lineThick(20, 52, 84, 18, 2, shade(wood, 1.4));
      C.ellipseFill(18, 54, 15, 11, wood); C.ellipseFill(17, 52, 11, 7, shade(wood, 1.25)); C.circle(17, 52, 5, shade(wood, 0.6));
      C.disc(88, 15, 6, gold); C.line(20, 50, 86, 16, hex('#f6eed0')); C.line(22, 55, 86, 20, hex('#f6eed0'));
      for (let i = 0; i < 6; i++) C.rect(34 + i * 9, 44 - i * 5, 2, 8, gold);
    });
  };

  /* ---------- character sprite generation and registry ---------- */
  const cache = {};
  A.user = {};            // key -> Surface (from window.ASSETS)
  A.userTarget = { devanshi: 104, aahana: 100, cultist: 108, tamasur: 190, lakshmi: 130, durga: 260, saraswati: 260, owl: 50, lion: 90, portrait: 220 };
  function build(name, view, expr) {
    const o = PAL[name];
    let s;
    if (name === 'cultist') s = mk(88, 124, 44, 118, () => drawCultist(view));
    else if (name === 'imp') s = mk(60, 56, 30, 52, drawImp);
    else s = mk(88, 124, 44, 118, () => drawChibi(o || PAL.villagerA, view, expr));
    return C.outline(s, OUT, 2);
  }
  function mirror(s) {
    const out = mk(s.w, s.h, s.w - 1 - s.ax, s.ay, () => C.drawBitmap(s, M3.chain(M3.T(s.w, 0), M3.ReflectY())));
    return out;
  }
  A.char = function (name, view, variant) {
    view = view || 'front';
    const key = name + '_' + view + (variant ? '_' + variant : '');
    if (A.user[key]) return A.user[key];
    if (A.user[name + '_' + view]) return A.user[name + '_' + view];
    if (cache[key]) return cache[key];
    let s;
    if (view === 'right') { if (A.user[name + '_side']) s = mirror(A.user[name + '_side']); else s = mirror(A.char(name, 'side')); }
    else if (name === 'aahana' && view === 'veena') {
      s = mk(88, 124, 44, 118, () => { body('front', PAL.aahana); head(44, 36, 1, 'front', PAL.aahana, 'calm'); C.drawBitmap(A.veena(), M3.chain(M3.T(14, 66), M3.R(-0.15))); });
      s = C.outline(s, OUT, 2);
    } else s = build(name, view, variant);
    return cache[key] = s;
  };
  /* portrait: big head and shoulders for the dialogue box */
  A.portrait = function (name, expr) {
    expr = expr || 'neutral';
    const key = 'portrait_' + name + '_' + expr;
    if (A.user[name + '_portrait_' + expr]) return A.user[name + '_portrait_' + expr];
    if (cache[key]) return cache[key];
    const o = Object.assign({}, PAL[name] || PAL.villagerA);
    const s = mk(220, 220, 110, 220, () => {
      const sc = 4;
      C.fillPolygon([[10, 220], [28, 168], [80, 150], [140, 150], [192, 168], [210, 220]], o.top);
      C.polyline([[90, 150], [110, 186], [130, 150]], o.trim); C.polyline([[92, 150], [110, 182], [128, 150]], o.trim);
      C.rect(92, 138, 36, 20, shade(o.skin, 0.92));
      if (name === 'cultist') { C.ellipseFill(110, 90, 80, 84, hex('#3a1f55')); C.ellipseFill(110, 100, 60, 64, hex('#14091f')); C.ellipseFill(110, 100, 40, 50, hex('#f4ecdc')); C.lineThick(110, 60, 110, 148, 8, hex('#c8201e')); for (const x of [90, 130]) { C.ellipseFill(x, 90, 8, 10, hex('#ffd23f')); } return; }
      head(110, 86, 3.6, 'front', o, expr);
    });
    return cache[key] = C.outline(s, OUT, 3);
  };

  /* ---------- user sprite pipeline: decode -> chroma key -> crop -> resample ---------- */
  function targetHeight(key) {
    if (/portrait/.test(key)) return A.userTarget.portrait;
    const name = key.split('_')[0];
    return A.userTarget[name] || 100;
  }
  A.processUserImage = function (surf, key) { // pure CG: chromaKey, alphaBounds, crop, resample, anchor
    C.chromaKey(surf, 70, 50);
    const b = C.alphaBounds(surf);
    if (!b) return null;
    const c = C.crop(surf, b.x, b.y, b.w, b.h);
    const th = targetHeight(key), tw = Math.max(1, Math.round(c.w * th / c.h));
    const r = C.resample(c, tw, th);
    r.ax = Math.floor(tw / 2); r.ay = th - 1;
    return r;
  };
  A.loadAssets = function () { // browser only; resolves when all window.ASSETS are processed
    const assets = (typeof window !== 'undefined' && window.ASSETS) || {};
    const keys = Object.keys(assets);
    return Promise.all(keys.map(key => new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
          const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
          const id = cx.getImageData(0, 0, im.width, im.height);
          const s = new C.Surface(im.width, im.height, new Uint32Array(id.data.buffer.slice(0)));
          const p = A.processUserImage(s, key);
          if (p) A.user[key] = p;
        } catch (e) { console.warn('sprite failed', key, e); }
        res();
      };
      im.onerror = () => res();
      im.src = assets[key];
    })));
  };

  /* ---------- runtime effects ---------- */
  A.drawMandala = function (cx, cy, R, t, cols) {
    cols = cols || [hex('#ffcf4a'), hex('#ff6a2a'), hex('#fff0b0')];
    C.radial(cx, cy, R * 1.25, withAlpha(cols[0], 90), 2);
    C.circle(cx, cy, Math.round(R), withAlpha(cols[0], 230)); C.circle(cx, cy, Math.round(R * 0.82), withAlpha(cols[1], 200)); C.circle(cx, cy, Math.round(R * 0.4), withAlpha(cols[2], 200));
    const polys = [[8, 0.9, 1, cols[0]], [6, 0.7, -1.6, cols[1]], [12, 0.55, 2.2, cols[2]], [4, 0.45, -3, cols[0]]];
    for (const [n, k, sp, col] of polys) {
      const m = M3.chain(M3.T(cx, cy), M3.R(t * sp * 0.4));
      const pts = []; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; const p = M3.apply(m, Math.cos(a) * R * k, Math.sin(a) * R * k); pts.push(p); }
      C.polyline(pts, withAlpha(col, 220), true);
      // star: connect every second vertex
      for (let i = 0; i < n; i++) C.line(pts[i][0], pts[i][1], pts[(i + 2) % n][0], pts[(i + 2) % n][1], withAlpha(col, 140));
    }
    for (let i = 0; i < 16; i++) { // petal ring
      const a = i * Math.PI / 8 + t * 0.3, m = M3.chain(M3.T(cx, cy), M3.R(a));
      const pts = [[0, -R * 0.84], [R * 0.07, -R * 0.92], [0, -R * 0.99], [-R * 0.07, -R * 0.92]].map(p => M3.apply(m, p[0], p[1]));
      C.fillPolygon(pts, withAlpha(cols[1], 200));
    }
    C.disc(cx, cy, R * 0.12, withAlpha(cols[2], 255));
  };
  A.drawFlame = function (x, y, h, t, seed, glow) { // (x,y) = base centre
    const w = h * 0.34, k = (seed || 0) * 1.7;
    const layer = (sc, c) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10, ang = Math.PI * u, sway = Math.sin(t * 7 + k + u * 4) * w * 0.25 * u;
        const px = x - Math.cos(ang) * w * sc * (1 - u * 0.2) + sway, py = y - Math.sin(ang) * h * sc * (0.55 + 0.45 * Math.sin(t * 9 + k + i)) * 0.0;
        pts.push([px, y - u * 0]);
      }
      // body outline: teardrop with wobble
      const L = [], R = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10, half = w * sc * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - u * 0.4); const sw = Math.sin(t * 8 + k + u * 5) * w * 0.3 * u * u; const yy = y - u * h * sc * (1 + 0.08 * Math.sin(t * 11 + k)); L.push([x - half + sw, yy]); R.push([x + half + sw, yy]); }
      C.fillPolygon(L.concat(R.reverse()), c);
    };
    if (glow !== false) C.radial(x, y - h * 0.4, h * 1.6, rgba(255, 150, 50, 90), 2);
    layer(1.0, rgba(255, 90, 20, 235)); layer(0.72, rgba(255, 170, 40, 245)); layer(0.42, rgba(255, 245, 190, 255));
  };
  A.drawTamasurHand = function (cx, cy, s, t, open) { // spectral hand: Bezier tendrils (CO6)
    const dark = rgba(30, 10, 50, 230), mid = rgba(80, 20, 110, 200), glow = rgba(255, 60, 60, 200);
    C.radial(cx, cy, 190 * s, rgba(120, 20, 160, 90), 2);
    C.ellipseFill(cx, cy, 70 * s, 54 * s, dark); C.ellipseFill(cx, cy - 6 * s, 56 * s, 38 * s, mid);
    const fingers = 5;
    for (let f = 0; f < fingers; f++) {
      const spread = (f - 2) * (0.42 + 0.25 * open), a = -Math.PI / 2 + spread;
      const sx = cx + (f - 2) * 22 * s, sy = cy - 30 * s, len = (170 + (f === 0 || f === 4 ? -30 : 0)) * s * (0.8 + 0.2 * open);
      const wob = Math.sin(t * 2.2 + f * 1.3) * 40 * s;
      const p0 = [sx, sy], p1 = [sx + Math.cos(a) * len * 0.35 + wob, sy + Math.sin(a) * len * 0.35], p2 = [sx + Math.cos(a) * len * 0.7 - wob, sy + Math.sin(a) * len * 0.7], p3 = [sx + Math.cos(a) * len + wob * 0.5, sy + Math.sin(a) * len];
      const pts = C.bezierPoints([p0, p1, p2, p3], 22);
      for (let i = 0; i + 1 < pts.length; i++) { const w = (24 * (1 - i / pts.length) + 3) * s; C.lineThick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, i % 2 ? dark : mid); }
      C.disc(p3[0], p3[1], 5 * s, glow);
    }
    C.ellipseFill(cx - 20 * s, cy + 2 * s, 7 * s, 4 * s, glow); C.ellipseFill(cx + 20 * s, cy + 2 * s, 7 * s, 4 * s, glow);
  };
  A.drawSlash = function (cx, cy, r, ang, p) { // crescent that fades; p in 0..1
    const a = clamp(p, 0, 1), sweep = 2.2 * Math.min(1, a * 1.6), a0 = ang - 1.1;
    C.arcRing(cx, cy, r - 4, r + 6, a0, a0 + sweep, rgba(255, 235, 190, Math.round(220 * (1 - a * a))));
    C.arcRing(cx, cy, r + 2, r + 12, a0 + 0.1, a0 + sweep, rgba(255, 150, 60, Math.round(140 * (1 - a))));
  };

  /* ---------- 3D lotus: petals are bicubic Bezier patches (CO3-CO6) ---------- */
  let lotus = null, zb = null;
  A.lotusMesh = function () {
    if (lotus) return lotus;
    const meshes = [];
    const rings = [[9, 70, 1.35, 0.55, 0.22], [8, 45, 1.2, 0.46, 0.2], [6, 22, 1.0, 0.36, 0.16]];
    const widths = [0.10, 0.55, 0.50, 0.02], xs = [-1, -0.33, 0.33, 1];
    rings.forEach(([n, tiltDeg, len, wid, cup], ri) => {
      const net = [];
      for (let i = 0; i < 4; i++) { net.push([]); for (let j = 0; j < 4; j++) net[i].push([xs[i] * widths[j] * wid * 2, len * j / 3, 0.06 + cup * (1 - xs[i] * xs[i]) * (j === 0 ? 0.3 : 1)]); }
      const col = (u, v) => mixc(hex(ri === 0 ? '#fff2f6' : '#fff6f9'), hex(ri === 0 ? '#e8509a' : '#f06aa8'), Math.pow(v, 1.3) * (0.7 + 0.3 * Math.abs(u - 0.5) * 2));
      const base = C.bezierPatchMesh(net, 6, 6, col);
      for (let k = 0; k < n; k++) {
        const phi = k * Math.PI * 2 / n + ri * 0.35;
        meshes.push(C.transformMesh(base, M4.chain(M4.RY(phi), M4.RX(tiltDeg * Math.PI / 180))));
      }
    });
    // seed pod
    const pod = { V: [[0, 0.2, 0]], F: [], C: [hex('#d8e04a')] };
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; pod.V.push([Math.cos(a) * 0.24, 0.14, Math.sin(a) * 0.24]); pod.C.push(hex('#9ab83a')); }
    for (let i = 0; i < 16; i++) pod.F.push([0, 1 + ((i + 1) % 16), 1 + i]);
    meshes.push(pod);
    return lotus = C.mergeMeshes(meshes);
  };
  A.drawLotus = function (t, cx, cy, scale) {
    const mesh = A.lotusMesh(), tgt = C.getTarget();
    if (!zb || zb.w !== tgt.w || zb.h !== tgt.h) zb = C.makeZBuffer(tgt.w, tgt.h); else zb.clear();
    const model = M4.chain(M4.T(0, -0.8, -6), M4.RX(0.55), M4.RY(t));
    C.renderMesh(mesh, model, { eye: [0, 0, 0], f: 2.2, near: 0.1, vp: { cx, cy, scale: scale || 150 } }, { dir: [0.4, 0.8, 0.5], amb: 0.45, dif: 0.7 }, { shading: 'gouraud', twoSided: true, zbuf: zb });
  };
})();
