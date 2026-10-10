'use strict';
// ===== Ace-Af team – core: canvas, assets, input, audio =====
const W = 960, H = 540;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let VIEW = { s: 1, ox: 0, oy: 0, dpr: 1 };
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const iw = window.innerWidth, ih = window.innerHeight;
  cv.width = Math.round(iw * dpr); cv.height = Math.round(ih * dpr);
  const s = Math.min(iw / W, ih / H);
  VIEW = { s, ox: (iw - W * s) / 2, oy: (ih - H * s) / 2, dpr };
}
window.addEventListener('resize', resize); resize();
const FONT = 'Rubik, "Arial Hebrew", Arial, sans-serif';
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- assets ----------
const IMG = {}, SND = {};
const IMG_LIST = ['hero_AceAf', 'hero_Daniel', 'hero_Ravid', 'hero_Benjo', 'en_grunt', 'en_knife', 'en_bruiser', 'boss_merchant',
  'face_AceAf', 'face_Daniel', 'face_Ravid', 'face_Benjo', 'face_boss'];
const JPG_LIST = ['bg_market', 'portrait_AceAf', 'portrait_Daniel', 'portrait_Ravid', 'portrait_Benjo'];
// versioned audio files (bump suffix when a file changes so phones don't keep stale copies)
const AUD = {
  music_theme: 'music/theme_v1.mp3', music_stage: 'music/market_loop_v1.mp3', music_boss: 'music/market_boss_v1.mp3', music_sixty: 'music/sixty_v1.mp3',
  stg_win: 'music/stinger_win_v1.mp3', stg_lose: 'music/stinger_lose_v1.mp3', stg_ko: 'music/stinger_ko_v1.mp3',
};
// voice lines by Yaar (recommended takes), file = vo/<line>_y1.mp3
['ace_1', 'ace_2', 'ace_3', 'daniel_1', 'daniel_2', 'daniel_3', 'ravid_1', 'ravid_2', 'ravid_3', 'benjo_1', 'benjo_2', 'benjo_3',
  'boss_1', 'boss_2', 'narr_1', 'narr_2', 'narr_3'].forEach(k => AUD[k] = 'vo/' + k + '_y1.mp3');
['hit_light', 'hit_heavy', 'whoosh', 'chain', 'blade', 'bat', 'crate', 'bottle', 'coin', 'eat', 'super', 'tag', 'ko', 'stomp', 'go', 'hurt']
  .forEach(k => AUD['sfx_' + k] = 'sfx/' + k + '_v1.mp3');
let loadProgress = 0, loadDone = false;
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => { console.warn('img fail', src); res(null); }; i.src = src; }); }
function tinted(img, color) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c;
}
async function loadAll() {
  const jobs = [];
  let total = IMG_LIST.length + JPG_LIST.length + Object.keys(AUD).length, n = 0;
  const tick = () => { n++; loadProgress = n / total; };
  IMG_LIST.forEach(k => jobs.push(loadImg('assets/img/' + k + '.png?v=' + (typeof ART_VER !== 'undefined' ? ART_VER : '1')).then(i => { IMG[k] = i; if (i && !k.startsWith('face')) { IMG[k + '_W'] = tinted(i, '#fff'); IMG[k + '_R'] = tinted(i, '#ff2a2a'); IMG[k + '_K'] = tinted(i, '#000'); } tick(); })));
  JPG_LIST.forEach(k => jobs.push(loadImg('assets/img/' + k + '.jpg?v=' + (typeof ART_VER !== 'undefined' ? ART_VER : '1')).then(i => { IMG[k] = i; tick(); })));
  Object.entries(AUD).forEach(([k, p]) => jobs.push(fetch('assets/audio/' + p).then(r => { if (!r.ok) throw new Error(p); return r.arrayBuffer(); })
    .then(b => AC.decodeAudioData(b)).then(buf => { SND[k] = buf; tick(); }).catch(e => { console.warn('audio fail', p, e && e.message); tick(); })));
  try { await document.fonts.load('800 40px Rubik', 'אבג TLV'); await document.fonts.load('500 20px Rubik', 'אבג'); } catch (e) { }
  await Promise.all(jobs); loadDone = true;
}

// ---------- audio ----------
const AC = new (window.AudioContext || window.webkitAudioContext)();
const master = AC.createGain(); master.connect(AC.destination);
const musicBus = AC.createGain(); musicBus.gain.value = 0.42; musicBus.connect(master);
const sfxBus = AC.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
const voBus = AC.createGain(); voBus.gain.value = 1.2; voBus.connect(master);
let muted = localStorage.getItem('aceaf_mute') === '1'; master.gain.value = muted ? 0 : 1;
function setMute(m) { muted = m; master.gain.value = m ? 0 : 1; localStorage.setItem('aceaf_mute', m ? '1' : '0'); }
function unlockAudio() { if (AC.state !== 'running') AC.resume(); }
let curMusic = null;
function playMusic(key, fade = 1.0, loop = true) {
  if (curMusic && curMusic.key === key) return;
  const old = curMusic;
  if (old) { old.g.gain.setTargetAtTime(0, AC.currentTime, fade / 3); setTimeout(() => { try { old.src.stop(); } catch (e) { } }, fade * 1500); }
  curMusic = null;
  const buf = SND[key]; if (!buf) return;
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = loop;
  const lp = MUSIC_LOOPS[key]; if (lp && loop) { src.loopStart = lp[0]; src.loopEnd = lp[1]; }
  const g = AC.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, AC.currentTime, fade / 3);
  src.connect(g); g.connect(musicBus); src.start(0, lp && loop ? lp[0] : 0);
  curMusic = { key, src, g };
}
function stopMusic(fade = 0.6) { if (curMusic) { const o = curMusic; o.g.gain.setTargetAtTime(0, AC.currentTime, fade / 3); setTimeout(() => { try { o.src.stop(); } catch (e) { } }, fade * 1500); curMusic = null; } }
function stinger(k, vol = 0.9) {
  const buf = SND['stg_' + k]; if (!buf || AC.state !== 'running') return;
  const s = AC.createBufferSource(); s.buffer = buf; const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}
// seamless loop points (sec) - files carry 0.5s pre/post-roll so decoder offsets can't open a gap
const MUSIC_LOOPS = { music_stage: [0.50000, 60.50036], music_boss: [0.50000, 45.30290] };
const sfxLast = {};
function sfx(k, vol = 1, rate = 1) {
  const buf = SND['sfx_' + k]; if (!buf || AC.state !== 'running') return;
  const now = AC.currentTime; if (sfxLast[k] && now - sfxLast[k] < 0.035) return; sfxLast[k] = now;
  const s = AC.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * rnd(0.94, 1.06);
  const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(sfxBus); s.start();
}
let curVo = null; let subtitle = null; // {text, who, t}
function voice(k, text, who) {
  if (curVo) { try { curVo.stop(); } catch (e) { } curVo = null; }
  const buf = SND[k];
  subtitle = { text, who, t: buf ? buf.duration + 0.6 : 2.2 };
  if (!buf || AC.state !== 'running') return;
  const s = AC.createBufferSource(); s.buffer = buf; s.connect(voBus); s.start(); curVo = s;
  // duck music
  musicBus.gain.setTargetAtTime(0.18, AC.currentTime, 0.05); musicBus.gain.setTargetAtTime(0.42, AC.currentTime + buf.duration, 0.2);
  s.onended = () => { if (curVo === s) curVo = null; };
}

// ---------- input ----------
const keys = {}; const pressed = {};
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'attack', KeyZ: 'attack', KeyK: 'jump', KeyX: 'jump', Space: 'jump', KeyL: 'special', KeyC: 'special',
  KeyQ: 'switch', ShiftLeft: 'switch', ShiftRight: 'switch', Tab: 'switch', Digit1: 'c1', Digit2: 'c2', Digit3: 'c3', Digit4: 'c4',
  Numpad1: 'c1', Numpad2: 'c2', Numpad3: 'c3', Numpad4: 'c4',
  Enter: 'ok', NumpadEnter: 'ok', Escape: 'pause', KeyP: 'pause', KeyM: 'mute' };
window.addEventListener('keydown', e => {
  unlockAudio(); const a = KEYMAP[e.code]; if (!a) return; e.preventDefault();
  if (!keys[a]) pressed[a] = true; keys[a] = true; usingTouch = false;
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) { keys[a] = false; e.preventDefault(); } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function consume(a) { if (pressed[a]) { pressed[a] = false; return true; } return false; }
function clearPressed() { for (const k in pressed) pressed[k] = false; }

// touch: virtual joystick + buttons (in game coords)
let usingTouch = IS_TOUCH;
const joy = { id: null, bx: 0, by: 0, x: 0, y: 0, dx: 0, dy: 0 };
const BTN = [
  { a: 'attack', x: 860, y: 450, r: 50, label: 'מכה' },
  { a: 'jump', x: 760, y: 485, r: 36, label: 'קפיצה' },
  { a: 'special', x: 880, y: 340, r: 38, label: 'מיוחד' },
  { a: 'switch', x: 770, y: 385, r: 32, label: 'החלף' },
];
const btnHeld = {}; const ptrBtn = {};
let taps = []; // generic taps for UI {x,y}
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - VIEW.ox) / VIEW.s, y: (e.clientY - r.top - VIEW.oy) / VIEW.s }; }
let touchControlsActive = false;
cv.addEventListener('pointerdown', e => {
  unlockAudio(); e.preventDefault();
  if (e.pointerType === 'touch') usingTouch = true;
  const p = toGame(e);
  if (touchControlsActive && e.pointerType !== 'mouse') {
    for (const b of BTN) { if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 14) { ptrBtn[e.pointerId] = b.a; btnHeld[b.a] = true; pressed[b.a] = true; return; } }
    if (p.x < W * 0.5 && p.y > 120 && joy.id === null) { joy.id = e.pointerId; joy.bx = p.x; joy.by = p.y; joy.x = p.x; joy.y = p.y; joy.dx = joy.dy = 0; return; }
  }
  taps.push(p);
  try { cv.setPointerCapture(e.pointerId); } catch (_) { }
}, { passive: false });
cv.addEventListener('pointermove', e => {
  if (e.pointerId === joy.id) { const p = toGame(e); let dx = p.x - joy.bx, dy = p.y - joy.by; const d = Math.hypot(dx, dy), m = 60;
    if (d > m) { joy.bx += dx * (1 - m / d) * 0.6; joy.by += dy * (1 - m / d) * 0.6; dx = p.x - joy.bx; dy = p.y - joy.by; }
    joy.x = p.x; joy.y = p.y; joy.dx = clamp(dx / m, -1, 1); joy.dy = clamp(dy / m, -1, 1); }
}, { passive: false });
function ptrUp(e) {
  if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; }
  const a = ptrBtn[e.pointerId]; if (a) { btnHeld[a] = false; delete ptrBtn[e.pointerId]; }
}
cv.addEventListener('pointerup', ptrUp); cv.addEventListener('pointercancel', ptrUp);
document.addEventListener('contextmenu', e => e.preventDefault());
function inputAxis() {
  let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (joy.id !== null) { x = Math.abs(joy.dx) > 0.22 ? joy.dx : 0; y = Math.abs(joy.dy) > 0.28 ? joy.dy : 0; }
  return { x, y };
}
function isHeld(a) { return keys[a] || btnHeld[a]; }
function goFullscreen() {
  const el = document.documentElement;
  const rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq && !document.fullscreenElement) { Promise.resolve(rq.call(el)).then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { }); }
}

// ---------- drawing helpers ----------
function txt(s, x, y, size, color = '#fff', align = 'center', weight = 800, stroke = '#000', sw = 0) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.direction = /[\u0590-\u05FF]/.test(s) ? 'rtl' : 'ltr';
  if (sw) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.direction = 'ltr';
}
function wrapLines(s, maxW, size, weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`; const words = s.split(' '); const out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function hitRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
