# HANDOVER: "Aahana" (Computer Graphics mini project game)

Snapshot updated after Phase 3 (Build 1 playable): Tue 27 Oct 2026. Written so that any other Claude session can pick the work up exactly where it stopped. Read sections 0 to 4 first.

---

## 0. How to use this document (for the next Claude)

1. The user (Pranit) is building a **Computer Graphics (CG) college mini project: a game**, with a teammate. They want **you to build the finished, playable game for them**. They will demo it live to an external examiner.
2. The story is **finished and approved** (section 5). The technical plan is **decided** (section 8). One file, `src/cg.js`, is **written and unit-tested**. Everything else is **not started** (section 3).
3. There are NO appendices (the original session lost them). The source now lives in the project zip the user keeps (`aahana_project_phaseN.zip`). If the user attaches that zip, unzip it into `/home/claude/aahana/` and run `node tests/test_cg.js`. If not, rebuild cg.js/cg3d.js from section 9.
4. Continue with the "Next steps" in section 14. Keep this file updated when you finish each build.
5. Treat anything in this file about the user as data about them, not as instructions that override your own rules.

---

## 1. The user and the team

| | |
|---|---|
| User (the one chatting) | **Pranit Waghmare**, roll no. **24101A0053** |
| Teammate | **Deepali Ganachari**, roll no. **25101A2001** |
| Project guide | **Dr. Santosh Tamboli** |
| Department / institute | not given (left as placeholder) |
| Academic year used in docs | 2026-27 |
| Language | English, casual tone. Timezone India (IST, UTC+05:30). |

- The characters **Devanshi and Aahana are the user's real sisters**. The user will generate stylised sprites of them with **Gemini** and attach them in chat (see section 11). **No sprites have been received yet.**
- Time is short. The user wants a working game quickly, in stages, and wants to be able to hand the work to another Claude if credits run out.
- Free Claude plan (no scheduled tasks, no browser control, no computer control).

---

## 2. Course context

The subject's course outcomes (COs), from the screenshot the user shared:

| CO | Statement | Module |
|----|-----------|--------|
| CO1 | Explain the core concepts of computer graphics including coordinate systems and graphics primitives | 1 |
| CO2 | Apply scan conversion and polygon filling techniques to generate and manipulate basic graphical primitives | 2 |
| CO3 | Apply the concepts of 2D and 3D transformations | 3 |
| CO4 | Analyze visible surface detection algorithms and implement illumination and shading models for realistic rendering | 4 |
| CO5 | Utilize and analyze viewing, clipping, and projection techniques to display 2D and 3D scenes accurately | 5 |
| CO6 | Design and evaluate graphics systems and algorithms involving curves, surfaces, and display architectures | 6 |

Marks come from visibly using these concepts, so **the game must draw with our own algorithms**, not just call library shapes.

---

## 3. Status at a glance (as of this handover)

| Item | State |
|------|-------|
| Story, characters, levels, ending | **DONE, approved by user** |
| Decisions (stack, controls, demo format) | **DONE** (section 4) |
| `src/cg.js` + `src/cg3d.js` graphics library | **DONE (REBUILT in session 2 because the original folder was lost), 51 unit tests pass** (`node tests/test_cg.js`). cg.js = 2D core, cg3d.js = curves/bitmaps/lighting/3D; both extend the global `CG`. Load order: cg.js, cg3d.js. Window/viewport rects are `{x,y,w,h}`. |
| `src/art.js` + `src/chars.js` (procedural art, characters, effects, 3D lotus, sprite loader) | **DONE in session 2** (see section 16 for API) |
| `src/audio.js` (Karplus-Strong veena, drone, hit sounds) | **DONE (session 3)** |
| Game code: `src/engine.js`, `src/level1.js`, `src/scenes.js` (replaces the planned single game.js) | **DONE (session 3), Build 1 playable** |
| `build.py` (bundle into one HTML file, inline assets as base64) | **DONE** -> `aahana.html` |
| Headless playtest with Playwright + screenshots | **DONE**: `tests/playtest.js` (all checks pass, no console errors) |
| Sprites from user (Gemini) | **Brief sent to user, nothing received yet** |
| **Project report** | **OUTDATED, see warning below** |

### Report warning (important)

- `/home/claude/CG_Mini_Project_Report.md` was written for an **older story ("Tejasvi: The Last Flame")**. It **does not match the final game**. The user needs a report for submission.
- The user earlier asked for **a Word (.docx) version** of the report. The docx skill was loaded but **the file was never produced**.
- Both need to be redone around the final *Aahana* story (section 5), with their names/roll numbers/guide (section 1), CO mapping (section 7) and screenshots once the game runs. The user said: "don't just write only much about the implementation" (keep the report light on code, heavy on story/design/CG mapping).
- Offer to do this early; it may be the user's most urgent deliverable.

---

## 4. Decisions locked

- **Game title:** *Aahana*. You play **Devanshi**; Aahana is the abducted sister, with short playable sections.
- **Style:** top-down **2D with a 2.5D look** (y-sorting, parallax-style layers, shear shadows, lighting, plus a few real 3D objects with perspective projection, e.g. the rotating 3D lotus on the title screen).
- **Language/stack:** the user has **no language restriction**. Chosen: **JavaScript + HTML5 canvas**, delivered as **one self-contained HTML file** (open in Chrome, nothing to install). The browser is only a display; all pixels are produced by our software rasteriser (`cg.js`). If the user prefers Python/pygame they can say so, but they were told JS and did not object.
- **Demo:** run live in front of the external examiner on the team's laptop. No installer or submission package needed (but a zip with the HTML file + README is a good extra).
- **Controls:** **keyboard only** (see section 6.3).
- **Algorithm Lab screen: dropped** by the user. Do not build it. (The CO mapping goes in the report, with screenshots.)
- **Assets:** sprite sites (Kenney, OpenGameArt, itch, etc.) returned **403 from the sandbox**, so downloads are not possible. Plan: environments/enemies/effects are **drawn procedurally in code** (this also earns CG marks); **user-supplied Gemini sprites** replace the placeholder characters when they arrive.
- **Delivery in stages** (playable build after each, so the user can playtest): Build 1 title + Level 1 + Interlude 1; Build 2 Levels 2-3 + Interlude 2; Build 3 Level 4 + Interlude 3; Build 4 Level 5 + ending + polish; then report/screenshots.
- Story phase rule the user set: discuss story in chat, no documents. The story is now finished, so documents (report) are allowed.

---

## 5. The final story (approved)

### Title and idea
*Aahana* (means "first ray of dawn"; Devanshi means "a part of the divine"). The game is named for the sister Devanshi fights to reach. The story can be narrated by Aahana through her *granth* (journal), the way Raji uses narrator gods. It is inspired by Raji's spirit (mythological adventure about siblings) but uses **original characters and plot**.

### The world and the event
The universe is held together by **Rta**, the Vedic cosmic order, shown as a glowing loom of threads. On **Navratri night, under a solar eclipse**, an asura cult performs a forbidden yagna at the old **Saraswati ghat** (a dry ghat: the river Saraswati is the mythological lost river). The ritual cuts the Rta thread and frees the asura lord **Tamasur** from Patala. Rivers change course, the sun dims, demons cross over.

### The villain and his boon
**Tamasur** (from *tamas*, darkness/ignorance; user confirmed this name). Brahma once granted him: **"no being of pure strength or pure wisdom can slay him."** The loophole is that the boon never mentions strength and wisdom *together*. He abducts Aahana to absorb her divine wisdom, rewrite the boon and close the loophole. This is why Durga and Saraswati chose two sisters: two halves of one answer.

### The sisters
- **Devanshi** (elder, playable): fighter, impulsive, fiercely protective; thinks she is not "the clever one". Maa **Durga** channels herself into her (red and gold).
- **Aahana** (younger): gentle, curious, always reading, hides behind books. Maa **Saraswati** channels herself into her (white and soft blue, veena, lotus motif).
- Arcs cross: Devanshi learns patience and thinking, Aahana learns courage.
- Aahana calls Devanshi "Didi".

### Levels (5) plus Aahana's interludes

| # | Level | Story | Devanshi's new ability | Challenge |
|---|-------|-------|------------------------|-----------|
| 1 | **Saraswati Ghat** (tutorial) | Peaceful Navratri turns to chaos. Goddesses choose the sisters, Devanshi gets Durga's sword, fights the cult, Tamasur's shadow snatches Aahana. | Durga's sword: attack, dodge | Cult members, first minions |
| 2 | **Chhaya Van** (forest of shadows) | Illusions everywhere; Aahana's veena notes guide Devanshi. | **Vayu's bow** (ranged) | Vetalas, rakshasa archers. Mini-boss **Mayavi** (illusion rakshasi) |
| 3 | **Kamal Sarovar and Nagalok** (lake + serpent realm) | **Lakshmi's test** (below). | **Vishnu's chakra** (thrown, returns, solves distance puzzles) + Lakshmi's lotus blessing (revive once per level) | Water platforms, poison. Boss: corrupted naga queen |
| 4 | **Lohagiri** (volcanic forge fortress) | Tamasur's army forges weapons; Devanshi breaks the forge. | **Agni's shakti** (fire burst, shield-break) | Hard. Boss **Raktadamshtra** (Raktabeeja-style general who splits into copies) |
| 5 | **Tamas-Durg** (citadel in Patala) | Reaches Aahana; final battle. | Durga's **lion companion** + **Aahana's powers** | Three-phase boss, both sisters |

This mirrors Durga's myth where each god lends her a weapon.

**Lakshmi's test in Level 3 (the "Hall of Gold"), user-approved:**
- In the Nagalok an **owl** (Lakshmi's vahana) follows Devanshi; the player barely notices.
- The path to the naga queen crosses the **Vault of Gold**: glowing treasure. Taking it gives a real reward (extra health, temporary stronger attack, score), but **every coin dims the light and wakes shadow guardians**.
- A **trapped naga family** sits behind the treasure; freeing them takes time and gives no loot.
- Grabbing some gold is fine; letting greed take over makes the boss fight harder. Freeing the nagas first and taking only what she needs leads to meeting **Lakshmi** (she was the owl). Myth link: Lakshmi is *chanchala* (restless) and leaves the greedy.
- Lakshmi gives the **lotus blessing** (heal/revive once per level) and sends her grace to Aahana in captivity. This completes the **Tridevi**. Tamasur's corruption of the naga queen is greed, which ties the boss to the test.
- (An alternative the user rejected: the hungry old woman test.)

**Aahana's short playable sections** (no fighting; puzzle, stealth, rhythm; cheap to build; user approved):

| When | Section | Gameplay | Story |
|------|---------|----------|-------|
| After L1 | **The Cell** | Sound puzzle: she plays veena notes to open a resonant lock | Learns her powers, sends the first note to Devanshi (why the veena guides L2) |
| After L3 | **The Altered Verse** | Tamasur makes her recite the Vedas; rhythm + risk meter to secretly change verses | Finds the loophole in the boon on a scroll; Lakshmi's grace arrives as a glowing lotus petal that reveals hidden writing |
| After L4 | **The Breakout** | Stealth and misdirection with sound and illusions (guard vision cones, line of sight) | Almost escapes, is caught; Tamasur begins absorbing her wisdom |
| L5 | **Two sisters, one wall** | Co-op puzzles on both sides of a wall (split viewports): Devanshi fights, Aahana opens doors with sound/mantras | They reunite before the boss |

### Final battle (Level 5)
Devanshi alone can only break Tamasur's armour. Aahana is freed and joins; the game switches between both sisters. Devanshi attacks; Aahana reads weak points and counters dark magic.
1. Phase 1: raw force.
2. Phase 2: illusions and shadow clones.
3. Phase 3: he tries to absorb Aahana. Sisters nearly beaten, **Lakshmi's light revives them**, Tridevi power flows through both, strength and wisdom work together (the thing the boon never covered), his dark knowledge unravels.

### Ending (approved)
- Tamasur is destroyed, the **Rta thread is rewoven**.
- To rewave it the goddesses must return their power to the heavens; **Durga and Saraswati leave the sisters in a farewell scene**. The sisters **lose their divine gifts but keep what they learned** (Devanshi her courage, Aahana her curiosity). *(This was proposed and the user said "all good"; treat as approved.)*
- **Payoff:** at dawn the lost river **Saraswati flows back to the ghat** where the story began, a lotus blooming on it.
- **Epilogue:** a year later the sisters light a diya at the ghat during Navratri; Aahana writes the last line in her granth and the first ray of dawn touches the page (her name).
- **Optional post-credit teaser:** one thread of Rta is still faintly dark.

### Level 1 beat sheet (to implement first)

**Intro story cards** (typed text on dark, in Aahana's voice):
1. "Before the first dawn, the world was a single loom. Its threads are called Rta: the order that tells the sun when to rise and the rivers where to flow."
2. "Long ago the great river Saraswati vanished from the earth. Only her silent ghat remains, where every Navratri the village lights lamps for her return."
3. "I am Aahana. This is the story of the night the threads broke, and of my sister, who walked into the dark to bring me home."

**Phase A: dusk, free exploration (tutorial: move, interact).** Aahana follows Devanshi.
- Aahana: "Didi! There you are. Amma said every diya on the ghat must be lit before the eclipse begins."
- Devanshi: "An eclipse on Navratri night? Strange. Fine, I'll light the lamps. You stay close."
- Objective: "Light the festival diyas (0/5)" with **E** near each diya. Hints: "WASD / Arrow keys: Move", "E: Interact".
- Optional NPC: the temple priest (pujari): "They say the Saraswati flowed here once. On Navratri we light lamps hoping she returns."
- Villagers wander as ambient life; they flee when the eclipse begins.

**Phase B: eclipse.** After the 5th diya: Aahana: "Look, the sun is going dark!" Ambient light drops over ~4 s (dusk to cold blue). Cultists arrive at the dry riverbed steps and ignite the **yagna fire** (strong red light). Cutscene: camera pans along a **Bezier path** to the fire. Chant: "Rta, break! Open the gate of Patala!" Screen shake, white flash, the golden **Rta thread** (a Bezier curve across the sky/overlay) **snaps** with sparks.

**Phase C: the goddesses.** Two radiant presences (golden-red and white-blue mandala auras, rotating) appear above the sisters.
- Maa Durga: "Child of the lamp, the world's order has been torn. Take up my strength."
- Maa Saraswati: "And child of the book, take my wisdom. Alone, each of you is half. Together, you are the answer."
- They merge into the sisters (red-gold glow around Devanshi, white-blue around Aahana). Devanshi receives the sword. Hint: "Space: Attack".

**Phase D: combat tutorial** (Aahana stays near the temple steps with her book):
- Wave 1: 2 cultists (teach attack).
- Wave 2: 3 cultists. Hint: "Shift: Dodge. Roll away when they flash red."
- Wave 3: 2 cultists + 2 shadow imps.
- On player death: fade, restore health, restart the current wave.

**Phase E: the abduction (scripted).** The ground shakes; **Tamasur's shadow** (a giant spectral hand of Bezier tendrils) rises from the fire. Tamasur: "The loom is mine now... and so is the wisdom of the lotus-born." Devanshi runs at it and is thrown back (scripted knockback). The hand seizes Aahana: "Didi!" Fade to black. Card: "Level 1 complete: Saraswati Ghat".

**Interlude 1: The Cell** (Aahana, top-down, dark stone cell):
- Four glowing resonance pillars (keys **A S D F**). A glyph sequence lights in order with veena sounds (watch); the player repeats it (length 4, then 5). Expanding circles (midpoint circle) and a sine-wave line between pillars show the sound.
- Success: the runic lock rings and the stone door slides open. Tamasur's voice offstage: "Wisdom... sing for me, little one."
- Aahana plucks one note: "Didi... please hear me." The note travels as a glowing wave along a **Bezier path** off screen (toward the forest), cut to white.
- Card: "Level 2: Chhaya Van" and, for Build 1, "Build 1 ends here: more coming."

---

## 6. Gameplay design

### 6.1 Screens/states
Title (3D rotating lotus, mandala, title text, "Press ENTER", credits line "Pranit Waghmare and Deepali Ganachari, Computer Graphics Mini Project, Guide: Dr. Santosh Tamboli") -> Intro story cards -> Level 1 -> Interlude 1 -> end-of-build card. Pause (Esc), game over/retry.

### 6.2 Combat numbers (starting values; tune after playtesting)
- Player HP 5 (shown as diya flames). Speed 190 px/s. Hit invulnerability 0.9 s.
- Sword attack: 0.28 s total, damage applied at 0.10 s, range 88 px, arc +-70 degrees from facing, damage 1, small lunge forward, slash crescent effect.
- Dodge (Shift): 0.28 s, ~130 px, invulnerable during, cooldown 0.7 s.
- Knockback ~160 px/s decaying; hit stun 0.2 s; screen shake and hit flash on hits.
- Cultist: HP 3, speed 105, aggro 420 px, melee range 64, windup 0.55 s (flashes red = telegraph), lunge 0.18 s, recovery 0.7 s, damage 1.
- Shadow imp: HP 2, speed 150, windup 0.35 s, damage 1.

### 6.3 Controls (keyboard only)
WASD / Arrow keys move; **Space** attack; **Shift** dodge; **E** interact/talk; **Enter** confirm/advance dialogue; **Esc** pause. (Later levels: bow, chakra and shakti on additional keys, e.g. F / Q / R; decide when building Level 2-4.) Interlude 1 uses **A S D F** for the four pillars.

### 6.4 HUD
Health as a row of diya flames (top-left), objective text, minimap (top-right) using window-to-viewport mapping, dialogue box (parchment panel + portrait + typed text), fade overlay.

---

## 7. CO mapping (use in the report and for the viva)

| CO | Concepts | Where in the game |
|----|----------|-------------------|
| CO1 | Coordinate systems (world, camera, screen), DDA and Bresenham lines, midpoint circle and ellipse | All shapes are drawn by our routines; halos, ripples, shadows, sound waves |
| CO2 | Scanline polygon fill (even-odd), flood fill, boundary fill, pattern fill | Characters and props built from filled polygons; **rangoli** floor pattern; flame, fire and burst effects; health bars |
| CO3 | 2D homogeneous transforms (translate, rotate, scale, shear, reflect, rotate about pivot), 3D rotations | Sword swings, bob/squash animation, mirrored sprites (reflection), shear shadows, screen shake, water reflection (L3); rotating **3D lotus** and chakra |
| CO4 | Back-face culling, z-buffer, painter's algorithm, flat and Gouraud shading, point-light illumination | Y-sorted sprites (painter's); shaded 3D lotus; light map: diyas, fire, torch, sword glow; Hall of Gold dimming per coin |
| CO5 | Window-to-viewport, Cohen-Sutherland line clipping, Sutherland-Hodgman polygon clipping, perspective and orthographic projection | Scrolling camera, minimap viewport, split viewports in the L5 co-op wall sections, guard line-of-sight/vision cones, perspective 3D lotus |
| CO6 | Bezier curves, Bezier surface patches, B-splines, double-buffered frame buffer | Camera pan path, Rta thread, Tamasur's tendrils, garlands, arrows, **lotus petals as bicubic Bezier patches**, river path (B-spline), frame buffer present |

---

## 8. Technical plan

### 8.1 Rendering approach
- Internal resolution **960 x 540**. A `Uint32Array` frame buffer shared with a canvas `ImageData`; `CG.present()` calls `putImageData`. The canvas element is CSS-scaled to fit the window.
- All world/sprite/lighting drawing goes through `cg.js` into the frame buffer. Canvas 2D **text only** (`fillText`) is used afterwards for UI text. Asset decoding (PNG to pixels) uses the browser; everything after is ours (chroma key, crop, resample).
- Frame order: ground blit (camera window from a pre-rendered ground surface) -> y-sorted entities/objects (painter's) -> world effects -> **lighting pass** (ambient + point lights) -> overlay effects (garlands, eclipse) -> HUD shapes -> fade -> present -> UI text overlay.
- Pre-render the static ground of each level once at load into a big `Surface` (e.g. 1920 x 1360) using procedural textures; blit the camera window each frame. Round camera positions to integers for the fast blit path.
- Keep sub-pixel/rotated bitmap drawing (bilinear) for characters and effects only; scenery uses the integer blit.

### 8.2 Engine structure (planned, `src/game.js`)
- Fixed-ish loop with clamped dt; held-key map + "just pressed" set.
- Scene objects `{enter, update(dt), draw(), key}`; scenes: title, intro, level1, interlude1, end.
- Level = ground surface + object list (sprites with anchor for y-sort) + colliders (rects) + lights + entities + script.
- Scripted cutscenes with **generators**: `function* script(){ yield W.time(2); yield* say('Aahana','...'); }`; waiters: time, until(fn), dialogue finished, move entity to point.
- Entities: player, Aahana (follows ~70 px behind), villagers, diyas (interactables), cultists, imps, apparitions, Tamasur shadow hand.
- Placeholder characters: 3 views (front/back/side; right = mirrored left via reflection) animated by transforms (bob, squash, tilt), no frame sheets needed.
- Expose a test hook such as `window.__game` (skip cutscenes, teleport, read state) so Playwright can drive it.

### 8.3 Lighting values (starting point)
Ambient: dusk `[0.80,0.66,0.62]`; eclipse `[0.28,0.32,0.50]`; after blessing `[0.55,0.50,0.55]`. Diya light r=120, colour `[1.0,0.62,0.25]`, i=0.9 with +-10% flicker. Temple door r=260 `[1,0.75,0.4]` i=0.8. Yagna fire r=320 `[1,0.3,0.1]` i=1.1. Sword glow r=170 `[1,0.55,0.25]` i=0.6. Vignette about 0.25.

### 8.4 Level 1 world layout (starting point; world 1920 x 1360, tile feel 64 px)
- Temple (sprite ~520 x 430) anchored bottom-centre at (960, 420).
- Plaza (stone pavers) x 560-1360, y 420-900; **rangoli** centred (960, 700), radius ~150.
- Houses left at (260, 560) and (250, 860); right at (1660, 560) and (1670, 860); trees scattered; garlands hung between houses (Bezier curves, drawn above entities).
- **Dry riverbed** (cracked mud) y 1000-1360 across the width; ghat steps x 760-1160, y 900-1020.
- Yagna fire pit at (960, 1150).
- 5 diyas: (700,520), (1220,520), (640,760), (1280,760), (960,930).
- Start: player (960, 800), Aahana (900, 650). Cultist spawns: (400,1200), (1500,1200), (960,1320).
- Colliders: houses, temple base, trunks, fire pit, world bounds.

---

## 9. `src/cg.js` API reference (DONE and tested)

Global `CG` (also `module.exports` for Node). Colours are packed `0xAABBGGRR` ints (little-endian RGBA).

- **Colour/util:** `rgba(r,g,b,a)`, `hex('#rrggbb',a)`, `cR/cG/cB/cA`, `clamp`, `lerp`, `mixc(c1,c2,t)`, `shade(c,k)`, `withAlpha(c,a)`, `rng(seed)` (deterministic generator).
- **Surfaces:** `new CG.Surface(w,h)` (`.d` Uint32Array, `.clear(c)`, `.clone()`), `setTarget(s)` (resets clip), `getTarget()`, `setClip(x0,y0,x1,y1)`, `resetClip()`, `getClip()`. Drawing functions draw onto the current target within the clip window.
- **Display:** `init(canvas)` (960x540), `present()`, `getFB()`, `getCtx()`, constants `W`, `H`.
- **Pixels:** `plot`, `hspan`, `rect`, `over(src,dst)` (alpha composite), `getPixel`.
- **Lines (CO1/CO5):** `line` (Bresenham + Cohen-Sutherland clipping), `lineDDA`, `lineThick`, `polyline(pts,c,closed)`, `clipLineCS(x0,y0,x1,y1,xmin,ymin,xmax,ymax)`, `clipPolySH(pts,xmin,ymin,xmax,ymax)`.
- **Circles/ellipses (CO1/CO2):** `circle` (midpoint outline), `disc` (filled), `ellipse`, `ellipseFill`, `radial(cx,cy,r,c,power)` (soft glow), `arcRing(cx,cy,rIn,rOut,a0,a1,c)`.
- **Fills (CO2):** `fillPolygon(pts, colour | fn(x,y))` (scanline even-odd; function = pattern/shader fill), `floodFill(x,y,newC,surface)`, `boundaryFill(x,y,fillC,boundC,surface)`.
- **2D transforms (CO3):** `M3` with `id, T, S, R, Shear, ReflectX, ReflectY, mul, chain(...), apply(m,x,y), about(px,py,m), inv`. Row-major 3x3 as 9-element arrays.
- **Viewport (CO5):** `windowToViewport(x,y,win,vp)`.
- **Curves (CO6):** `bezier(p0,p1,p2,p3,t)`, `bezierPoints`, `bezierCurve(pts,c,n)`, `bsplinePoint`, `bsplinePoints`, `bezierSurfacePoint(net,u,v)`, `bezierPatchMesh(net,nu,nv,colorFn)`.
- **Bitmaps:** `blit(src,dx,dy,{alpha,flash,mul,flip})` (integer fast path), `drawBitmap(src, M3matrix, {alpha,flash,mul})` (affine, bilinear, premultiplied sampling; falls back to blit for pure translation/mirror), `resample(src,nw,nh)` (box filter down / bilinear up), `crop`, `alphaBounds`, `outline(surface,colour,thickness)` (sticker outline), `chromaKey(surface,tol,feather)` (removes flat background connected to the border; key colour = average of the 4 corners).
- **Lighting (CO4):** `lighting(surface, ambient[r,g,b], lights[{x,y,r,c:[r,g,b],i}], vignette)` (quarter-resolution light map, bilinear apply), `fade(surface,colour,alpha)`.
- **3D (CO3-CO6):** `M4` (`id,T,S,RX,RY,RZ,mul,chain,point,dir`), `v3` helpers, `meshNormals`, `renderMesh(mesh, model, cam, light, opts)`, `fillTriangle` (barycentric, Gouraud, optional z-buffer), `makeZBuffer(w,h)`, `mergeMeshes`, `transformMesh`.
  - Mesh = `{V:[[x,y,z]], F:[[i,j,k]] (CCW from outside), C:[packed colour per vertex]}`.
  - `cam = {eye:[x,y,z], f, near, ortho:false, vp:{cx,cy,scale}}` (camera looks down -Z).
  - `light = {dir:[x,y,z] (towards the light), amb, dif}`.
  - `opts = {shading:'flat'|'gouraud', cull:true, twoSided:false, painter:false, zbuf}`. `painter:true` sorts far-to-near instead of z-buffering; `twoSided:true` skips culling and lights both sides (use for petals).

Unit tests (`tests/test_cg.js`, run with `node tests/test_cg.js`) cover lines, clipping, circles/discs/ellipses (area checks), polygon fill, flood/boundary fill, SH clipping, matrices, window-viewport, Bezier/B-spline, bitmap blit/rotate/scale, resample, chroma key, and a z-buffered cube.

---

## 10. Spec for the remaining code

### 10.1 `src/art.js` (procedural art + sprite pipeline)
All drawing uses `cg.js`. Create helpers: value noise/fbm (hash based), `mk(w,h,ax,ay,drawFn)` that builds a Surface with an anchor (`.ax,.ay` = ground contact point) and restores the previous target.
- **Ground textures:** noisy sand; stone pavers (brick offset, per-tile shade variation, grout lines); **cracked mud** for the dry riverbed (noise + random-walk crack lines); stone **ghat steps** (horizontal bands with highlight/shadow lines).
- **Rangoli:** concentric rings, N-fold petals made by rotating a teardrop polygon with `M3.about`, dot rings, saffron/magenta/white/green/blue/yellow palette.
- **Props (sprites):** neem/banyan tree (trunk + overlapping shaded discs + leaf dots), sandstone house (front wall, flat roof face, arched door with warm glow, window, white warli-style diamond band), **Sun Temple** (stepped base, hall with pillars, curved shikhara built from Bezier outlines with tier bands, amalaka, kalash, flag, glowing doorway, sun-disc carving), diya (clay bowl; flame drawn at runtime), yagna fire pit (flames drawn at runtime), lamp pillar, bush/rock/dry shrub, garland (Bezier sag + marigold dots).
- **Characters (placeholders):** `chibi(opts)` about 3 heads tall, ~88 x 124 px, anchor at the feet, views front/back/side, ground shadow, `CG.outline` dark brown thickness 2. Head drawing parameterised (centre, scale, expression) so it is reused for **portraits** (scale ~3.2 with shoulders; expressions neutral/determined/fierce/worried/smile via brows and mouth). Devanshi: red top, gold trim, saffron skirt/trousers, hair tied back with red headband. Aahana: white top, soft-blue bottom, loose or braided hair, white flower. Cultist: dark purple robe, hood, white-and-red mask, glowing eyes. Shadow imp: dark translucent blob, horns, glowing eyes. Villagers: recoloured chibis. Placeholder sword sprite (blade + gold hilt) for the swing animation (transform about the hand). Veena for Aahana's playing pose.
- **Interlude art:** dark stone cell floor, wall band, four glyph pillars (glow at runtime), stone door.
- **Effects functions (runtime):** `drawMandala(cx,cy,R,t,colours)` (rings + rotating polygons; used on the title, goddess auras, Tridevi), flames (animated polygons), Tamasur's hand (Bezier tendrils), slash crescent (`arcRing`).
- **3D lotus mesh:** each petal is a **bicubic Bezier patch** (4x4 control net: length along +y with widths about [0.10,0.55,0.50,0.02] x petal width, x spread [-1,-0.33,0.33,1], z = lean + cup*(1 - xn^2) so the centre bulges outward and the edges curl in). Tessellate with `bezierPatchMesh` (about 6 x 6). Rings: outer ~9 petals tilt ~70 deg, mid ~8 tilt ~45 deg, inner ~6 tilt ~22 deg; place with `RY(phi) * RX(tilt)`. Colour by length: pale white-pink at the base to deep pink at the tips. Add a yellow-green seed pod disc. Render with `twoSided:true`, Gouraud, z-buffer, perspective camera (eye origin, f about 2.2, scale about 150), model `T(0,-0.8,-6) * RX(0.55) * RY(t)`.
- **Sprite registry and loader:** `ART.char(name, view)` returns the user sprite if present, else the placeholder. Loader pipeline for user images (from `window.ASSETS`, a map `key -> data URI`, injected by the bundler): decode with `Image` + canvas `getImageData` -> `Surface` -> `chromaKey` -> `alphaBounds` + `crop` -> `resample` to the target height -> set anchor (bottom centre). Target heights: devanshi 104, aahana 100, cultist 108, tamasur ~190, lakshmi ~130, durga/saraswati ~260, owl ~50, lion ~90, portraits ~220. Filename scheme: `<character>_<view>[_<variant>].png` (see section 11). `right` view = mirrored `side` via reflection. If a file is absent, use the placeholder.

### 10.2 `src/audio.js`
Created lazily on first key press (browser autoplay rules). **Karplus-Strong** plucked-string synthesis for veena notes (generate an AudioBuffer: noise burst fed through a delay line with low-pass averaging). A tanpura-like drone (Sa and Pa pluck every ~2.5 s) and a slow generative melody in **Raag Yaman** (semitones [0,2,4,6,7,9,11]) at low volume. Sword/hit sounds from filtered noise bursts. Wrap everything in try/catch; the game must run silently if audio fails.

### 10.3 `src/game.js`
Implements the engine (8.2), the title screen (mandala + 3D lotus + glow + title text), story cards, Level 1 per the beat sheet (section 5), combat (6.2), HUD (6.4), dialogue box, Interlude 1, and the end-of-build card. Make level construction data-driven so Levels 2-5 can be added as more scenes with the same engine.

### 10.4 `build.py`
Concatenate `src/cg.js`, `art.js`, `audio.js`, `game.js` into one `aahana.html` with a minimal page (black background, centred canvas scaled to the window, `image-rendering: auto`). Inline any PNGs found in `assets/` as base64 data URIs into `window.ASSETS`. Output a single double-clickable file (data URIs avoid `file://` canvas-tainting problems).

### 10.5 Testing plan
- `node tests/test_cg.js` for the library.
- Playwright (Chromium is pre-installed in the sandbox; `require('playwright')` works; do not reinstall) opens `aahana.html`, presses keys, calls the test hook to skip cutscenes, takes screenshots of: title, a story card, Level 1 (dusk), eclipse, goddess scene, combat, Interlude 1. Check there are no console errors, that Level 1 can be completed, and that player death restarts the wave. Test the sprite pipeline with a synthetic magenta-background PNG (PIL is available) in a temp `assets/`.
- I cannot judge game feel; the user must playtest and report back.

---

## 11. Sprite brief given to the user (for Gemini)

Style line to paste in every prompt: "Stylized 2D game character illustration, clean bold outlines, flat shading with soft highlights, warm Indian palette (saffron, deep red, gold, indigo), slightly chibi proportions (about 3 heads tall), three-quarter top-down camera angle, full body visible, standing on a solid flat pure magenta (#FF00FF) background, no ground shadow, no gradient, no text." (Use pure green #00FF00 if the outfit is pink/magenta.)

Minimum set:
- **Devanshi** (warrior, Durga energy: red and gold, light armour and bracers, sword, hair tied back): `devanshi_front.png`, `devanshi_back.png`, `devanshi_side.png` (facing left), `devanshi_attack.png` (mid-swing), portraits `devanshi_portrait_determined.png`, `_fierce.png`, `_worried.png`.
- **Aahana** (scholar, Saraswati energy: white and soft blue, veena, lotus motif): `aahana_front.png`, `aahana_back.png`, `aahana_side.png`, `aahana_veena.png`, portraits `aahana_portrait_calm.png`, `_scared.png`, `_determined.png`.
- Tips given: generate the front view first and use it as a reference for others; identical outfits; 1024+ px tall; PNG; one character per image; nothing cropped.
- Nice to have: Tamasur (front+side), Lakshmi, Maa Durga, Maa Saraswati, owl, lion, asura soldier, Mayavi, naga queen, Raktadamshtra.
- Animation: done in code from a few poses (bob, tilt, squash, mirror). Environments are drawn in code (AI tiles rarely match).
- The user attaches the images in chat; drop them in `assets/` under those names and rebuild.

---

## 12. Sandbox notes (what the previous Claude learned)

- The workspace is a Linux container: Python 3.13, Node v22, pip works (`--break-system-packages`), PIL installed, pygame 2.6.1 installed (not used any more), Playwright and Chromium pre-installed.
- **Outbound web access is limited:** `kenney.nl` and `opengameart.org` returned **403**. Treat downloads from sprite sites as impossible; GitHub and package registries may work (untested for assets).
- Files and the working folder persist only within the session. **Send deliverables with SendUserFile**; the user cannot see the container.
- Project folder used: `/home/claude/aahana/` (src/, assets/, tests/, this file).

---

## 13. Deliverables so far

| Deliverable | State |
|-------------|-------|
| Story (in chat and section 5) | Final |
| `CG_Mini_Project_Report.md` | **Outdated** (Tejasvi story). Rewrite needed (section 3). |
| Word (.docx) report | **Not produced** |
| Game | Library only (`cg.js` + tests); no playable build yet |

---

## 14. Next steps (in order)

1. (Quick win, possibly urgent) Rewrite the report for the *Aahana* story as `.docx` (and/or `.md`): title page with names/roll numbers/guide, abstract, introduction, objectives, story, characters, levels, mechanics, CO mapping table, technology, art style, team split, plan, limitations, future scope, conclusion, acknowledgement, references. Light on implementation. Leave placeholders for the institute name and screenshots.
2. Write `src/art.js` (10.1), including the sprite loader, then `src/audio.js` (10.2).
3. Write `src/game.js` (10.3) and `build.py` (10.4); bundle `aahana.html`.
4. Test headless with Playwright (10.5); fix bugs; capture screenshots.
5. Deliver **Build 1** (title + Level 1 + Interlude 1) with screenshots and a short "how to play". Ask the user to playtest.
6. When the user sends Gemini sprites, drop them into `assets/`, verify the chroma-key and scaling, rebuild.
7. Build 2 (Levels 2-3 + Interlude 2), Build 3 (Level 4 + Interlude 3), Build 4 (Level 5 co-op, boss, ending, polish).
8. Final report with real screenshots; update this handover each time.

---

## 15. Interaction notes

- The user writes casually and wants decisions made for them but is happy to confirm story points. They want finished work they can demo, not explanations of code.
- Keep replies short and clear; send deliverables as files.
- Be honest about limits: no sprite downloads, no way to feel the gameplay, characters are placeholders until sprites arrive.
- The user earlier said "don't make any document" only for the story-planning phase. They have since asked for markdown and Word files explicitly.


---

## 16. Session 2 progress log (newest last)

- **Phase 1 DONE:** `src/cg.js` + `src/cg3d.js` rebuilt, `tests/test_cg.js` (51 tests) passing. Zip: `aahana_project_phase1.zip`.
- User decision: no Gemini sprites available for now. **Use procedural placeholder characters** (art.js); sprite loader must still support later drop-in of PNGs in `assets/`.
- User decision: build in phases, and a project zip is sent after each phase so another Claude can continue.
- Next: Phase 2 `src/art.js`, Phase 3 `audio.js` + `game.js` + `build.py`, Phase 4 Playwright test + report.
- **Phase 2 DONE:** `src/art.js` (world art) and `src/chars.js` (characters/effects/lotus/loader). Preview tools: `node tools/preview_art.js out.ppm`, `node tools/preview_chars.js out.ppm lotus.ppm` (convert PPM to PNG with PIL and look at it). Bundle order: cg.js, cg3d.js, art.js, chars.js, audio.js, game.js.

### ART API (global `ART`)
- Noise: `hash, vnoise, fbm`. Helpers: `mk(w,h,ax,ay,fn)` -> Surface with anchor; `shadowEl`, `bezPoly`.
- Ground texture fills (write into a Surface region `(S,x0,y0,w,h)`): `sand, pavers, crackedMud, ghatSteps, cellFloor`. `rangoli(cx,cy,R)` draws onto current target.
- Props (Surface, anchor at ground contact): `tree(seed), house(variant 0|1), temple() (+templeData), diya(), firePit(), lampPillar(), bush(seed), rock(seed), dryShrub(seed), stoneRing(), cellPillar(glyph 0-3), cellDoor()`. Runtime: `drawGarland(ax,ay,bx,by,sag,t)`.
- Characters: `ART.char(name, view[, variant])`, views `front|back|side(left-facing)|right(mirrored)`, names `devanshi, aahana, villagerA/B/C, pujari, cultist, imp`; `char('aahana','veena')`. 88x124 sprites (before outline +2px), anchor = feet. No baked ground shadow (game draws shear shadows). `ART.portrait(name, expr)` (220x220; exprs neutral/determined/fierce/worried/smile/calm/scared). `ART.sword()` (anchor = grip, blade up), `ART.veena()`.
- User sprites: `window.ASSETS[key]=dataURI`, `await ART.loadAssets()`; processed with chromaKey->crop->resample, stored in `ART.user[key]`, automatically preferred by `ART.char/portrait`. Keys per section 11.
- Effects: `drawMandala(cx,cy,R,t,cols)`, `drawFlame(x,y,h,t,seed,glow)`, `drawTamasurHand(cx,cy,scale,t,open)`, `drawSlash(cx,cy,r,ang,p)`.
- 3D lotus: `ART.drawLotus(t,cx,cy,scale)` (scale about 330 fills a 960x540 title screen).

---

## 17. Session 3 progress log: Phase 3 DONE (Build 1 is playable)

**Delivered:** `aahana.html` (single file, ~140 KB), `README.md`, `build.py`, `src/audio.js`, `src/engine.js`, `src/level1.js`, `src/scenes.js`, `tests/playtest.js` (+ `smoke.js`, `shots2.js`, `profile*.js`, `debug_wave.js`), `screenshots/`. Zip: `aahana_project_phase3.zip`.

**Bundle order (build.py):** cg.js, cg3d.js, art.js, chars.js, audio.js, engine.js, level1.js, scenes.js. (The planned `game.js` was split into three files.)

### Verified by headless playthrough (`NODE_PATH=$(npm root -g) node tests/playtest.js`)
Phase A objective and all 5 diyas via the real E path; eclipse; Bezier camera pan; Rta thread snap; goddess scene; combat unlock; bot clears 3 waves; abduction cutscene; Level 1 `onComplete` fires; death restores HP and restarts the current wave; Interlude 1 (wrong note retry, both rounds, door, note wave) completes. No console errors. Screenshots in `screenshots/`.

### Engine API (`G`, engine.js)
- Loop: `G.start(canvas)`, `G.tick(dt, draw)`, `G.sim(seconds)` (updates only, for tests), `G.render()`. Scene = `{enter, update(dt), draw(), pausable}`; `G.go(scene)` (fade in), `G.transition(scene)` (fade out then go).
- Input: `G.keys`, `G.pressed` (just pressed, cleared each tick), `G.down/hit/eat(...codes)`, `G.axis()`.
- Text: `G.text(str,x,y,{size,color,align,bold,italic,glow,maxW,lh,reveal,alpha})` queued and drawn after `CG.present()` (the only canvas-2D use). Draw order caveat: queued text appears ABOVE the dialogue box, so hide HUD text while `G.dlg` is set.
- Cutscenes: `new G.Script(generator)`; yield a number (seconds, min 1 frame) or a function (wait until true). Helpers `yield* G.say(who,text,expr)`, `yield* G.tween(sec, p=>...)`. Portraits only for devanshi/aahana/pujari; other speakers get a mandala orb (`ORB` table in engine.js).
- `G.Fx` particles (world space), `G.fadeTo(a,speed,cb)`, `G.shake`, `G.flash`, `G.auto` (auto-advance dialogue, test only), `G.god`.
- Test hook: `window.__game = {G, CG, ART, AUD, S, flow, Level1}`. URL params: `?s=level1&p=0..4` (start phase), `?s=interlude1`, `?s=intro`, `&auto=1`, `&god=1`.

### Level 1 (`Level1(startPhase, onComplete)`)
World 1920x1360, prerendered ground Surface blitted by camera. Props y-sorted (painter's). Phases via generator `run(ph)`: 0 A, 1 B, 2 C, 3 D, 4 E; `setup(ph)` fakes the state of earlier phases so any phase can be tested directly. Enemy AI = chase/windup(red flash)/lunge/recover with simple obstacle sliding (fixed a real stuck-behind-fire-pit bug). Player: HP 5, Space attack (0.28 s, hit at 0.10 s, 88 px, +-70 deg, light aim assist), Shift dodge (0.28 s, 464 px/s, invulnerable, 0.7 s cooldown). HUD: diya-flame health, objective, hints, off-screen enemy arrows, minimap (window-to-viewport + Sutherland-Hodgman clipped camera box).
Add Levels 2-5 as new classes in new files (e.g. `src/level2.js`), reuse `Enemy`-style classes (consider moving Enemy/spr/shadow helpers out of level1.js into a shared file first), register in `Scenes.mk`.

### Interlude 1 (`Scenes.Interlude1`)
Generator-driven sound puzzle, rounds of 4 and 5 notes (fixed sequences `SEQS`), keys A S D F, expanding midpoint-circle rings, sine-wave lines between pillars, lock rings, door slide, Tamasur line, veena pose, note sent as a sine wave along a Bezier path. `Scenes.Cards(pages, nextFn)` shows typed story cards on the animated golden Bezier loom.

### Performance (sandbox software Chromium)
Level render ~16-27 ms/frame; lighting pass ~9 ms is the biggest cost (optimised: per-light bounding boxes, incremental row interpolation). Fire glow is one radial instead of three. If a laptop is slow: lower `q` resolution in `CG.lighting` (q=4 -> 6) or skip the vignette.

### Known limits / next steps
1. **Report still outdated** (section 3). Rewrite as .docx around the Aahana story with real screenshots from `screenshots/` (do this next; may be the most urgent deliverable).
2. Characters are procedural placeholders; user has no Gemini sprites yet. Loader is ready (section 11).
3. Not judged: game feel / difficulty (user must playtest). Tunables: enemy speed/windup in `TYPES` (level1.js), player numbers in `updatePlayer`.
4. Build 2: Level 2 Chhaya Van (Vayu's bow: ranged keys F/Q), Mayavi mini-boss, Level 3 Kamal Sarovar + Hall of Gold (Lakshmi's test, chakra), Interlude 2 (The Altered Verse). Then Build 3 (L4 + Interlude 3), Build 4 (L5 co-op split viewports, boss, ending).
5. Audio is synthesised (Karplus-Strong veena + drone + Yaman melody); it only starts after the first key press (browser autoplay rule).

---

## 18. Session 4 progress log: Phase 4 DONE (lean demo build with Level 2)

User asked for "a working demo asap, don't go too deep", so Level 2 was built lean. **Demo flow now:** title -> story cards -> Level 1 -> Interlude 1 -> **Level 2 Chhaya Van** -> end card -> title.

- New file `src/level2.js` (`Level2 extends Level1`; bundle order now ... level1.js, level2.js, scenes.js). `Level1.H` exports shared helpers (Enemy, spr, shadow, viewOf, ease, world sizes). Add `ORB` entry for Vayu in engine.js.
- Level 2: dark procedural forest (noise-tinted ground, Bezier trail, scattered trees as colliders, firefly motes, cold ambient light + point lights), 4 glowing waypoint mandalas (veena song). Beats: Aahana's note -> Vayu gives **bow (F, auto-aims nearest enemy, 0.45 s cooldown, arrows stopped by trees)** -> 2 waves (imps + `Archer` enemies that keep distance and shoot telegraphed arrows) -> **Mayavi mini-boss** (12 HP, teleports every ~4.5 s, spawns up to 3 one-hit illusions that flicker and cast no shadow; real one casts a shadow). Checkpoint respawn at last waypoint. Minimap uses window-to-viewport + Sutherland-Hodgman, same as L1.
- Gotcha fixed: Level1 uses `this.near` as a property, so Level2's helper is named `nearN`.
- Tests: `tests/l2test.js` (headless Level 2 playthrough: bow, waves, boss, no errors), `tests/l2shots.js` (screenshots in `screenshots/l2_*.png`). Level 1 `tests/playtest.js` still passes.
- URL param `?s=level2` jumps straight to Level 2 (`&god=1` for invincibility).
- **Not done / next:** Level 3 (Kamal Sarovar, chakra, Hall of Gold), Interlude 2, Level 4, Interlude 3, Level 5 + ending; project report (.docx) still outdated; Gemini sprites still not supplied (placeholders in use).

---

## 19. Session 5: Level 3 added (lean)

- `src/level3.js` (`Level3 extends Level2`, bundle order ... level2.js, level3.js, scenes.js). Kamal Sarovar: sine-ripple water ground, Bezier stone causeway with island nodes (walkable only on `dryAt`), lotus pads, owl companion. **Vishnu's chakra (Q)**: thrown to nearest enemy, returns, hits both ways. **Hall of Gold** (node 2): 9 coins (heal 1, dim the lake, every 3rd coin wakes 2 imps) vs. a nagas' cage (press E beside it, stay 3 s) -> Lakshmi appears and gives a lotus blessing (revive once). **Naga Queen** boss: HP 10 + coins taken (max 18), melee plus a rotating ring of 8 fire bolts every ~3 s.
- Level 2's arrow-vs-tree check now skipped when `this.lake`. ORB entries added for Vishnu, Lakshmi, Naga Queen.
- Flow: ... Level 2 -> cards -> Level 3 -> "Demo ends here" -> title. `?s=level3` jumps in.
- Tests: `tests/l3test.js` (headless full run, passes, no console errors), `tests/l3shot.js`.
- Next: Interlude 2, Level 4, Interlude 3, Level 5; report; sprites; music change (user asked, direction not yet specified).

---

## 20. Session 6: music

- User supplied a classical track (Brindavan Sarang, sitar/tabla). A 3:30 clip (96 kbps, fades) is `assets/title_music.mp3`; `build.py` inlines it as `window.MUSIC` (HTML is now ~3.5 MB). Title screen and intro cards use mood `'song'` (looped via HTMLAudioElement, fades in/out; starts after the first key press).
- Level music (generated) made more classical: per-level raag (`AUD.setRaag`: Level 1 and Cell = Yaman, Level 2 = Bhairavi, Level 3 = Bhoopali), short alaap-like phrases, and a synthetic **tabla** keeping 16-beat teentaal during fights (`tense` mood). The Cell uses calm mood (no tabla).
- Not audibly verified (headless); user should listen. Also wrote `Aahana_Demo_and_Viva_Prep.md` (demo script, CO mapping, viva Q&A).

## 21. Session 7: music fix
- Song now plays through Web Audio (decodeAudioData of `window.MUSIC`, looped BufferSource + gain) instead of an HTMLAudioElement (kept only as fallback); user reported only one note playing. Any key or mouse click starts audio; **M** toggles music on/off (first M just starts audio); title shows a hint. `AUD.dbg()` reports song state. Verified headless: starts on any key, M mutes/unmutes, fades out when a level starts.
