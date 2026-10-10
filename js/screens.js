'use strict';
// ===== Ace-Af team – screens, HUD, loop =====
const GAME_TITLE = 'Ace-Af team';
const APP = { state: 'loading', t: 0, sel: 0, mode: 'story', menu: 0, comic: null, results: null, paused: false, cardBlob: null, cardURL: null };
const COMIC_INTRO = [
  { bg: 'dark', chars: [], cap: 'תל אביב. לילה אחד.', lines: [{ who: '', text: 'תאגיד "מגדלי עזאזל" קונה את העיר – רחוב אחרי רחוב. מי שלא מוכר – נעלם.' }] },
  { bg: 'fire', chars: ['Benjo'], cap: 'המוסך של Benjo עלה באש.', lines: [{ who: 'Benjo', text: 'עכשיו אני כועס!', vo: 'benjo_2' }] },
  { bg: 'night', chars: ['AceAf', 'Daniel'], cap: 'לבר של Ace-Af הגיעו "גובים". הסטודיו של Daniel נשרף.', lines: [{ who: 'Ace-Af', text: 'הגיע הזמן לסדר חשבון.', vo: 'ace_1' }, { who: 'Daniel', text: 'הם בחרו בסטודיו הלא נכון.' }] },
  { bg: 'purple', chars: ['Ravid'], cap: 'Ravid מצאה את הרשימה. כל השמות מובילים לגובה אחד – בשוק.', lines: [{ who: 'Ravid', text: 'בשקט.', vo: 'ravid_1' }] },
  { bg: 'dawn', chars: ['AceAf', 'Daniel', 'Ravid', 'Benjo'], cap: 'ארבעה זרים. אויב אחד.', lines: [{ who: '', text: 'יוצאים לשוק.' }] },
];
const COMIC_OUTRO = [
  { bg: 'fire', chars: ['boss'], cap: 'הסוחר על הרצפה.', lines: [{ who: 'הסוחר', text: 'הדוכן סגור... בינתיים.' }] },
  { bg: 'night', chars: ['Ravid', 'AceAf'], cap: 'בכיס שלו: כרטיס ביקור של "מגדלי עזאזל"... וכתובת בנמל יפו.', lines: [{ who: 'Ravid', text: 'הנמל. מחר בלילה.' }, { who: 'Ace-Af', text: 'העיר שלנו.', vo: 'ace_3' }] },
  { bg: 'dawn', chars: ['Daniel', 'Benjo'], cap: 'פרק 1 · שלב 2 – הנמל', lines: [{ who: '', text: 'בקרוב...' }] },
];
function startComic(pages, onDone) { APP.state = 'comic'; APP.comic = { pages, p: 0, l: 0, t: 0, onDone }; playComicLine(); }
function playComicLine() { const c = APP.comic, pg = c.pages[c.p], ln = pg.lines[c.l]; c.t = 0; if (ln && ln.vo) voice(ln.vo, ln.text, ln.who); else if (curVo) { try { curVo.stop(); } catch (e) { } } subtitle = null; }
function comicNext() { const c = APP.comic; const pg = c.pages[c.p]; if (c.l < pg.lines.length - 1) c.l++; else { c.p++; c.l = 0; if (c.p >= c.pages.length) { const f = c.onDone; APP.comic = null; f(); return; } } playComicLine(); }
function startGame() { newGame(APP.sel, APP.mode); APP.state = 'play'; APP.paused = false; touchControlsActive = true; clearPressed(); taps.length = 0; }
function endStage() {
  touchControlsActive = false; const win = G.win;
  const sixty = G.mode === 'sixty';
  APP.results = { mode: G.mode, win, score: G.score + (win && !sixty ? Math.max(0, Math.round(3000 - G.time * 10)) : 0), time: sixty ? 60 - G.timeLeft : G.time, maxCombo: G.maxCombo, kos: G.kos, cash: G.cash, card: G.card, hero: CHARS[G.startChar].name, team: G.team.map(t => ({ hp: t.hp, down: t.down })) };
  const bk = sixty ? 'aceaf_best60' : 'aceaf_best';
  const best = +(localStorage.getItem(bk) || 0); APP.results.best = Math.max(best, APP.results.score); localStorage.setItem(bk, APP.results.best);
  APP.results.newBest = APP.results.score > best;
  if (!win) stinger('lose'); else if (sixty) stinger('win');
  if (win && !sixty) startComic(COMIC_OUTRO, showResults); else showResults();
}
function showResults() { APP.state = 'results'; playMusic('music_theme'); makeScoreCard(); }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

// ---------- score card (canvas -> PNG) ----------
function makeScoreCard() {
  const R = APP.results; const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#2a0d14'); g.addColorStop(1, '#0d0710'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const bgm = IMG.bg_market; if (bgm) { x.globalAlpha = 0.5; const sh = bgm.height, sw = sh * 1080 / 700; x.drawImage(bgm, (bgm.width - sw) * 0.35, 0, sw, sh, 0, 0, 1080, 700); x.globalAlpha = 1; }
  const six = R.mode === 'sixty';
  const T = (s, X, Y, sz, col = '#fff', w = 800, al = 'center') => { x.font = `${w} ${sz}px ${FONT}`; x.textAlign = al; x.textBaseline = 'middle'; x.direction = /[\u0590-\u05FF]/.test(s) ? 'rtl' : 'ltr'; x.lineWidth = sz / 7; x.strokeStyle = '#000'; x.lineJoin = 'round'; x.strokeText(s, X, Y); x.fillStyle = col; x.fillText(s, X, Y); };
  T(GAME_TITLE, 540, 110, 110, '#ffd23f', 900); T(six ? 'אתגר 60 שניות · השוק' : 'פרק 1 · השוק', 540, 205, 46, six ? '#ff8a3d' : '#fff', 700);
  const heroes = ['AceAf', 'Daniel', 'Ravid', 'Benjo']; heroes.forEach((h, i) => { const im = IMG['hero_' + h]; if (!im) return; const hh = 420, ww = im.width * hh / im.height; x.drawImage(im, 135 + i * 270 - ww / 2, 250, ww, hh); });
  x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(60, 700, 960, 520);
  T(six ? (R.win ? 'שרדתם 60 שניות!' : 'הצוות נפל...') : (R.win ? 'השלב הושלם!' : 'הצוות נפל...'), 540, 760, 64, R.win ? '#7dff8a' : '#ff6b6b', 900);
  T(`${R.score.toLocaleString('en-US')}`, 540, 870, 120, '#ffd23f', 900); T('ניקוד', 540, 950, 40, '#ddd', 600);
  const st = six ? [['נוקאאוטים', String(R.kos)], ['רצף מקסימלי', '×' + R.maxCombo], ['כסף', '₪' + R.cash], ['לוחם פותח', R.hero]]
    : [['זמן', fmtTime(R.time)], ['רצף מקסימלי', '×' + R.maxCombo], ['נוקאאוטים', String(R.kos)], ['קלף לוחם', R.card ? '1/60 ★' : '0/60']];
  st.forEach((s, i) => { const X = 920 - i * 260; T(s[1], X - 10, 1060, 54, '#fff', 900); T(s[0], X - 10, 1120, 30, '#bbb', 600); });
  T(six ? 'שברו את השיא שלי ב-60 שניות!' : 'מי משיג יותר?', 540, 1280, 44, '#fff', 700);
  c.toBlob(b => { APP.cardBlob = b; if (APP.cardURL) URL.revokeObjectURL(APP.cardURL); APP.cardURL = URL.createObjectURL(b); const im = new Image(); im.src = APP.cardURL; APP.cardImg = im; }, 'image/png');
}
async function shareCard() {
  if (!APP.cardBlob) return;
  const fname = APP.results.mode === 'sixty' ? 'aceaf-team-60s.png' : 'aceaf-team-score.png';
  const file = new File([APP.cardBlob], fname, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: GAME_TITLE, text: `${GAME_TITLE} – ${APP.results.score} נקודות${APP.results.mode === 'sixty' ? ' באתגר 60 שניות' : ''}. מי משיג יותר?` }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = APP.cardURL; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
  APP.toast = { text: 'כרטיס הציון נשמר', t: 2 };
}

// ---------- HUD ----------
const HUD_SLOTS = () => CHARS.map((c, i) => ({ i, x: W - 52 - i * 86, y: 44 }));
function drawHUD() {
  // team (RTL: first slot at right)
  HUD_SLOTS().forEach(s => {
    const tm = G.team[s.i], C = CHARS[s.i], act = s.i === G.active, r = act ? 30 : 23;
    ctx.save(); ctx.globalAlpha = tm.down ? 0.55 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(s.x - 40, s.y - 38, 80, 86, 10); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x, s.y - 2, r, 0, 7); ctx.save(); ctx.clip(); if (IMG['face_' + C.id]) ctx.drawImage(IMG['face_' + C.id], s.x - r, s.y - 2 - r, r * 2, r * 2); if (tm.down) { ctx.fillStyle = 'rgba(40,40,40,0.6)'; ctx.fillRect(s.x - r, s.y - 2 - r, r * 2, r * 2); } ctx.restore();
    ctx.lineWidth = act ? 4 : 2; ctx.strokeStyle = act ? C.color : '#888'; if (tm.meter >= 100 && !tm.down) { ctx.strokeStyle = `hsl(${(G.t * 400) % 360},100%,60%)`; ctx.lineWidth = 4; } ctx.beginPath(); ctx.arc(s.x, s.y - 2, r, 0, 7); ctx.stroke();
    if (tm.down) { ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(s.x - 14, s.y - 16); ctx.lineTo(s.x + 14, s.y + 12); ctx.moveTo(s.x + 14, s.y - 16); ctx.lineTo(s.x - 14, s.y + 12); ctx.stroke(); }
    const bw = 68, bx = s.x - bw / 2; ctx.fillStyle = '#300'; ctx.fillRect(bx, s.y + 31, bw, 7); ctx.fillStyle = tm.hp > 35 ? '#4cd964' : '#ff4757'; ctx.fillRect(bx, s.y + 31, bw * tm.hp / tm.max, 7);
    ctx.fillStyle = '#222'; ctx.fillRect(bx, s.y + 40, bw, 5); ctx.fillStyle = tm.meter >= 100 ? '#ffd23f' : '#c9a227'; ctx.fillRect(bx, s.y + 40, bw * tm.meter / 100, 5);
    txt(usingTouch ? C.name : `${s.i + 1} ${C.name}`, s.x, s.y - 30 + (act ? -4 : 0), 11, '#fff', 'center', 700, '#000', 3);
    ctx.restore();
  });
  // score / cash (left)
  txt(`ניקוד ${G.score.toLocaleString('en-US')}`, 18, 26, 22, '#ffd23f', 'left', 900, '#000', 5);
  txt(`₪${G.cash}`, 18, 54, 20, '#7dff8a', 'left', 800, '#000', 4);
  if (usingTouch) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(16, 72, 40, 34, 8); ctx.fill(); txt('II', 36, 89, 18, '#fff', 'center', 900); }
  if (G.mode === 'sixty') { const tl = Math.ceil(G.timeLeft), hot = G.timeLeft <= 10; const k = hot ? 1 + 0.15 * Math.max(0, Math.sin(G.t * 12)) : 1;
    txt(String(tl), W / 2 - 10, 34, 44 * k, hot ? '#ff4040' : '#fff', 'center', 900, '#000', 7);
    if (G.countdown > 0) { const n = Math.ceil(G.countdown - 0.4); const f = (G.countdown - 0.4) % 1; txt(n > 0 ? String(n) : 'קדימה!', W / 2, H / 2 - 40, (n > 0 ? 140 : 90) * (1 + f * 0.3), '#ffd23f', 'center', 900, '#000', 12);
      txt('אתגר 60 שניות – כמה שיותר נקודות!', W / 2, H / 2 + 50, 26, '#fff', 'center', 800, '#000', 6); } }
  else txt(fmtTime(G.time), W / 2 - 10, 22, 20, '#fff', 'center', 800, '#000', 4);
  if (G.combo >= 2) { const k = 1 + Math.max(0, G.comboT - 1.4) * 0.8; txt(`רצף ×${G.combo}`, 120, 140, 30 * k, G.combo >= 10 ? '#ff5a5a' : '#fff', 'center', 900, '#000', 6); }
  if (G.P.weapon) txt(`${G.P.weapon.type === 'pipe' ? 'צינור' : 'בקבוק'} (${G.P.weapon.uses})`, W - 60, 118, 16, '#ddd', 'center', 700, '#000', 4);
  // boss bar
  const b = G.boss; if (b && b.st !== 'enter' && !G.introCard) { const bw = 360, bx = W / 2 - bw / 2 - 10, by = 46; ctx.fillStyle = 'rgba(0,0,0,0.6)'; rrect(bx - 50, by - 16, bw + 64, 36, 8); ctx.fill();
    if (IMG.face_boss) ctx.drawImage(IMG.face_boss, bx - 46, by - 14, 32, 32); ctx.fillStyle = '#400'; ctx.fillRect(bx, by, bw, 12); ctx.fillStyle = G.bossPhase === 2 ? '#ff2a2a' : '#ff8c1a'; ctx.fillRect(bx, by, bw * Math.max(0, b.hp) / b.max, 12);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * 0.5 - 1, by - 2, 2, 16); txt('הסוחר', bx + bw - 4, by - 8, 13, '#fff', 'right', 800, '#000', 3); }
  // GO arrow
  if (G.goT > 0 && Math.floor(G.t * 3) % 2 === 0) { txt('קדימה', W - 120, 250, 40, '#ffd23f', 'center', 900, '#000', 7); txt('➜', W - 120, 300, 64, '#ffd23f', 'center', 900, '#000', 7); }
  if (G.banner) { const bn = G.banner; const sz = bn.big ? 76 : bn.small ? 28 : 46; txt(bn.text, W / 2, bn.big ? H / 2 - 30 : (bn.small ? 205 : 170), sz, bn.big ? '#ffd23f' : '#fff', 'center', 900, '#000', bn.big ? 10 : 7); }
}
function drawSubtitle() {
  if (!subtitle) return; const s = subtitle; const line = s.who ? `${s.who}: ${s.text}` : s.text;
  ctx.font = `700 22px ${FONT}`; const w = Math.min(W - 80, ctx.measureText(line).width + 40); const y = touchControlsActive && usingTouch ? 196 : H - 52;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; rrect(W / 2 - w / 2, y - 22, w, 44, 12); ctx.fill(); txt(line, W / 2, y, 22, '#fff', 'center', 700);
}
function drawTouch() {
  if (!usingTouch || !touchControlsActive) return;
  ctx.save();
  if (joy.id !== null) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(joy.bx, joy.by, 62, 0, 7); ctx.fill(); ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(joy.bx + joy.dx * 50, joy.by + joy.dy * 50, 28, 0, 7); ctx.fill(); }
  else { ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(130, 430, 62, 0, 7); ctx.fill(); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(130, 430, 28, 0, 7); ctx.fill(); }
  const tm = TM(), ready = tm.meter >= 100;
  BTN.forEach(b => { const held = btnHeld[b.a]; ctx.globalAlpha = held ? 0.75 : 0.45; ctx.fillStyle = b.a === 'special' && ready ? `hsl(${(G.t * 400) % 360},90%,55%)` : b.a === 'attack' ? '#ff3b4a' : '#222';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    if (b.a === 'special' && G.P.spCd > 0 && !ready) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.P.spCd / CH().sp.cd); ctx.fill(); }
    ctx.globalAlpha = 1; txt(b.a === 'special' && ready ? 'סופר!' : b.label, b.x, b.y, b.r > 40 ? 20 : 15, '#fff', 'center', 800, '#000', 3); });
  ctx.restore();
}
function drawCine() {
  const c = G.cine; if (!c) return; const C = CHARS[c.ci]; const k = clamp(c.t / 0.25, 0, 1), out = clamp((c.t - c.dur + 0.2) / 0.2, 0, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.65 * (1 - out)})`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(lerp(W + 200, 0, k) - out * W, 0); ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(W, 110); ctx.lineTo(W, 390); ctx.lineTo(0, 430); ctx.closePath(); ctx.fillStyle = C.color; ctx.fill(); ctx.save(); ctx.clip();
  for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(((i * 97 + c.t * 1600) % (W + 200)) - 100, 120 + i * 21, 160, 4); }
  const pi = IMG['portrait_' + C.id]; if (pi) { const ph = 420, pw = pi.width * ph / pi.height; ctx.drawImage(pi, W - pw - 40 + (1 - k) * 80, 60, pw, ph); }
  ctx.restore(); txt(c.name, 300, 270, 72, '#fff', 'center', 900, '#000', 10); txt(C.name, 300, 340, 30, '#000', 'center', 900); ctx.restore();
}
function drawIntroCard() {
  const c = G.introCard; if (!c) return; const k = clamp((3.6 - c.t) / 0.35, 0, 1);
  ctx.fillStyle = `rgba(20,0,0,${0.7 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate((1 - k) * -W, 0); ctx.fillStyle = '#b3121f'; ctx.beginPath(); ctx.moveTo(0, 170); ctx.lineTo(W, 140); ctx.lineTo(W, 360); ctx.lineTo(0, 390); ctx.fill();
  if (IMG.boss_merchant) { const hh = 360, ww = IMG.boss_merchant.width * hh / IMG.boss_merchant.height; ctx.drawImage(IMG.boss_merchant, 110, 70, ww, hh); }
  txt('הסוחר', W - 280, 235, 96, '#ffd23f', 'center', 900, '#000', 12); txt('מלך הדוכנים · מיני-בוס', W - 280, 315, 30, '#fff', 'center', 800, '#000', 6); ctx.restore();
}

// ---------- screens ----------
function drawBackdrop(dim = 0.55, scroll = 0) {
  const bb = IMG.bg_market; if (bb) { const bw = bb.width * H / bb.height; const px = scroll % (bw * 2); for (let i = -1; i < 3; i++) { const x = i * bw - px; ctx.save(); if (i % 2 !== 0) { ctx.translate(x + bw, 0); ctx.scale(-1, 1); ctx.drawImage(bb, 0, 0, bw, H); } else ctx.drawImage(bb, x, 0, bw, H); ctx.restore(); } }
  ctx.fillStyle = `rgba(10,4,8,${dim})`; ctx.fillRect(0, 0, W, H);
}
const TITLE_BTNS = () => [{ id: 'mute', x: 20, y: 20, w: 50, h: 44 }, ...(IS_TOUCH ? [{ id: 'fs', x: 80, y: 20, w: 50, h: 44 }] : [])];
function drawTitle() {
  drawBackdrop(0.5, APP.t * 20);
  const g = ctx.createLinearGradient(0, 260, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)'); ctx.fillStyle = g; ctx.fillRect(0, 260, W, H - 260);
  ['AceAf', 'Daniel', 'Ravid', 'Benjo'].forEach((h, i) => { const C = CHARS[i]; const b = Math.sin(APP.t * 3 + i) * 0.015; drawSprite('hero_' + h, W - 160 - i * 213, 548, 262, C.artFace, C.artFace, { sy: 1 + b, sx: 1 - b / 2 }); });
  const sc = 1 + Math.sin(APP.t * 2) * 0.02; ctx.save(); ctx.translate(W / 2, 92); ctx.scale(sc, sc); ctx.rotate(-0.03);
  txt(GAME_TITLE, 0, 0, 92, '#ffd23f', 'center', 900, '#3a0000', 16); ctx.restore();
  txt('פרק 1: השוק', W / 2, 160, 30, '#fff', 'center', 800, '#000', 6);
  MENU_BTNS().forEach((b, i) => { const sel = APP.menu === i; const k = sel ? 1 + Math.sin(APP.t * 5) * 0.03 : 1; ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(k, k);
    ctx.fillStyle = sel ? b.col : 'rgba(0,0,0,0.6)'; rrect(-b.w / 2, -b.h / 2, b.w, b.h, 14); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = sel ? '#fff' : b.col; ctx.stroke();
    txt(b.label, 0, -6, 26, '#fff', 'center', 900, '#000', 4); txt(b.sub, 0, 18, 14, '#eee', 'center', 600); ctx.restore(); });
  const b60 = +(localStorage.getItem('aceaf_best60') || 0); if (b60) txt(`שיא 60 שניות: ${b60.toLocaleString('en-US')}`, W / 2, 288, 15, '#ffd23f', 'center', 700, '#000', 3);
  if (!IS_TOUCH) txt('חצים/WASD – תזוזה · J – מכה · K – קפיצה · L – מיוחד/סופר · Q או 1-4 – החלפת דמות · M – שקט', W / 2, H - 16, 15, '#ddd', 'center', 600, '#000', 3);
  else txt('לשחק לרוחב · ג\'ויסטיק משמאל, כפתורים מימין', W / 2, H - 16, 15, '#ddd', 'center', 600, '#000', 3);
  drawCornerBtns();
}
const MENU_BTNS = () => [{ id: 'story', x: W / 2 + 10, y: 196, w: 230, h: 66, label: 'מצב סיפור', sub: 'פרק 1 · השוק + בוס', col: '#ff3b4a' },
  { id: 'sixty', x: W / 2 - 240, y: 196, w: 230, h: 66, label: 'אתגר 60 שניות', sub: 'כמה שיותר נקודות', col: '#ff8a1e' }];
function chooseMode(i) { APP.menu = i; APP.mode = i === 1 ? 'sixty' : 'story'; if (IS_TOUCH) goFullscreen(); APP.state = 'select'; playMusic('music_theme'); clearPressed(); taps.length = 0; }
function drawCornerBtns() {
  TITLE_BTNS().forEach(b => { ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(b.x, b.y, b.w, b.h, 10); ctx.fill(); txt(b.id === 'mute' ? (muted ? '🔇' : '🔊') : '⛶', b.x + b.w / 2, b.y + b.h / 2 + 1, 22, '#fff', 'center', 700); });
}
function cornerTap(p) { for (const b of TITLE_BTNS()) if (hitRect(p, b.x, b.y, b.w, b.h)) { if (b.id === 'mute') setMute(!muted); else goFullscreen(); return true; } return false; }
const SEL_CARDS = () => CHARS.map((c, i) => ({ i, x: W - 30 - (i + 1) * 222 + 8, y: 70, w: 210, h: 380 }));
function drawSelect() {
  drawBackdrop(0.75, 0);
  txt(APP.mode === 'sixty' ? 'אתגר 60 שניות · בחרו לוחם' : 'בחרו לוחם פותח', W / 2, 36, 34, '#ffd23f', 'center', 900, '#000', 7);
  txt('מחליפים תוך כדי קרב (החלפה באמצע רצף = מתקפת צוות) · הולכים לתוך אויב = תפיסה וזריקה', W / 2, 470, 17, '#fff', 'center', 700, '#000', 4);
  SEL_CARDS().forEach(cd => {
    const C = CHARS[cd.i], sel = APP.sel === cd.i;
    ctx.save(); ctx.fillStyle = sel ? 'rgba(40,10,15,0.92)' : 'rgba(0,0,0,0.6)'; rrect(cd.x, cd.y, cd.w, cd.h, 14); ctx.fill(); ctx.lineWidth = sel ? 5 : 2; ctx.strokeStyle = sel ? C.color : '#555'; ctx.stroke();
    ctx.save(); rrect(cd.x, cd.y, cd.w, cd.h, 14); ctx.clip(); const b = sel ? Math.sin(APP.t * 4) * 0.02 : 0; drawSprite('hero_' + C.id, cd.x + cd.w / 2, cd.y + 238, 225, C.artFace, C.artFace, { sy: 1 + b, glow: sel ? C.color : null }); ctx.restore();
    txt(C.name, cd.x + cd.w / 2, cd.y + 258, 26, sel ? C.color : '#fff', 'center', 900, '#000', 5);
    txt(C.style, cd.x + cd.w / 2, cd.y + 286, 14, '#ddd', 'center', 600);
    txt('נשק: ' + C.weapon, cd.x + cd.w / 2, cd.y + 306, 14, '#ddd', 'center', 600);
    txt('סופר: ' + C.superName, cd.x + cd.w / 2, cd.y + 326, 14, '#ffd23f', 'center', 700);
    [['מהירות', C.stat.spd], ['כוח', C.stat.pow]].forEach((s, k) => { const yy = cd.y + 348 + k * 16; txt(s[0], cd.x + cd.w - 16, yy, 12, '#bbb', 'right', 600); for (let j = 0; j < 5; j++) { ctx.fillStyle = j < s[1] ? C.color : '#333'; ctx.fillRect(cd.x + cd.w - 80 - j * 22, yy - 5, 18, 10); } });
    ctx.restore();
  });
  const bx = W / 2 - 120, by = 488; ctx.fillStyle = '#ff3b4a'; rrect(bx, by, 240, 46, 14); ctx.fill(); txt('יוצאים לקרב!', W / 2, by + 23, 26, '#fff', 'center', 900, '#000', 4);
  drawCornerBtns();
}
const BG_TINT = { dark: ['#0a0610', '#2a0d14'], fire: ['#3a0b00', '#b3361b'], night: ['#08101e', '#1d2b4a'], purple: ['#14061f', '#4b1f6b'], dawn: ['#2a1020', '#f08a4b'] };
function drawComic() {
  const c = APP.comic; if (!c) return; const pg = c.pages[c.p], ln = pg.lines[c.l]; c.t += 1 / 60;
  const [a, b] = BG_TINT[pg.bg] || BG_TINT.dark; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (IMG.bg_market) { ctx.globalAlpha = 0.28; ctx.drawImage(IMG.bg_market, 0, 0, IMG.bg_market.width / 2, IMG.bg_market.height, 0, 0, W, H); ctx.globalAlpha = 1; }
  // halftone
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 14) for (let x = (y / 14 % 2) * 7; x < W; x += 14) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
  // panel frame
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, W - 28, H - 28); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28);
  const n = pg.chars.length; const zoom = 1 + Math.min(c.t, 4) * 0.015;
  pg.chars.forEach((h, i) => { const isBoss = h === 'boss'; const key = isBoss ? 'boss_merchant' : 'hero_' + h; const C = CHARS.find(x => x.id === h);
    const cx = n === 1 ? W * 0.32 : W * (0.12 + 0.76 * (i + 0.5) / n) ; const hh = (n >= 4 ? 300 : 400) * zoom;
    const speaking = ln && ((C && ln.who === C.name) || (isBoss && ln.who === 'הסוחר'));
    drawSprite(key, cx, H - 20, hh, C ? C.artFace : -1, C ? C.artFace : -1, { glow: speaking ? '#fff' : null, alpha: (!ln || !ln.who || speaking || n >= 4) ? 1 : 0.7 }); });
  // caption box (top-right, RTL)
  ctx.font = `800 24px ${FONT}`; const cl = wrapLines(pg.cap, 520, 24, 800); const cw = 560, chh = 20 + cl.length * 32;
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(W - 30 - cw, 30, cw, chh); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(W - 30 - cw, 30, cw, chh);
  cl.forEach((l, i) => txt(l, W - 46, 30 + 26 + i * 32, 24, '#111', 'right', 800));
  // speech bubble
  if (ln) { const lines = wrapLines(ln.text, 400, 28, 800); const bw = 440, bh = 30 + lines.length * 36 + (ln.who ? 26 : 0); const bx = n === 1 ? W - 40 - bw : W / 2 - bw / 2, by = 30 + chh + 30;
    const pop = clamp(c.t / 0.15, 0, 1); ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(pop, pop); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    ctx.fillStyle = '#fff'; rrect(bx, by, bw, bh, 22); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
    if (ln.who) txt(ln.who, bx + bw - 22, by + 22, 20, '#b3121f', 'right', 900);
    lines.forEach((l, i) => txt(l, bx + bw - 22, by + (ln.who ? 54 : 30) + i * 36, 28, '#111', 'right', 800)); ctx.restore(); }
  if (Math.floor(APP.t * 2) % 2 === 0) txt(IS_TOUCH ? 'געו להמשך ◀' : 'Enter / הקליקו להמשך ◀', 150, H - 40, 18, '#fff', 'center', 700, '#000', 4);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(W - 110, H - 62, 80, 36, 10); ctx.fill(); txt('דלגו', W - 70, H - 44, 18, '#fff', 'center', 800);
}
const RES_BTNS = () => [{ id: 'share', x: W / 2 + 120, y: 452, w: 230, h: 52, label: 'שתפו כרטיס ציון', col: '#2fd6ff' }, { id: 'again', x: W / 2 - 100, y: 452, w: 200, h: 52, label: 'שחקו שוב', col: '#ff3b4a' }, { id: 'menu', x: W / 2 - 330, y: 452, w: 200, h: 52, label: 'תפריט ראשי', col: '#555' }];
function drawResults() {
  drawBackdrop(0.78, 0); const R = APP.results;
  const six = R.mode === 'sixty'; txt(six ? (R.win ? 'אתגר 60 שניות – הזמן נגמר!' : 'הצוות נפל...') : (R.win ? 'השלב הושלם!' : 'הצוות נפל...'), W / 2, 46, 46, R.win ? '#7dff8a' : '#ff6b6b', 'center', 900, '#000', 8);
  if (APP.cardImg && APP.cardImg.complete) { const ch = 360, cw = ch * 1080 / 1350; ctx.drawImage(APP.cardImg, 50, 80, cw, ch); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(50, 80, cw, ch); }
  const rows = six ? [['ניקוד', R.score.toLocaleString('en-US')], ['נוקאאוטים', String(R.kos)], ['רצף מקסימלי', '×' + R.maxCombo], ['כסף', '₪' + R.cash], ['לוחם פותח', R.hero], ['שיא 60 שניות', R.best.toLocaleString('en-US') + (R.newBest ? ' – שיא חדש!' : '')]]
    : [['ניקוד', R.score.toLocaleString('en-US')], ['זמן', fmtTime(R.time)], ['רצף מקסימלי', '×' + R.maxCombo], ['נוקאאוטים', String(R.kos)], ['כסף', '₪' + R.cash], ['קלף לוחם', R.card ? '1/60 ★' : '0/60 (מוסתר בארגז...)'], ['שיא אישי', R.best.toLocaleString('en-US') + (R.newBest ? ' – שיא חדש!' : '')]];
  rows.forEach((r, i) => { const y = 110 + i * 46; txt(r[0], W - 60, y, 24, '#ccc', 'right', 700); txt(r[1], W - 330, y, 28, i === 0 ? '#ffd23f' : '#fff', 'right', 900, '#000', 4); });
  RES_BTNS().forEach(b => { ctx.fillStyle = b.col; rrect(b.x, b.y, b.w, b.h, 14); ctx.fill(); txt(b.label, b.x + b.w / 2, b.y + b.h / 2, 24, '#fff', 'center', 900, '#000', 4); });
  if (APP.toast) { APP.toast.t -= 1 / 60; txt(APP.toast.text, W / 2, 520, 20, '#7dff8a', 'center', 800, '#000', 4); if (APP.toast.t <= 0) APP.toast = null; }
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H); txt('הפסקה', W / 2, 150, 60, '#fff', 'center', 900, '#000', 8);
  PAUSE_BTNS().forEach(b => { ctx.fillStyle = b.col; rrect(b.x, b.y, b.w, b.h, 14); ctx.fill(); txt(b.label, b.x + b.w / 2, b.y + b.h / 2, 24, '#fff', 'center', 900); });
}
const PAUSE_BTNS = () => [{ id: 'resume', x: W / 2 - 130, y: 230, w: 260, h: 54, label: 'המשך', col: '#ff3b4a' }, { id: 'menu', x: W / 2 - 130, y: 300, w: 260, h: 54, label: 'תפריט ראשי', col: '#444' }, { id: 'mute', x: W / 2 - 130, y: 370, w: 260, h: 54, label: muted ? 'הפעלת צליל' : 'השתקה', col: '#444' }];

// ---------- main loop ----------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; APP.t += dt;
  const portrait = IS_TOUCH && window.innerHeight > window.innerWidth;
  // input handling per state
  if (consume('mute')) setMute(!muted);
  if (APP.state === 'title' && !portrait) {
    if (consume('left') || consume('right') || consume('up') || consume('down')) { APP.menu = 1 - APP.menu; sfx('tag', 0.5); }
    if (!APP.themeOn && AC.state === 'running') { APP.themeOn = true; playMusic('music_theme'); }
    const tp = taps.shift(); if (tp && cornerTap(tp)) { } else if (tp) { MENU_BTNS().forEach((b, i) => { if (hitRect(tp, b.x, b.y, b.w, b.h)) chooseMode(i); }); }
    else if (consume('ok') || consume('attack')) chooseMode(APP.menu);
  } else if (APP.state === 'select') {
    if (consume('left')) APP.sel = Math.min(3, APP.sel + 1); if (consume('right')) APP.sel = Math.max(0, APP.sel - 1);
    const tp = taps.shift(); let go = consume('ok') || consume('attack');
    if (tp && !cornerTap(tp)) { SEL_CARDS().forEach(cd => { if (hitRect(tp, cd.x, cd.y, cd.w, cd.h)) { if (APP.sel === cd.i) go = true; APP.sel = cd.i; sfx('tag', 0.6); } }); if (hitRect(tp, W / 2 - 120, 488, 240, 46)) go = true; }
    if (go) { clearPressed(); taps.length = 0; if (APP.mode === 'sixty') startGame(); else startComic(COMIC_INTRO, startGame); }
  } else if (APP.state === 'comic') {
    const tp = taps.shift();
    if (tp && hitRect(tp, W - 110, H - 62, 80, 36)) { const f = APP.comic.onDone; APP.comic = null; if (curVo) try { curVo.stop(); } catch (e) { } f(); }
    else if (tp || consume('ok') || consume('attack') || consume('jump')) comicNext();
  } else if (APP.state === 'play') {
    if (portrait) APP.paused = true;
    if (consume('pause')) APP.paused = !APP.paused;
    if (APP.paused) { const tp = taps.shift(); if (tp) PAUSE_BTNS().forEach(b => { if (hitRect(tp, b.x, b.y, b.w, b.h)) { if (b.id === 'resume' && !portrait) APP.paused = false; if (b.id === 'menu') { APP.paused = false; touchControlsActive = false; APP.state = 'title'; playMusic('music_theme'); if (curVo) try { curVo.stop(); } catch (e) { } subtitle = null; G.state = 'menu'; } if (b.id === 'mute') setMute(!muted); } }); if (consume('ok')) APP.paused = false; clearPressed(); }
    else {
      const tp = taps.shift();
      if (tp) { if (usingTouch && hitRect(tp, 16, 72, 40, 34)) APP.paused = true; HUD_SLOTS().forEach(s => { if (Math.hypot(tp.x - s.x, tp.y - s.y) < 38) trySwitch(s.i); }); }
      update(dt);
    }
  } else if (APP.state === 'results') {
    const tp = taps.shift(); let act = null; if (consume('ok')) act = 'again';
    if (tp) RES_BTNS().forEach(b => { if (hitRect(tp, b.x, b.y, b.w, b.h)) act = b.id; });
    if (act === 'share') shareCard(); if (act === 'again') { APP.state = 'select'; clearPressed(); } if (act === 'menu') { APP.state = 'title'; clearPressed(); }
  }
  taps.length = Math.min(taps.length, 3);
  // render
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = VIEW.s * VIEW.dpr; ctx.setTransform(s, 0, 0, s, VIEW.ox * VIEW.dpr, VIEW.oy * VIEW.dpr);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  if (APP.state === 'loading') { ctx.fillStyle = '#120a10'; ctx.fillRect(0, 0, W, H); txt(GAME_TITLE, W / 2, H / 2 - 50, 64, '#ffd23f', 'center', 900, '#3a0000', 10); ctx.fillStyle = '#333'; ctx.fillRect(W / 2 - 200, H / 2 + 20, 400, 14); ctx.fillStyle = '#ff3b4a'; ctx.fillRect(W / 2 - 200, H / 2 + 20, 400 * loadProgress, 14); txt('טוען...', W / 2, H / 2 + 60, 20, '#fff', 'center', 700); if (loadDone) APP.state = 'title'; }
  else if (APP.state === 'title') drawTitle();
  else if (APP.state === 'select') drawSelect();
  else if (APP.state === 'comic') { drawComic(); drawSubtitle(); }
  else if (APP.state === 'play') {
    ctx.save(); const sh = G.shake; if (sh > 0) ctx.translate(rnd(-sh, sh), rnd(-sh, sh));
    if (G.zoom > 1.01) { const fx = sx(G.boss ? G.boss.x : G.P.x), fy = 380; ctx.translate(fx, fy); ctx.scale(G.zoom, G.zoom); ctx.translate(-fx, -fy); }
    drawWorld(); ctx.restore();
    if (G.timeScale < 0.9) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 0, W, H); }
    if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 1.6})`; ctx.fillRect(0, 0, W, H); }
    drawHUD(); drawCine(); drawIntroCard(); drawSubtitle(); drawTouch();
    if (APP.paused) drawPause();
  } else if (APP.state === 'results') drawResults();
  if (portrait) { ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0, 0, W, H); txt('סובבו את המכשיר לרוחב', W / 2, H / 2 - 20, 44, '#ffd23f', 'center', 900, '#000', 6); txt('⟳', W / 2, H / 2 + 60, 80, '#fff', 'center', 700); }
  ctx.restore();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (APP.state === 'play') APP.paused = true; AC.suspend && AC.suspend(); } else if (AC.resume) AC.resume(); });
// test / debug hooks (used by automated smoke tests)
window.ACE = {
  get app() { return APP; }, get G() { return G; },
  quickStart(ci = 0, mode = 'story') { APP.sel = ci; APP.mode = mode; startGame(); },
  warp(x) { G.P.x = x; G.camX = Math.max(0, x - W * 0.42); },
  clearWave() { G.enemies.forEach(e => { if (!e.boss) { e.dead = true; e.alpha = 0; } }); G.pendingSpawns = []; },
  fillMeter() { TM().meter = 100; }, godMode(on = true) { G.god = on; }, setTime(t) { G.timeLeft = t; },
};
loadAll(); requestAnimationFrame(frame);
