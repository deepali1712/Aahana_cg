// Renders a contact sheet of the procedural art to /tmp-less scratch PNG via PPM. Usage: node tools/preview_art.js out.ppm
const CG = require('../src/cg.js'); require('../src/cg3d.js'); const ART = require('../src/art.js');
const fs = require('fs');
const W = 1400, H = 900, S = new CG.Surface(W, H).clear(0xFF2a2a2a);
CG.setTarget(S);
ART.sand(S, 0, 0, 450, 300); ART.pavers(S, 450, 0, 300, 300); ART.crackedMud(S, 750, 0, 320, 300); ART.ghatSteps(S, 1070, 0, 330, 160); ART.cellFloor(S, 1070, 160, 330, 140);
ART.rangoli(1000, 480, 150);
let x = 20;
const put = (s, px, py) => CG.blit(s, px - s.ax, py - s.ay);
put(ART.tree(1), 90, 590); put(ART.tree(2), 220, 590); put(ART.house(0), 380, 600); put(ART.house(1), 600, 600);
put(ART.temple(), 260, 890); // big
put(ART.diya(), 700, 330); put(ART.firePit(), 790, 340); put(ART.lampPillar(), 880, 345); put(ART.bush(1), 940, 345); put(ART.rock(1), 1030, 345); put(ART.dryShrub(1), 1110, 345);
put(ART.cellPillar(0), 1180, 345); put(ART.cellPillar(1), 1250, 345); put(ART.cellPillar(2), 1320, 345); put(ART.cellDoor(), 1250, 520);
ART.drawGarland(620, 650, 760, 640, 30, 0);
const buf = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { const c = S.d[i]; buf[i * 3] = c & 255; buf[i * 3 + 1] = (c >> 8) & 255; buf[i * 3 + 2] = (c >> 16) & 255; }
fs.writeFileSync(process.argv[2], Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
