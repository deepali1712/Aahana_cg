# Aahana (Computer Graphics mini project) - Build 1

**Run it:** double-click `aahana.html` (Chrome or Edge). Nothing to install, works offline. Press ENTER on the title screen.

**Controls:** WASD / arrows = move, Space = sword, Shift = dodge roll, **F = bow (Level 2), Q = chakra (Level 3)**, E = interact / talk, Enter = advance dialogue, Esc = pause. In "The Cell" use **A S D F**.
In "The Cell" (Aahana's puzzle) use **A S D F** to repeat the pillar notes.

**What is in this demo (Build 3):** title -> story cards -> Level 1 Saraswati Ghat -> Interlude 1 The Cell -> Level 2 Chhaya Van (bow on F, Mayavi) -> **Level 3 Kamal Sarovar** (chakra on Q, Hall of Gold, Naga Queen) -> end card.

**Everything on screen is drawn by our own graphics library** (`src/cg.js`, `src/cg3d.js`): Bresenham/DDA lines, midpoint circles, scanline polygon fill, flood fill, 2D/3D transforms, Cohen-Sutherland and Sutherland-Hodgman clipping, window-to-viewport (minimap), Bezier curves/surfaces (camera path, Rta thread, lotus petals), Gouraud shading and z-buffer (3D lotus), point-light lighting, painter's algorithm (y-sorting).

**Rebuild after editing:** `python3 build.py` (writes `aahana.html`). Unit tests: `node tests/test_cg.js`. Headless playthrough: `node tests/playtest.js` (needs Playwright).

**Custom sprites:** drop PNGs named like `devanshi_front.png`, `devanshi_side.png`, `aahana_front.png`... into `assets/` (flat magenta/green background) and rebuild. See HANDOVER.md section 11.

Team: Pranit Waghmare (24101A0053), Deepali Ganachari (25101A2001). Guide: Dr. Santosh Tamboli.
