/* audio.js - procedural sound. Karplus-Strong plucked string (veena), tanpura-like drone,
 * slow Raag Yaman melody, noise-burst hit/swing sounds. Created lazily on first key press.
 * Everything is wrapped in try/catch: the game runs silently if audio fails.
 */
var AUD = (function () {
  'use strict';
  const A = { on: false, mood: 'none' };
  let ctx = null, master = null, melodyT = 0, droneT = 0, last = 3;
  const cache = {};
  const YAMAN = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16]; // semitones above Sa (tivra Ma)
  const SA = 196; // G3
  const RAAGS = { yaman: [0, 2, 4, 6, 7, 9, 11, 12, 14, 16], bhairavi: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15], bhoopali: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] };
  let scale = RAAGS.yaman, song = null, songVol = 0, beat = 0, beatT = 0;

  function ks(freq, dur, decay) { // Karplus-Strong: noise burst through a low-passed delay line
    const key = Math.round(freq * 10) + '_' + dur;
    if (cache[key]) return cache[key];
    const sr = ctx.sampleRate, n = Math.max(2, Math.round(sr / freq)), len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr), out = buf.getChannelData(0), line = new Float32Array(n);
    let seed = 12345;
    for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; line[i] = (seed / 4294967296) * 2 - 1; }
    let p = 0;
    for (let i = 0; i < len; i++) {
      const a = line[p], b = line[(p + 1) % n];
      out[i] = a;
      line[p] = (a + b) * 0.5 * (decay || 0.997);
      p = (p + 1) % n;
    }
    cache[key] = buf; return buf;
  }
  function play(buf, vol, rate, dest) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; s.playbackRate.value = rate || 1; g.gain.value = vol;
    s.connect(g); g.connect(dest || master); s.start();
    return g;
  }
  function noise(dur) {
    const key = 'n' + dur;
    if (cache[key]) return cache[key];
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    cache[key] = buf; return buf;
  }

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
      A.on = true; if (window.MUSIC) loadSong();
    } catch (e) { A.on = false; }
  };
  A.pluck = function (freq, vol) { // veena note
    if (!A.on) return;
    try { play(ks(freq, 2.2, 0.9965), vol === undefined ? 0.5 : vol, 1); } catch (e) { }
  };
  A.hit = function (heavy) {
    if (!A.on) return;
    try {
      const g = play(noise(0.18), heavy ? 0.7 : 0.45, heavy ? 0.6 : 1);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(heavy ? 110 : 160, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18);
      og.gain.setValueAtTime(0.5, ctx.currentTime); og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(og); og.connect(master); o.start(); o.stop(ctx.currentTime + 0.22);
    } catch (e) { }
  };
  A.swing = function () {
    if (!A.on) return;
    try {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise(0.2); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(900, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.18);
      g.gain.value = 0.35; s.connect(f); f.connect(g); g.connect(master); s.start();
    } catch (e) { }
  };
  A.boom = function () { // eclipse / thread snap rumble
    if (!A.on) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(70, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 1.4);
      g.gain.setValueAtTime(0.4, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      o.connect(f); f.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 1.6);
      play(noise(0.18), 0.6, 0.4);
    } catch (e) { }
  };
  A.buzz = function () { // wrong note
    if (!A.on) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 95; g.gain.setValueAtTime(0.18, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.32);
    } catch (e) { }
  };
  A.chime = function () { // success
    if (!A.on) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => A.pluck(f, 0.35), i * 90));
  };
  A.setMood = function (m) { A.mood = m; };
  A.setRaag = function (r) { scale = RAAGS[r] || RAAGS.yaman; last = 3; };
  function tabla(bol) { // synthetic tabla strokes: bass (dha/dhin) = pitch-dropping sine, treble (na/tin) = short bright tone
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), bass = bol === 'dha' || bol === 'dhin';
    o.type = bass ? 'sine' : 'triangle'; o.frequency.setValueAtTime(bass ? 150 : 520, t); o.frequency.exponentialRampToValueAtTime(bass ? 78 : 400, t + 0.18);
    g.gain.setValueAtTime(bass ? 0.2 : 0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + (bass ? 0.4 : 0.16));
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45);
    if (bol === 'dha' || bol === 'tin') { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = 330; g2.gain.setValueAtTime(0.06, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + 0.15); }
  }
  const TAAL = ['dha', 'dhin', 'dhin', 'dha', 'dha', 'dhin', 'dhin', 'dha', 'dha', 'tin', 'tin', 'ta', 'ta', 'dhin', 'dhin', 'dha']; // teentaal, 16 beats
  A.dbg = () => ({ has: !!song, paused: song && song.paused, vol: song && song.volume, t: song && song.currentTime, err: song && song.error && song.error.code, rs: song && song.readyState, sv: songVol });
  let sbuf = null, ssrc = null, sgain = null, sload = 0; // song via Web Audio (same path as the notes, so if you hear notes you hear the song)
  function loadSong() {
    if (sload || !window.MUSIC || !ctx) return; sload = 1;
    try {
      const b64 = window.MUSIC.split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const p = ctx.decodeAudioData(u.buffer, buf => { sbuf = buf; sload = 2; }, () => { sload = 3; });
      if (p && p.catch) p.catch(() => { sload = 3; });
    } catch (e) { sload = 3; }
  }
  A.playSong = function () {
    if (!ctx || !window.MUSIC) return;
    if (sload === 0) loadSong();
    if (sload === 2 && !ssrc) { sgain = ctx.createGain(); sgain.gain.value = 0; sgain.connect(ctx.destination); ssrc = ctx.createBufferSource(); ssrc.buffer = sbuf; ssrc.loop = true; ssrc.connect(sgain); ssrc.start(); }
    if (sload === 3 && !song) { song = new Audio(window.MUSIC); song.loop = true; song.volume = 0; }
    if (song && song.paused) { const p = song.play(); if (p && p.catch) p.catch(() => { }); }
  };
  A.muted = false;
  A.toggleMute = function () { if (!ctx) { A.init(); return; } A.muted = !A.muted; A.toast = 2; if (master) master.gain.value = A.muted ? 0 : 0.55; };
  A.dbg = () => ({ sload, playing: !!ssrc, sv: songVol, muted: A.muted, state: ctx && ctx.state });
  function songTick(dt) {
    const want = A.mood === 'song' && !!window.MUSIC;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (want || ssrc || song) { if (want && (!ssrc || sload === 3) ) A.playSong(); }
    songVol += (want ? 1 : -1) * dt / (want ? 2.5 : 1.8); songVol = Math.max(0, Math.min(1, songVol));
    const v = A.muted ? 0 : 0.8 * songVol;
    if (sgain) sgain.gain.value = v; if (song) { song.volume = v; if (!want && songVol === 0 && !song.paused) song.pause(); }
    if (!want && songVol === 0 && ssrc) { try { ssrc.stop(); } catch (e) { } ssrc = null; }
    if (A.toast > 0) A.toast -= dt;
  }
  A.tick = function (dt) { // call every frame: schedules drone and melody
    if (!A.on) return;
    try { songTick(dt); } catch (e) { }
    if (A.mood === 'none' || A.mood === 'song') return;
    try {
      droneT -= dt; melodyT -= dt;
      const quiet = A.mood === 'tense' ? 1.3 : 1;
      if (A.mood === 'tense') { beatT -= dt; if (beatT <= 0) { beatT = 0.36; tabla(TAAL[beat++ % 16]); } } // tabla keeps time in fights
      if (droneT <= 0) { // tanpura: Pa, Sa, Sa
        droneT = 2.4 * quiet;
        A.pluck(SA * 0.75, 0.16); setTimeout(() => A.pluck(SA * 0.5, 0.18), 600); setTimeout(() => A.pluck(SA * 0.5, 0.14), 1200);
      }
      if (melodyT <= 0) { // generative raag walk: a short phrase of 2-3 notes, the last one ringing longer (like an alaap)
        melodyT = (A.mood === 'tense' ? 2.2 : 1.6) + Math.random() * 2;
        const n = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) setTimeout(() => {
          last = Math.max(0, Math.min(scale.length - 1, last + (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() < 0.25 ? 1 : 0))));
          A.pluck(SA * Math.pow(2, scale[last] / 12), k === n - 1 ? 0.2 : 0.14);
        }, k * 380);
      }
    } catch (e) { }
  };
  A.noteFreq = i => SA * 1.5 * Math.pow(2, [0, 2, 4, 6][i] / 12 + 0); // 4 pillar notes
  if (typeof window !== 'undefined') window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat) A.toggleMute(); });
  return A;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AUD;
