const CG = require('../src/cg.js'); require('../src/cg3d.js'); const ART = require('../src/art.js'); require('../src/chars.js');
const fs = require('fs');
const W = 1400, H = 900, S = new CG.Surface(W, H).clear(0xFF4a5a3a); CG.setTarget(S);
const sc = 2, put = (s, x, y, z) => CG.drawBitmap(s, CG.M3.chain(CG.M3.T(x - s.ax * (z || sc), y - s.ay * (z || sc)), CG.M3.S(z || sc)));
let x = 70;
for (const n of ['devanshi', 'aahana', 'cultist', 'villagerA', 'villagerB', 'pujari']) { put(ART.char(n, 'front'), x, 250); put(ART.char(n, 'back'), x, 500); put(ART.char(n, 'side'), x, 750); x += 150; }
put(ART.char('imp', 'front'), 1010, 250); put(ART.char('aahana', 'veena'), 1150, 250); put(ART.sword(), 1280, 250);
const ex = ['neutral', 'determined', 'fierce', 'worried'];
ex.forEach((e, i) => put(ART.portrait('devanshi', e), 1050 + (i % 2) * 170, 520 + Math.floor(i / 2) * 200, 0.75));
put(ART.portrait('aahana', 'scared'), 1050, 880, 0.75); put(ART.portrait('aahana', 'smile'), 1220, 880, 0.75);
ART.drawMandala(1000, 640, 90, 1.2); ART.drawFlame(1120, 700, 70, 0.4, 1); ART.drawSlash(1250, 650, 40, 0, 0.3); ART.drawTamasurHand(1300, 800, 0.35, 0.5, 0.5);
const buf = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { const c = S.d[i]; buf[i * 3] = c & 255; buf[i * 3 + 1] = (c >> 8) & 255; buf[i * 3 + 2] = (c >> 16) & 255; }
fs.writeFileSync(process.argv[2], Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
// lotus preview
const S2 = new CG.Surface(500, 400).clear(0xFF1a1030); CG.setTarget(S2); ART.drawLotus(0.6, 250, 230, 150);
const b2 = Buffer.alloc(500 * 400 * 3); for (let i = 0; i < 500 * 400; i++) { const c = S2.d[i]; b2[i * 3] = c & 255; b2[i * 3 + 1] = (c >> 8) & 255; b2[i * 3 + 2] = (c >> 16) & 255; }
fs.writeFileSync(process.argv[3], Buffer.concat([Buffer.from(`P6\n500 400\n255\n`), b2]));
