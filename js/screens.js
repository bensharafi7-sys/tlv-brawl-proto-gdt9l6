'use strict';
// ===== Ace-Af team – screens, map, shop, HUD, render loop (v4) =====
const GAME_TITLE = 'Ace-Af team';
const APP = { daily: null, state: 'loading', t: 0, sel: SAVE.sel != null ? SAVE.sel : 0, mode: 'story', menu: 0, comic: null, results: null, paused: false, cardBlob: null, cardURL: null,
  stage: Math.min(4, Math.max(0, (SAVE.unlocked || 1) - 1)), stT: 0, tr: null, tAmb: [], shopSel: 0, gmaSaid: false };
const COMIC_INTRO = [
  { bg: 'dark', chars: [], cap: 'תל אביב. לילה אחד.', lines: [{ who: '', text: 'תאגיד "מגדלי עזאזל" קונה את העיר – רחוב אחרי רחוב. מי שלא מוכר – נעלם.' }] },
  { bg: 'fire', chars: ['Benjo'], cap: 'המוסך של Benjo עלה באש.', lines: [{ who: 'Benjo', text: 'עכשיו אני כועס!', vo: 'benjo_2' }] },
  { bg: 'night', chars: ['AceAf', 'Daniel'], cap: 'לבר של Ace-Af הגיעו "גובים". הסטודיו של Daniel נשרף.', lines: [{ who: 'Ace-Af', text: 'הגיע הזמן לסדר חשבון.', vo: 'ace_1' }, { who: 'Daniel', text: 'הם בחרו בסטודיו הלא נכון.' }] },
  { bg: 'purple', chars: ['Ravid'], cap: 'Ravid מצאה את הרשימה. כל השמות מובילים לגובה אחד – בשוק.', lines: [{ who: 'Ravid', text: 'בשקט.', vo: 'ravid_1' }] },
  { bg: 'dawn', art: 's1', chars: ['AceAf', 'Daniel', 'Ravid', 'Benjo'], cap: 'ארבעה זרים. אויב אחד.', lines: [{ who: '', text: 'יוצאים לשוק.' }] },
];
// ---------- transitions ----------
function transition(fn, dur = 0.55) { if (APP.tr) return; APP.tr = { t: 0, fn, dur, fired: false }; }
function updateTransition(dt) { const tr = APP.tr; if (!tr) return; tr.t += dt; if (!tr.fired && tr.t >= tr.dur * 0.45) { tr.fired = true; tr.fn(); clearPressed(); taps.length = 0; } if (tr.t >= tr.dur) APP.tr = null; }
function drawTransition() {
  const tr = APP.tr; if (!tr) return; const h = tr.dur * 0.45, k = tr.t < h ? ease(tr.t / h) : 1 - ease((tr.t - h) / (tr.dur - h));
  ctx.save(); ctx.fillStyle = '#0b0609'; const n = 7, bw = (W + 300) / n;
  for (let i = 0; i < n; i++) { const kk = clamp(k * 1.4 - i * 0.06, 0, 1); ctx.beginPath(); const x0 = i * bw - 150; ctx.moveTo(x0 + 150, 0); ctx.lineTo(x0 + 150 + bw * kk + 2, 0); ctx.lineTo(x0 + bw * kk + 2, H); ctx.lineTo(x0, H); ctx.closePath(); if (kk > 0) ctx.fill(); }
  if (k > 0.85) { ctx.globalAlpha = (k - 0.85) / 0.15; txt(GAME_TITLE, W / 2, H / 2, 40, '#ffd23f', 'center', 900, '#3a0000', 6); }
  ctx.restore();
}
// ---------- comics ----------
function startComic(pages, onDone) { APP.state = 'comic'; APP.comic = { pages, p: 0, l: 0, t: 0, onDone }; pages.forEach(pg => { const S = STAGES.find(s => s.key === pg.art); if (S) loadStageLayers(S); }); playComicLine(); }
function playComicLine() { const c = APP.comic, pg = c.pages[c.p], ln = pg.lines[c.l]; c.t = 0; if (ln && ln.vo) voice(ln.vo, ln.text, ln.who); else { if (curVo) { try { curVo.stop(); } catch (e) { } } subtitle = null; } }
function comicNext() { const c = APP.comic; const pg = c.pages[c.p]; if (c.l < pg.lines.length - 1) c.l++; else { c.p++; c.l = 0; if (c.p >= c.pages.length) { const f = c.onDone; APP.comic = null; f(); return; } c.flip = 0.3; } playComicLine(); }
function comicSkip() { const f = APP.comic.onDone; APP.comic = null; if (curVo) try { curVo.stop(); } catch (e) { } subtitle = null; f(); }
// ---------- game flow ----------
function startGame() {
  const S = APP.mode === 'sixty' ? STAGES[0] : STAGES[APP.stage]; loadStageLayers(S);
  newGame(APP.sel, APP.mode, APP.mode === 'sixty' ? APP.daily : null, APP.mode === 'sixty' ? 0 : APP.stage);
  APP.state = 'play'; APP.paused = false; touchControlsActive = true; clearPressed(); taps.length = 0;
}
function beginStage() { // after hero select: comic (first time) -> play
  SAVE.sel = APP.sel; saveGame();
  if (APP.mode === 'sixty') { transition(startGame); return; }
  const id = APP.stage + 1; SAVE.seen = SAVE.seen || {};
  const pages = id === 1 ? (SAVE.seenIntro ? null : COMIC_INTRO) : (SAVE.seen[id] ? null : STAGE_COMICS[id]);
  if (pages) { if (id === 1) SAVE.seenIntro = true; else SAVE.seen[id] = 1; saveGame(); transition(() => startComic(pages, () => transition(startGame))); }
  else transition(startGame);
}
function goMap() { APP.state = 'map'; APP.stT = 0; touchControlsActive = false; playMusic('music_theme'); loadStageLayers(STAGES[APP.stage]); if (G) G.state = 'menu'; }
function endStage() {
  touchControlsActive = false; const win = G.win, sixty = G.mode === 'sixty', S = G.S;
  const R = APP.results = { mode: G.mode, daily: G.daily, win, stage: G.stageIdx, stageName: S.name, score: G.score + (win && !sixty ? Math.max(0, Math.round(3000 - G.time * 10)) : 0), time: sixty ? 60 - G.timeLeft : G.time,
    maxCombo: G.maxCombo, kos: G.kos, cash: G.cash, card: G.card, dmgTaken: G.dmgTaken, hero: CHARS[G.startChar].name, team: G.team.map(t => ({ hp: t.hp, down: t.down })) };
  const bk = G.daily ? 'aceaf_daily_' + G.daily : sixty ? 'aceaf_best60' : 'aceaf_best_' + S.key;
  const best = +(localStorage.getItem(bk) || 0); R.best = Math.max(best, R.score); localStorage.setItem(bk, R.best); R.newBest = R.score > best;
  if (!sixty) {
    R.cashEarned = win ? G.cash : Math.round(G.cash / 2); SAVE.cash = (SAVE.cash || 0) + R.cashEarned;
    if (win) { R.rank = rankFor(R); const prev = SAVE.cleared[S.key]; if (!prev || RANK_ORDER[R.rank] > RANK_ORDER[prev]) SAVE.cleared[S.key] = R.rank;
      if (G.card) SAVE.cards[S.key] = 1; R.unlockedNew = S.id < 5 && SAVE.unlocked < S.id + 1; SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(5, S.id + 1));
      if (S.id < 5) APP.stage = S.id; }
    R.cards = Object.keys(SAVE.cards).length; saveGame();
  }
  if (!win) stinger('lose'); else if (sixty) stinger('win');
  if (win && !sixty && S.id === 5) transition(() => startComic(COMIC_FINALE, () => transition(showResults))); else transition(showResults);
}
function showResults() { APP.state = 'results'; APP.stT = 0; playMusic('music_theme'); makeScoreCard(); }
function fmtDate(d) { const [y, m, dd] = d.split('-'); return `${+dd}.${+m}.${y}`; }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }
// ---------- score card (canvas -> PNG) ----------
function makeScoreCard() {
  const R = APP.results; const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#2a0d14'); g.addColorStop(1, '#0d0710'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const L = LAYERS[R.mode === 'sixty' ? 's1' : STAGES[R.stage || 0].key]; const bgm = (L && L.main) || IMG.bg_market;
  if (bgm) { x.globalAlpha = 0.6; const sh = bgm.height, sw = sh * 1080 / 700; x.drawImage(bgm, (bgm.width - sw) * 0.35, 0, sw, sh, 0, 0, 1080, 700); x.globalAlpha = 1; }
  const six = R.mode === 'sixty';
  const T = (s, X, Y, sz, col = '#fff', w = 800, al = 'center') => { x.font = `${w} ${sz}px ${FONT}`; x.textAlign = al; x.textBaseline = 'middle'; x.direction = /[\u0590-\u05FF]/.test(s) ? 'rtl' : 'ltr'; x.lineWidth = sz / 7; x.strokeStyle = '#000'; x.lineJoin = 'round'; x.strokeText(s, X, Y); x.fillStyle = col; x.fillText(s, X, Y); };
  T(GAME_TITLE, 540, 110, 110, '#ffd23f', 900); T(R.daily ? `אתגר יומי · ${fmtDate(R.daily)}` : six ? 'אתגר 60 שניות · השוק' : `פרק 1 · שלב ${(R.stage || 0) + 1}: ${R.stageName}`, 540, 205, 46, R.daily ? '#7fd6ff' : six ? '#ff8a3d' : '#fff', 700);
  const heroes = ['AceAf', 'Daniel', 'Ravid', 'Benjo']; heroes.forEach((h, i) => { const im = IMG['hero_' + h]; if (!im) return; const hh = 420, ww = im.width * hh / im.height; x.drawImage(im, 135 + i * 270 - ww / 2, 250, ww, hh); });
  x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(60, 700, 960, 520);
  T(six ? (R.win ? 'שרדתם 60 שניות!' : 'הצוות נפל...') : (R.win ? 'השלב הושלם!' : 'הצוות נפל...'), 540, 760, 64, R.win ? '#7dff8a' : '#ff6b6b', 900);
  T(`${R.score.toLocaleString('en-US')}`, 540, 870, 120, '#ffd23f', 900); T(R.rank ? `ניקוד · דירוג ${R.rank}` : 'ניקוד', 540, 950, 40, '#ddd', 600);
  const st = six ? [['הובסו', String(R.kos)], ['רצף מקסימלי', '×' + R.maxCombo], ['כסף', '₪' + R.cash], ['לוחם פותח', R.hero]]
    : [['זמן', fmtTime(R.time)], ['רצף מקסימלי', '×' + R.maxCombo], ['הובסו', String(R.kos)], ['קלפי לוחם', `${R.cards || 0}/5`]];
  st.forEach((s, i) => { const X = 920 - i * 260; T(s[1], X - 10, 1060, 54, '#fff', 900); T(s[0], X - 10, 1120, 30, '#bbb', 600); });
  T(R.daily ? `אותו קרב לכולם היום (${fmtDate(R.daily)}) – מי משיג יותר?` : six ? 'שברו את השיא שלי ב-60 שניות!' : 'מי משיג יותר?', 540, 1280, R.daily ? 38 : 44, '#fff', 700);
  c.toBlob(b => { APP.cardBlob = b; if (APP.cardURL) URL.revokeObjectURL(APP.cardURL); APP.cardURL = URL.createObjectURL(b); const im = new Image(); im.src = APP.cardURL; APP.cardImg = im; }, 'image/png');
}
async function shareCard() {
  if (!APP.cardBlob) return;
  const fname = APP.results.daily ? `aceaf-team-daily-${APP.results.daily}.png` : APP.results.mode === 'sixty' ? 'aceaf-team-60s.png' : 'aceaf-team-score.png';
  const file = new File([APP.cardBlob], fname, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: GAME_TITLE, text: `${GAME_TITLE} – ${APP.results.score} נקודות${APP.results.daily ? ` באתגר היומי (${fmtDate(APP.results.daily)})` : APP.results.mode === 'sixty' ? ' באתגר 60 שניות' : ''}. מי משיג יותר?` }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = APP.cardURL; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
  APP.toast = { text: 'כרטיס הציון נשמר', t: 2 };
}

// ---------- glass UI helpers ----------
let GLASS_NEXT = [];
function glassPanel(x, y, w, h, r = 12, tint = null) {
  if (QUAL.post && GLASS_NEXT.length < 6) GLASS_NEXT.push([x, y, w, h]);
  ctx.save(); rrect(x, y, w, h, r);
  if (QUAL.post) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(20,10,30,0.25)'); ctx.fillStyle = g; }
  else ctx.fillStyle = 'rgba(14,8,22,0.66)';
  ctx.fill(); if (tint) { ctx.globalAlpha = 0.18; ctx.fillStyle = tint; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke(); ctx.restore();
}
function glassBtn(b, sel, col) {
  const k = sel ? 1 + Math.sin(APP.t * 5) * 0.025 : 1; ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(k, k); ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
  if (sel) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24; rrect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fill(); ctx.restore(); }
  else glassPanel(b.x, b.y, b.w, b.h, 14, col);
  ctx.strokeStyle = sel ? '#fff' : col; ctx.lineWidth = sel ? 2.5 : 2; rrect(b.x, b.y, b.w, b.h, 14); ctx.stroke(); ctx.restore();
}
function hpBar(x, y, w, h, frac, trail, colA, colB) { // RTL bars drain from left to right
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(x, y, w, h, h / 2); ctx.fill();
  if (trail > frac) { ctx.fillStyle = '#ffe2a8'; rrect(x + w * (1 - trail), y, w * trail, h, h / 2); ctx.fill(); }
  if (frac > 0) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, colA); g.addColorStop(1, colB); ctx.fillStyle = g; rrect(x + w * (1 - frac), y, w * frac, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + w * (1 - frac) + 2, y + 1, Math.max(0, w * frac - 4), Math.max(1, h * 0.3)); }
}
// ---------- HUD ----------
const HUD_SLOTS = () => CHARS.map((c, i) => ({ i, x: W - 52 - i * 86, y: 44 }));
function drawHUD() {
  const sl = HUD_SLOTS(); glassPanel(sl[3].x - 44, 4, sl[0].x - sl[3].x + 88, 94, 14);
  sl.forEach(s => {
    const tm = G.team[s.i], C = CHARS[s.i], act = s.i === G.active, r = act ? 29 : 22;
    ctx.save(); ctx.globalAlpha = tm.down ? 0.5 : 1;
    if (act) glow(s.x, s.y - 2, 50, C.color, 0.35);
    ctx.beginPath(); ctx.arc(s.x, s.y - 2, r, 0, 7); ctx.save(); ctx.clip(); if (IMG['face_' + C.id]) ctx.drawImage(IMG['face_' + C.id], s.x - r, s.y - 2 - r, r * 2, r * 2); if (tm.down) { ctx.fillStyle = 'rgba(40,40,40,0.6)'; ctx.fillRect(s.x - r, s.y - 2 - r, r * 2, r * 2); } ctx.restore();
    ctx.lineWidth = act ? 3.5 : 2; ctx.strokeStyle = act ? C.color : 'rgba(255,255,255,0.5)'; if (tm.meter >= 100 && !tm.down) { ctx.strokeStyle = `hsl(${(G.t * 400) % 360},100%,60%)`; ctx.lineWidth = 4; } ctx.beginPath(); ctx.arc(s.x, s.y - 2, r, 0, 7); ctx.stroke();
    if (tm.down) { ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(s.x - 14, s.y - 16); ctx.lineTo(s.x + 14, s.y + 12); ctx.moveTo(s.x + 14, s.y - 16); ctx.lineTo(s.x - 14, s.y + 12); ctx.stroke(); }
    const bw = 70, bx = s.x - bw / 2, f = tm.hp / tm.max; hpBar(bx, s.y + 31, bw, 8, f, tm.trail / tm.max, f > 0.35 ? '#7dff9a' : '#ff6b7a', f > 0.35 ? '#22b04a' : '#c8102e');
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(bx, s.y + 42, bw, 5, 2.5); ctx.fill(); const m = tm.meter / 100; if (m > 0) { ctx.fillStyle = m >= 1 ? '#ffe45c' : '#c9a227'; rrect(bx + bw * (1 - m), s.y + 42, bw * m, 5, 2.5); ctx.fill(); if (m >= 1) glow(s.x, s.y + 44, 44, '#ffd23f', 0.3 + 0.2 * Math.sin(G.t * 8), 0.3); }
    txt(usingTouch ? C.name : `${s.i + 1} ${C.name}`, s.x, s.y - 33 + (act ? -3 : 0), 11, '#fff', 'center', 700, '#000', 3);
    ctx.restore();
  });
  // score / cash (left)
  glassPanel(10, 6, 214, 60, 14);
  txt(`${G.score.toLocaleString('en-US')}`, 24, 26, 24, '#ffd23f', 'left', 900, '#000', 4); txt('ניקוד', 212, 26, 13, '#ddd', 'right', 700);
  txt(`₪${G.cash}`, 24, 50, 18, '#7dff8a', 'left', 800, '#000', 3); txt(G.mode === 'sixty' ? '' : `שלב 1-${G.S.id}`, 212, 50, 13, '#ddd', 'right', 700);
  if (usingTouch) { glassPanel(16, 72, 40, 34, 8); txt('II', 36, 89, 18, '#fff', 'center', 900); }
  if (G.mode === 'sixty') { const tl = Math.ceil(G.timeLeft), hot = G.timeLeft <= 10; const k = hot ? 1 + 0.15 * Math.max(0, Math.sin(G.t * 12)) : 1;
    txt(String(tl), W / 2 - 10, 34, 44 * k, hot ? '#ff4040' : '#fff', 'center', 900, '#000', 7); if (G.daily) txt('אתגר יומי · ' + fmtDate(G.daily), W / 2 - 10, 66, 14, '#7fd6ff', 'center', 800, '#000', 3);
    if (G.countdown > 0) { const n = Math.ceil(G.countdown - 0.4); const f = (G.countdown - 0.4) % 1; txt(n > 0 ? String(n) : 'קדימה!', W / 2, H / 2 - 40, (n > 0 ? 140 : 90) * (1 + f * 0.3), '#ffd23f', 'center', 900, '#000', 12);
      txt('אתגר 60 שניות – כמה שיותר נקודות!', W / 2, H / 2 + 50, 26, '#fff', 'center', 800, '#000', 6); } }
  else if (!G.bosses.length || G.introCard) txt(fmtTime(G.time), W / 2 - 10, 22, 18, 'rgba(255,255,255,0.85)', 'center', 800, '#000', 3);
  // combo meter
  if (G.combo >= 2) { const pop = 1 + G.comboPop * 0.35, tier = G.combo >= 20 ? '#ff4d6d' : G.combo >= 10 ? '#ffb02e' : '#fff';
    glassPanel(12, 118, 150, 84, 14, tier); ctx.save(); ctx.translate(87, 152); ctx.scale(pop, pop); ctx.rotate(-0.06);
    if (G.combo >= 10) glow(0, 0, 70, tier, 0.35);
    txt('×' + G.combo, 0, 0, 44, tier, 'center', 900, '#000', 6); ctx.restore(); txt('רצף', 87, 184, 14, '#eee', 'center', 800);
    const k = clamp(G.comboT / 1.7, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(26, 194, 122, 4, 2); ctx.fill(); ctx.fillStyle = tier; rrect(26, 194, 122 * k, 4, 2); ctx.fill(); }
  if (G.rankMsg) { const a = clamp(G.rankMsg.t / 0.3, 0, 1); ctx.globalAlpha = a; txt(G.rankMsg.text, 87, 222, 22, '#ffd23f', 'center', 900, '#000', 5); ctx.globalAlpha = 1; }
  if (G.P.weapon) txt(`${G.P.weapon.type === 'pipe' ? 'צינור' : 'בקבוק'} (${G.P.weapon.uses})`, W - 60, 118, 16, '#ddd', 'center', 700, '#000', 4);
  // boss bar
  const bs = G.bosses; if (bs.length && bs[0].st !== 'enter' && !G.introCard && !(G.over && bossHpFrac() <= 0 && G.time - G.lastHitT > 3)) {
    const L0 = 238, R0 = HUD_SLOTS()[3].x - 56, bw = Math.min(420, R0 - L0 - 28), bx = L0 + 14 + (R0 - L0 - 28 - bw) / 2, by = 40, D = bs[0].T, f = bossHpFrac(); glassPanel(bx - 14, by - 26, bw + 28, 50, 12, '#ff2a2a');
    hpBar(bx, by, bw, 12, f, G.bossTrail, G.bossPhase >= 3 ? '#ff5a5a' : G.bossPhase === 2 ? '#ff7a2a' : '#ffb02e', G.bossPhase >= 2 ? '#a8001e' : '#c85a00');
    if (bs[0].type === 'merchant') [0.5, 0.25].forEach(p => { ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * (1 - p) - 1, by - 3, 2, 18); });
    txt(D.name, bx + bw, by - 13, 15, '#fff', 'right', 900, '#000', 3);
    txt(bs[0].type === 'merchant' ? `שלב ${G.bossPhase}/3` : bs.length > 1 ? `${bs.filter(b => !b.dead).length}/2` : '', bx, by - 13, 13, '#ffd23f', 'left', 800, '#000', 3); }
  if (G.goT > 0 && Math.floor(G.t * 3) % 2 === 0) { txt('קדימה', W - 120, 250, 40, '#ffd23f', 'center', 900, '#000', 7); txt('➜', W - 120, 300, 64, '#ffd23f', 'center', 900, '#000', 7); }
  if (G.banner) { const bn = G.banner; const sz = bn.big ? 76 : bn.small ? 26 : 44, y = bn.big ? H / 2 - 30 : (bn.small ? 236 : 176), a = clamp(bn.t / 0.25, 0, 1);
    ctx.globalAlpha = a; if (bn.big) glow(W / 2, y, 260, '#ffb030', 0.35, 0.35);
    if (!bn.big && !bn.small) { ctx.font = `900 ${sz}px ${FONT}`; const tw = ctx.measureText(bn.text).width + 60; glassPanel(W / 2 - tw / 2, y - 32, tw, bn.sub ? 92 : 64, 16); }
    txt(bn.text, W / 2, y, sz, bn.big ? '#ffd23f' : '#fff', 'center', 900, '#000', bn.big ? 10 : 6); if (bn.sub) txt(bn.sub, W / 2, y + 40, 18, '#ffd9a0', 'center', 700, '#000', 3); ctx.globalAlpha = 1; }
}
function drawSubtitle() {
  if (!subtitle) return; const s = subtitle; const line = s.who ? `${s.who}: ${s.text}` : s.text;
  ctx.font = `700 22px ${FONT}`; const w = Math.min(W - 80, ctx.measureText(line).width + 40); const y = touchControlsActive && usingTouch ? 262 : H - 52;
  glassPanel(W / 2 - w / 2, y - 22, w, 44, 12); txt(line, W / 2, y, 22, '#fff', 'center', 700, '#000', 3);
}
function drawTouch() {
  if (!usingTouch || !touchControlsActive) return;
  ctx.save();
  if (joy.id !== null) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(joy.bx, joy.by, 62, 0, 7); ctx.fill(); ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(joy.bx + joy.dx * 50, joy.by + joy.dy * 50, 28, 0, 7); ctx.fill(); }
  else { ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(130, 430, 62, 0, 7); ctx.fill(); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(130, 430, 28, 0, 7); ctx.fill(); }
  const tm = TM(), ready = tm.meter >= 100;
  BTN.forEach(b => { const held = btnHeld[b.a]; ctx.globalAlpha = held ? 0.8 : 0.5; ctx.fillStyle = b.a === 'special' && ready ? `hsl(${(G.t * 400) % 360},90%,55%)` : b.a === 'punch' ? '#ff3b4a' : b.a === 'kick' ? '#ff8a1e' : 'rgba(30,24,40,0.9)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
    if (b.a === 'special' && G.P.spCd > 0 && !ready) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.P.spCd / CH().sp.cd); ctx.fill(); }
    if ((b.a === 'punch' || b.a === 'kick') && G.P.st === 'charge' && G.P.chgBtn === b.a) { const k = clamp(G.P.t / 0.9, 0, 1); ctx.globalAlpha = 1; ctx.strokeStyle = k >= 1 ? '#fff6c0' : '#ffd23f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
    ctx.globalAlpha = 1; txt(b.a === 'special' && ready ? 'סופר!' : b.label, b.x, b.y, b.r > 40 * BTN_S ? 20 * BTN_S : 15 * BTN_S, '#fff', 'center', 800, '#000', 3); });
  ctx.restore();
}
function drawCine() {
  const c = G.cine; if (!c) return; const C = CHARS[c.ci]; const k = clamp(c.t / 0.25, 0, 1), out = clamp((c.t - c.dur + 0.2) / 0.2, 0, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.6 * (1 - out)})`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.5 * (1 - out); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 0; i < 40; i++) { const a = i * 2.4 + c.t * 0.5, r0 = 260 + ((i * 53 + c.t * 900) % 300); ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * (r0 + 160), H / 2 + Math.sin(a) * (r0 + 160)); ctx.stroke(); } ctx.restore();
  ctx.save(); ctx.translate(lerp(W + 200, 0, ease(k)) - out * W, 0); ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(W, 110); ctx.lineTo(W, 390); ctx.lineTo(0, 430); ctx.closePath();
  const g = ctx.createLinearGradient(0, 110, 0, 430); g.addColorStop(0, C.color); g.addColorStop(1, '#1a0a12'); ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
  for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(((i * 97 + c.t * 1600) % (W + 200)) - 100, 120 + i * 21, 160, 4); }
  const pi = IMG['portrait_' + C.id]; if (pi) { const ph = 420, pw = pi.width * ph / pi.height; ctx.drawImage(pi, W - pw - 40 + (1 - k) * 80, 60, pw, ph); }
  ctx.restore(); txt(c.name, 300, 270, 72, '#fff', 'center', 900, '#000', 10); txt(C.name, 300, 340, 30, '#000', 'center', 900); ctx.restore();
}
function drawLetterbox(k) { if (k <= 0) return; ctx.fillStyle = '#000'; const h = 64 * k; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
function drawIntroCard() {
  const c = G.introCard; if (!c) return; const D = c.D, k = clamp((4.4 - c.t) / 0.45, 0, 1), out = clamp((0.35 - c.t) / 0.35, 0, 1);
  drawLetterbox(k * (1 - out));
  if (4.4 - c.t < 0.9) return; // camera pushes in on the boss first, then the card slams in
  const k2 = easeOutBack(clamp((3.5 - c.t) / 0.35, 0, 1));
  ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate((1 - k2) * -W, 0);
  ctx.beginPath(); ctx.moveTo(0, 200); ctx.lineTo(W, 172); ctx.lineTo(W, 360); ctx.lineTo(0, 388); ctx.closePath(); const g = ctx.createLinearGradient(0, 172, W, 388); g.addColorStop(0, 'rgba(120,8,20,0.92)'); g.addColorStop(1, 'rgba(30,0,8,0.92)'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = D.col || '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
  ctx.save();
  if (D.fk === 'boss' && IMG.boss_merchant) { const hh = 330, ww = IMG.boss_merchant.width * hh / IMG.boss_merchant.height; ctx.drawImage(IMG.boss_merchant, 120, 120, ww, hh); }
  else { const M = EFRAMES && EFRAMES[D.fk]; drawAtlasFrame('ef_' + D.fk, IMG['ef_' + D.fk], M, 'idle', 240, 470, 330, 1, { noLight: true }); if (D.fk === 'twin') drawAtlasFrame('ef_twin2', IMG.ef_twin2, EFRAMES && EFRAMES.twin2, 'idle', 360, 480, 320, -1, { noLight: true }); }
  ctx.restore();
  txt(D.name, W - 300, 250, 74, '#ffd23f', 'center', 900, '#000', 10); txt(D.sub, W - 300, 318, 26, '#fff', 'center', 800, '#000', 5); ctx.restore();
}

// ---------- menu backdrops (world layer, post-processed) ----------
const GRADE_MENU = { lift: [0.01, 0, 0.02], gain: [1.03, 1, 0.97], sat: 1.08, con: 1.05, vig: 0.5, bloom: 0.45, thr: 0.58 };
const GRADE_COMIC = { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1.05, con: 1.03, vig: 0.3, bloom: 0.15, thr: 0.85 };
function withMenuG(fn) { const g0 = G; G = { amb: APP.tAmb, S: null, t: APP.t }; try { fn(); } finally { APP.tAmb = G.amb; G = g0; } }
function drawStagePan(S, speed, dim, amb = true, front = true) {
  const L = LAYERS[S.key];
  if (!L || !L.ready) { const th = IMG['thumb_' + S.key]; ctx.fillStyle = '#120a10'; ctx.fillRect(0, 0, W, H); if (th) { ctx.globalAlpha = 0.6; ctx.drawImage(th, 0, 0, W, H); ctx.globalAlpha = 1; } }
  else { const span = Math.max(1, S.w - W), camX = (Math.sin(APP.t * speed) * 0.5 + 0.5) * Math.min(span, 1400);
    drawStageBack(S, camX, APP.t);
    if (amb) withMenuG(() => { ambSpawn(S, 1 / 60); ambUpdate(1 / 60); ambDraw(0); ambDraw(1); });
    if (front) drawStageFront(S, camX, APP.t); }
  if (dim) { ctx.fillStyle = `rgba(10,4,8,${dim})`; ctx.fillRect(0, 0, W, H); }
}
function drawBackdrop(dim = 0.55) { drawStagePan(STAGES[APP.state === 'select' || APP.state === 'map' ? APP.stage : 0], 0.05, dim, true, false); }
// ---------- title ----------
const TITLE_BTNS = () => [{ id: 'mute', x: 20, y: 20, w: 50, h: 44 }, { id: 'q', x: 80, y: 20, w: 130, h: 44 }, ...(IS_TOUCH ? [{ id: 'fs', x: 220, y: 20, w: 50, h: 44 }] : [])];
const Q_LABEL = { auto: 'אוטומטי', high: 'גבוהה', med: 'בינונית', low: 'נמוכה' };
function cycleQuality() { const order = ['auto', 'high', 'med', 'low']; setQuality(order[(order.indexOf(QUAL.mode) + 1) % 4]); APP.toast = { text: `גרפיקה: ${Q_LABEL[QUAL.mode]}${QUAL.mode === 'auto' ? ' (' + Q_LABEL[QUAL.level] + ')' : ''}`, t: 1.6 }; }
function drawTitleWorld() {
  drawStagePan(STAGES[0], 0.06, 0.12);
  const g = ctx.createLinearGradient(0, 240, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.8)'); ctx.fillStyle = g; ctx.fillRect(0, 240, W, H - 240);
  ['AceAf', 'Daniel', 'Ravid', 'Benjo'].forEach((h, i) => { const C = CHARS[i]; const b = Math.sin(APP.t * 3 + i) * 0.015, k = easeOutBack(clamp((APP.stT - 0.5 - i * 0.12) / 0.5, 0, 1));
    if (k <= 0) return; drawSprite('hero_' + h, W / 2 + 320 - i * 213, 548 + (1 - k) * 260, 262, C.artFace, C.artFace, { sy: 1 + b, sx: 1 - b / 2 }); });
}
function drawTitleUI() {
  const t = APP.stT, k = clamp(t / 0.9, 0, 1), sc = lerp(2.4, 1, easeOutBack(k)) * (1 + Math.sin(APP.t * 2) * 0.015);
  ctx.save(); ctx.globalAlpha = clamp(t / 0.4, 0, 1); ctx.translate(W / 2, 92); ctx.scale(sc, sc); ctx.rotate(-0.03);
  txt(GAME_TITLE, 0, 0, 92, '#ffd23f', 'center', 900, '#3a0000', 16);
  if (t > 0.6 && t < 2.2) { const sw = (t - 0.6) / 1.2; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(sw * Math.PI) * 0.9; ctx.drawImage(lightSprite('#fff4c0'), -360 + sw * 720 - 80, -70, 160, 140); ctx.restore(); }
  ctx.restore();
  if (t > 0.85 && t < 1.2) { ctx.fillStyle = `rgba(255,240,200,${(1.2 - t) * 1.6})`; ctx.fillRect(0, 0, W, H); }
  const ui = clamp((t - 1.0) / 0.5, 0, 1); ctx.save(); ctx.globalAlpha = ui;
  txt('פרק 1: השוק · 5 שלבים', W / 2, 160, 28, '#fff', 'center', 800, '#000', 6);
  MENU_BTNS().forEach((b, i) => { const sel = APP.menu === i; glassBtn(b, sel, b.col); txt(b.label, b.x + b.w / 2, b.y + b.h / 2 - 7, 26, '#fff', 'center', 900, '#000', 4); txt(b.sub, b.x + b.w / 2, b.y + b.h / 2 + 18, 14, '#eee', 'center', 600, '#000', 2); });
  const b60 = +(localStorage.getItem('aceaf_best60') || 0), bd = +(localStorage.getItem('aceaf_daily_' + todayStr()) || 0);
  const bl = [b60 ? `שיא 60 שניות: ${b60.toLocaleString('en-US')}` : '', bd ? `שיא יומי: ${bd.toLocaleString('en-US')}` : ''].filter(Boolean).join(' · ');
  if (bl) txt(bl, W / 2, 288, 15, '#ffd23f', 'center', 700, '#000', 3);
  if (!IS_TOUCH) { txt('חצים/WASD – תזוזה · J – אגרוף · K – בעיטה · רווח – קפיצה · L – מיוחד/סופר', W / 2, H - 40, 16, '#fff', 'center', 700, '#000', 3);
    txt('החזיקו J או K – מכה כבדה (טעינה) · שלבו אגרוף ובעיטה לקומבו · Q או 1-4 – החלפת דמות · M – שקט', W / 2, H - 16, 15, '#ddd', 'center', 600, '#000', 3); }
  else { txt('לשחק לרוחב · ג\'ויסטיק משמאל · אגרוף ובעיטה מימין', W / 2, H - 40, 16, '#fff', 'center', 700, '#000', 3);
    txt('החזיקו אגרוף/בעיטה לטעינת מכה כבדה · שלבו ביניהם לקומבו', W / 2, H - 16, 15, '#ddd', 'center', 600, '#000', 3); }
  drawCornerBtns(); ctx.restore();
}
const MENU_BTNS = () => [{ id: 'story', x: W / 2 + 125, y: 196, w: 220, h: 66, label: 'מצב סיפור', sub: `פרק 1 · ${Math.min(5, Object.keys(SAVE.cleared).length)}/5 שלבים`, col: '#ff3b4a' },
  { id: 'sixty', x: W / 2 - 110, y: 196, w: 220, h: 66, label: 'אתגר 60 שניות', sub: 'כמה שיותר נקודות', col: '#ff8a1e' },
  { id: 'daily', x: W / 2 - 345, y: 196, w: 220, h: 66, label: 'אתגר יומי', sub: `${fmtDate(todayStr())} · ${CHARS[dailyHero(todayStr())].name}`, col: '#1e9bd7' }];
function chooseMode(i) { APP.menu = i; APP.mode = i >= 1 ? 'sixty' : 'story'; APP.daily = i === 2 ? todayStr() : null; if (IS_TOUCH) goFullscreen(); clearPressed(); taps.length = 0;
  if (i === 2) { APP.sel = dailyHero(APP.daily); transition(startGame); return; }
  if (i === 1) { transition(() => { APP.state = 'select'; APP.stT = 0; }); return; }
  transition(goMap); }
function drawCornerBtns() {
  TITLE_BTNS().forEach(b => { glassPanel(b.x, b.y, b.w, b.h, 10); txt(b.id === 'mute' ? (muted ? '🔇' : '🔊') : b.id === 'q' ? `גרפיקה: ${Q_LABEL[QUAL.mode]}` : '⛶', b.x + b.w / 2, b.y + b.h / 2 + 1, b.id === 'q' ? 15 : 22, '#fff', 'center', 700); });
  if (APP.toast) { txt(APP.toast.text, W / 2, 312, 18, '#7dff8a', 'center', 800, '#000', 4); }
}
function cornerTap(p) { for (const b of TITLE_BTNS()) if (hitRect(p, b.x, b.y, b.w, b.h)) { if (b.id === 'mute') setMute(!muted); else if (b.id === 'q') cycleQuality(); else goFullscreen(); return true; } return false; }
// ---------- map ----------
const MAP_NODES = () => STAGES.map((S, i) => ({ i, S, x: W * (0.13 + 0.185 * i), y: [300, 214, 292, 206, 276][i], w: 150, h: 94 }));
const MAP_BTNS = () => [{ id: 'back', x: 14, y: 12, w: 110, h: 44, label: '→ תפריט', col: '#555' }, { id: 'shop', x: W - 262, y: 12, w: 248, h: 44, label: 'המכולת של סבתא', col: '#2fae5a' },
  { id: 'play', x: 26, y: 432, w: 230, h: 70, label: 'יוצאים! ◀', col: '#ff3b4a' }];
function drawMapUI() {
  const t = APP.stT; txt('פרק 1: השוק', W / 2, 34, 34, '#ffd23f', 'center', 900, '#3a0000', 7);
  MAP_BTNS().forEach(b => { if (b.id === 'play') return; glassBtn(b, false, b.col); txt(b.label, b.x + b.w / 2, b.y + b.h / 2, 18, '#fff', 'center', 800, '#000', 3); });
  glassPanel(W / 2 - 150, 58, 300, 34, 10); txt(`₪${SAVE.cash || 0}   ·   קלפי לוחם ${Object.keys(SAVE.cards).length}/5`, W / 2, 75, 17, '#fff', 'center', 800, '#000', 3);
  const N = MAP_NODES();
  // path
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([2, 16]); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,220,150,0.75)'; ctx.beginPath();
  N.forEach((n, i) => { const cx = n.x, cy = n.y + n.h / 2; if (!i) ctx.moveTo(cx, cy); else { const p = N[i - 1]; ctx.quadraticCurveTo((p.x + cx) / 2, Math.min(p.y, n.y) - 30, cx, cy); } }); ctx.stroke(); ctx.restore();
  N.forEach(n => {
    const locked = n.i + 1 > SAVE.unlocked, sel = APP.stage === n.i, rk = SAVE.cleared[n.S.key], k = easeOutBack(clamp((t - n.i * 0.08) / 0.4, 0, 1)), s = (sel ? 1.12 + Math.sin(APP.t * 4) * 0.02 : 1) * k;
    if (k <= 0) return; ctx.save(); ctx.translate(n.x, n.y + n.h / 2); ctx.scale(s, s);
    if (sel) glow(0, 0, 130, '#ffb030', 0.45);
    ctx.save(); rrect(-n.w / 2, -n.h / 2, n.w, n.h, 12); ctx.clip(); const th = IMG['thumb_' + n.S.key]; if (th) ctx.drawImage(th, -n.w / 2, -n.h / 2, n.w, n.h); else { ctx.fillStyle = '#333'; ctx.fillRect(-n.w / 2, -n.h / 2, n.w, n.h); }
    if (locked) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(-n.w / 2, -n.h / 2, n.w, n.h); } ctx.restore();
    rrect(-n.w / 2, -n.h / 2, n.w, n.h, 12); ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#ffd23f' : locked ? '#555' : '#fff'; ctx.stroke();
    if (locked) txt('🔒', 0, -4, 30, '#fff', 'center', 700);
    if (rk) { ctx.fillStyle = { S: '#ffd23f', A: '#7dff8a', B: '#4fd2ff', C: '#bbb' }[rk]; ctx.beginPath(); ctx.arc(n.w / 2 - 6, -n.h / 2 + 6, 17, 0, 7); ctx.fill(); txt(rk, n.w / 2 - 6, -n.h / 2 + 7, 20, '#111', 'center', 900); }
    if (SAVE.cards[n.S.key]) txt('★', -n.w / 2 + 12, -n.h / 2 + 12, 22, '#ffd23f', 'center', 900, '#000', 3);
    if (n.S.boss) txt(n.S.boss.kind === 'merchant' ? 'בוס' : 'מיני-בוס', 0, n.h / 2 - 12, 13, '#ff8a8a', 'center', 900, '#000', 3);
    txt(`1-${n.i + 1}`, 0, n.h / 2 + 16, 16, '#ffd23f', 'center', 900, '#000', 4); txt(n.S.name, 0, n.h / 2 + 36, 15, locked ? '#999' : '#fff', 'center', 800, '#000', 3);
    ctx.restore(); });
  // info panel
  const S = STAGES[APP.stage]; glassPanel(270, 414, W - 284, 112, 14);
  txt(`שלב 1-${S.id}: ${S.name}`, W - 32, 438, 24, '#ffd23f', 'right', 900, '#000', 4); txt(S.sub, W - 32, 464, 15, '#ddd', 'right', 700);
  txt('אויב חדש: ' + S.newEnemy, W - 32, 488, 15, '#ffb3b3', 'right', 800); ctx.font = `600 13px ${FONT}`; const tl = wrapLines(S.tip, W - 340, 13, 600); tl.slice(0, 2).forEach((l, i) => txt(l, W - 32, 508 + i * 16, 13, '#fff', 'right', 600));
  const best = +(localStorage.getItem('aceaf_best_' + S.key) || 0); if (best) txt(`שיא: ${best.toLocaleString('en-US')}${SAVE.cleared[S.key] ? ' · דירוג ' + SAVE.cleared[S.key] : ''}`, 290, 438, 14, '#ffd23f', 'left', 800, '#000', 3);
  const pb = MAP_BTNS()[2]; glassBtn(pb, true, '#ff3b4a'); txt(pb.label, pb.x + pb.w / 2, pb.y + pb.h / 2, 26, '#fff', 'center', 900, '#000', 4);
  if (APP.toast) txt(APP.toast.text, W / 2, 112, 18, '#ffd23f', 'center', 800, '#000', 4);
}
function mapInput() {
  if (consume('left')) { APP.stage = Math.min(SAVE.unlocked - 1, APP.stage + 1); sfx('tag', 0.5); loadStageLayers(STAGES[APP.stage]); }
  if (consume('right')) { APP.stage = Math.max(0, APP.stage - 1); sfx('tag', 0.5); loadStageLayers(STAGES[APP.stage]); }
  let go = consume('ok') || consumeHit(); const tp = taps.shift();
  if (consume('pause')) { transition(() => { APP.state = 'title'; APP.stT = 2; }); return; }
  if (tp) {
    for (const b of MAP_BTNS()) if (hitRect(tp, b.x, b.y, b.w, b.h)) { if (b.id === 'back') { transition(() => { APP.state = 'title'; APP.stT = 2; }); return; } if (b.id === 'shop') { transition(() => { APP.state = 'shop'; APP.stT = 0; }); return; } if (b.id === 'play') go = true; }
    MAP_NODES().forEach(n => { if (hitRect(tp, n.x - n.w / 2 - 10, n.y - 10, n.w + 20, n.h + 50)) { if (n.i + 1 > SAVE.unlocked) { APP.toast = { text: 'נעול – סיימו את השלב הקודם', t: 1.5 }; sfx('hurt', 0.3); return; } if (APP.stage === n.i) go = true; APP.stage = n.i; sfx('tag', 0.6); loadStageLayers(n.S); } });
  }
  if (go) { APP.mode = 'story'; APP.daily = null; loadStageLayers(STAGES[APP.stage]); transition(() => { APP.state = 'select'; APP.stT = 0; }); }
}
// ---------- grandma's grocery (upgrade shop) ----------
const SHOP_CARDS = () => UPGRADES.map((u, i) => ({ u, i, x: 30 + i * 200, y: 120, w: 186, h: 290 }));
function drawShopUI() {
  txt('המכולת של סבתא', W / 2, 36, 36, '#7dff8a', 'center', 900, '#0a3a12', 7);
  const pb = { x: 14, y: 12, w: 110, h: 44 }; glassBtn(pb, false, '#555'); txt('→ למפה', pb.x + pb.w / 2, pb.y + pb.h / 2, 18, '#fff', 'center', 800, '#000', 3);
  glassPanel(W - 200, 12, 186, 44, 12); txt(`₪${SAVE.cash || 0}`, W - 107, 34, 24, '#7dff8a', 'center', 900, '#000', 4);
  // grandma
  const gp = IMG.portrait_grandma, gx = W - 30 - 340, gy = 76; if (gp) { glassPanel(gx - 8, gy - 8, 356, 270, 16, '#2fae5a'); ctx.save(); rrect(gx, gy, 340, 254, 12); ctx.clip(); ctx.drawImage(gp, gx, gy, 340, 254); ctx.restore(); }
  ctx.fillStyle = '#fff'; rrect(gx + 10, gy + 270, 320, 64, 18); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
  txt('סבתא', gx + 316, gy + 288, 15, '#2a8a3a', 'right', 900); txt('שלום, חמודים! מה קונים היום?', gx + 316, gy + 314, 19, '#111', 'right', 800);
  SHOP_CARDS().forEach(c => { const u = c.u, lv = SAVE.up[u.id] || 0, max = lv >= u.cost.length, cost = max ? 0 : u.cost[lv], can = !max && (SAVE.cash || 0) >= cost, sel = APP.shopSel === c.i;
    const k = easeOutBack(clamp((APP.stT - c.i * 0.08) / 0.4, 0, 1)); if (k <= 0) return; ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(k, k); ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
    glassPanel(c.x, c.y, c.w, c.h, 16, u.col); if (sel) { rrect(c.x, c.y, c.w, c.h, 16); ctx.strokeStyle = u.col; ctx.lineWidth = 3; ctx.stroke(); }
    glow(c.x + c.w / 2, c.y + 62, 70, u.col, 0.35); txt(u.icon, c.x + c.w / 2, c.y + 62, 54, u.col, 'center', 900, '#000', 3);
    txt(u.name, c.x + c.w / 2, c.y + 122, 24, '#fff', 'center', 900, '#000', 4); ctx.font = `600 14px ${FONT}`; wrapLines(u.desc, c.w - 24, 14, 600).forEach((l, j) => txt(l, c.x + c.w / 2, c.y + 152 + j * 18, 14, '#ddd', 'center', 600));
    for (let j = 0; j < u.cost.length; j++) { ctx.fillStyle = j < lv ? u.col : 'rgba(255,255,255,0.18)'; rrect(c.x + c.w / 2 - 45 + j * 32, c.y + 196, 26, 10, 5); ctx.fill(); }
    const b = { x: c.x + 18, y: c.y + 222, w: c.w - 36, h: 48 }; ctx.globalAlpha = max ? 0.5 : can ? 1 : 0.55; ctx.fillStyle = max ? '#444' : can ? u.col : '#333'; rrect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.globalAlpha = 1;
    txt(max ? 'מקסימום' : `קנו · ₪${cost}`, b.x + b.w / 2, b.y + b.h / 2, 20, '#fff', 'center', 900, '#000', 3); ctx.restore(); });
  txt(`חיים מקסימליים: ${upMaxHp()} · נזק: ×${upDmg().toFixed(1)} · טעינת סופר: ×${upSup().toFixed(1)}`, 330, 440, 16, '#fff', 'center', 700, '#000', 3);
  txt('כסף נאסף מאויבים וארגזים בכל שלב', 330, 466, 14, '#bbb', 'center', 600);
  if (APP.toast) txt(APP.toast.text, W / 2, 500, 20, '#7dff8a', 'center', 800, '#000', 4);
}
function buyUpgrade(i) {
  const u = UPGRADES[i], lv = SAVE.up[u.id] || 0; if (lv >= u.cost.length) { APP.toast = { text: 'כבר במקסימום!', t: 1.4 }; return; }
  const cost = u.cost[lv]; if ((SAVE.cash || 0) < cost) { APP.toast = { text: 'אין מספיק כסף – חזרו לשוק!', t: 1.6 }; sfx('hurt', 0.3); return; }
  SAVE.cash -= cost; SAVE.up[u.id] = lv + 1; saveGame(); sfx('coin', 1); sfx('super', 0.4, 1.4); FX.bloom = 0.8; APP.toast = { text: `${u.name} שודרג לרמה ${lv + 1}!`, t: 1.8 };
}
function shopInput() {
  if (!APP.gmaSaid && APP.stT > 0.4) { APP.gmaSaid = true; voice('gma_1', 'שלום, חמודים! מה קונים היום?', 'סבתא'); }
  if (consume('left')) APP.shopSel = Math.min(2, APP.shopSel + 1); if (consume('right')) APP.shopSel = Math.max(0, APP.shopSel - 1);
  if (consume('ok') || consumeHit()) buyUpgrade(APP.shopSel);
  if (consume('pause')) { transition(goMap); return; }
  const tp = taps.shift(); if (!tp) return;
  if (hitRect(tp, 14, 12, 110, 44)) { transition(goMap); return; }
  SHOP_CARDS().forEach(c => { if (hitRect(tp, c.x, c.y, c.w, c.h)) { APP.shopSel = c.i; if (hitRect(tp, c.x + 18, c.y + 222, c.w - 36, 48)) buyUpgrade(c.i); } });
}
// ---------- hero select ----------
const SEL_CARDS = () => CHARS.map((c, i) => ({ i, x: W / 2 + 444 - (i + 1) * 222 + 6, y: 70, w: 210, h: 380 }));
function drawSelectUI() {
  const S = STAGES[APP.stage];
  txt(APP.mode === 'sixty' ? 'אתגר 60 שניות · בחרו לוחם' : `שלב 1-${S.id}: ${S.name} · בחרו לוחם פותח`, W / 2, 36, 32, '#ffd23f', 'center', 900, '#000', 7);
  txt('אגרוף + בעיטה = קומבו · החזיקו = מכה כבדה שמעיפה לקיר · הולכים לתוך אויב = תפיסה · החלפה באמצע רצף = מתקפת צוות', W / 2, 470, 15, '#fff', 'center', 700, '#000', 4);
  SEL_CARDS().forEach(cd => {
    const C = CHARS[cd.i], sel = APP.sel === cd.i, k = easeOutBack(clamp((APP.stT - cd.i * 0.07) / 0.4, 0, 1)); if (k <= 0) return;
    ctx.save(); ctx.translate(cd.x + cd.w / 2, cd.y + cd.h / 2); ctx.scale(k, k); ctx.translate(-(cd.x + cd.w / 2), -(cd.y + cd.h / 2));
    if (sel) glow(cd.x + cd.w / 2, cd.y + 150, 170, C.color, 0.4);
    glassPanel(cd.x, cd.y, cd.w, cd.h, 14, sel ? C.color : null); rrect(cd.x, cd.y, cd.w, cd.h, 14); ctx.lineWidth = sel ? 4 : 1.5; ctx.strokeStyle = sel ? C.color : 'rgba(255,255,255,0.3)'; ctx.stroke();
    ctx.save(); rrect(cd.x, cd.y, cd.w, cd.h, 14); ctx.clip(); const b = sel ? Math.sin(APP.t * 4) * 0.02 : 0; drawSprite('hero_' + C.id, cd.x + cd.w / 2, cd.y + 238, 225, C.artFace, C.artFace, { sy: 1 + b, glow: sel ? C.color : null }); ctx.restore();
    txt(C.name, cd.x + cd.w / 2, cd.y + 258, 26, sel ? C.color : '#fff', 'center', 900, '#000', 5);
    txt(C.style, cd.x + cd.w / 2, cd.y + 286, 14, '#ddd', 'center', 600, '#000', 2);
    txt('נשק: ' + C.weapon, cd.x + cd.w / 2, cd.y + 306, 14, '#ddd', 'center', 600, '#000', 2);
    txt('סופר: ' + C.superName, cd.x + cd.w / 2, cd.y + 326, 14, '#ffd23f', 'center', 700, '#000', 2);
    [['מהירות', C.stat.spd], ['כוח', C.stat.pow]].forEach((s, kk) => { const yy = cd.y + 348 + kk * 16; txt(s[0], cd.x + cd.w - 16, yy, 12, '#bbb', 'right', 600); for (let j = 0; j < 5; j++) { ctx.fillStyle = j < s[1] ? C.color : 'rgba(255,255,255,0.15)'; ctx.fillRect(cd.x + cd.w - 80 - j * 22, yy - 5, 18, 10); } });
    ctx.restore();
  });
  const bx = W / 2 - 120, by = 488; glassBtn({ x: bx, y: by, w: 240, h: 46 }, true, '#ff3b4a'); txt('יוצאים לקרב!', W / 2, by + 23, 26, '#fff', 'center', 900, '#000', 4);
  const back = { x: 14, y: 488, w: 110, h: 46 }; glassBtn(back, false, '#555'); txt('→ חזרה', back.x + back.w / 2, back.y + 23, 18, '#fff', 'center', 800, '#000', 3);
}
// ---------- comic ----------
const BG_TINT = { dark: ['#0a0610', '#2a0d14'], fire: ['#3a0b00', '#b3361b'], night: ['#08101e', '#1d2b4a'], purple: ['#14061f', '#4b1f6b'], dawn: ['#2a1020', '#f08a4b'] };
function drawComicArt() {
  const c = APP.comic; if (!c) return; const pg = c.pages[c.p], ln = pg.lines[c.l]; c.t += 1 / 60;
  const [a, b] = BG_TINT[pg.bg] || BG_TINT.dark; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const zoom = 1 + Math.min(c.t, 6) * 0.012;
  const St = STAGES.find(s => s.key === pg.art);
  if (St) { const L = LAYERS[St.key]; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
    if (L && L.ready) { const bw = L.main.width * H / L.main.height; ctx.drawImage(L.main, 0, 0, L.main.width * Math.min(1, W / bw), L.main.height, 0, 0, Math.min(W, bw), H); } else if (IMG['thumb_' + St.key]) ctx.drawImage(IMG['thumb_' + St.key], 0, 0, W, H);
    ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H); }
  else if (pg.art === 'uncle' && IMG.portrait_uncle) { const im = IMG.portrait_uncle, hh = H * zoom, ww = im.width * hh / im.height; ctx.drawImage(im, W * 0.04 - (ww - im.width * H / im.height) / 2, (H - hh) / 2, ww, hh);
    const gg = ctx.createLinearGradient(W * 0.45, 0, W * 0.8, 0); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, a); ctx.fillStyle = gg; ctx.fillRect(W * 0.45, 0, W * 0.55, H); }
  else if (IMG.bg_market) { ctx.globalAlpha = 0.28; ctx.drawImage(IMG.bg_market, 0, 0, IMG.bg_market.width / 2, IMG.bg_market.height, 0, 0, W, H); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < H; y += 14) for (let x = (y / 14 % 2) * 7; x < W; x += 14) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
  const n = (pg.chars || []).length;
  (pg.chars || []).forEach((h, i) => { const isBoss = h === 'boss'; const key = isBoss ? 'boss_merchant' : 'hero_' + h; const C = CHARS.find(x => x.id === h);
    const cx = n === 1 ? W * 0.32 : W * (0.12 + 0.76 * (i + 0.5) / n); const hh = (n >= 4 ? 300 : 400) * zoom, sl = easeOutBack(clamp((c.t - i * 0.08) / 0.35, 0, 1));
    const speaking = ln && ((C && ln.who === C.name) || (isBoss && ln.who === 'הסוחר'));
    drawSprite(key, cx, H - 20 + (1 - sl) * 120, hh, C ? C.artFace : -1, C ? C.artFace : -1, { glow: speaking ? '#fff' : null, alpha: (!ln || !ln.who || speaking || n >= 4) ? sl : 0.7 * sl }); });
}
function drawComicUI() {
  const c = APP.comic; if (!c) return; const pg = c.pages[c.p], ln = pg.lines[c.l]; const n = (pg.chars || []).length;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, W - 28, H - 28); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.font = `800 24px ${FONT}`; const cl = wrapLines(pg.cap, 520, 24, 800); const cw = 560, chh = 20 + cl.length * 32, ck = easeOutBack(clamp(c.t / 0.3, 0, 1));
  ctx.save(); ctx.translate((1 - ck) * 200, 0); ctx.fillStyle = '#ffd23f'; ctx.fillRect(W - 30 - cw, 30, cw, chh); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(W - 30 - cw, 30, cw, chh);
  cl.forEach((l, i) => txt(l, W - 46, 30 + 26 + i * 32, 24, '#111', 'right', 800)); ctx.restore();
  if (ln) { const lines = wrapLines(ln.text, 400, 28, 800); const bw = 440, bh = 30 + lines.length * 36 + (ln.who ? 26 : 0); const bx = n === 1 || pg.art === 'uncle' ? W - 40 - bw : W / 2 - bw / 2, by = 30 + chh + 30;
    const pop = easeOutBack(clamp((c.t - 0.15) / 0.25, 0, 1)); ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(pop, pop); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    ctx.fillStyle = '#fff'; rrect(bx, by, bw, bh, 22); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
    if (ln.who) txt(ln.who, bx + bw - 22, by + 22, 20, '#b3121f', 'right', 900);
    lines.forEach((l, i) => txt(l, bx + bw - 22, by + (ln.who ? 54 : 30) + i * 36, 28, '#111', 'right', 800)); ctx.restore(); }
  if (Math.floor(APP.t * 2) % 2 === 0) txt(IS_TOUCH ? 'געו להמשך ◀' : 'Enter / הקליקו להמשך ◀', 150, H - 40, 18, '#fff', 'center', 700, '#000', 4);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(W - 110, H - 62, 80, 36, 10); ctx.fill(); txt('דלגו', W - 70, H - 44, 18, '#fff', 'center', 800);
  if (c.flip > 0) { c.flip -= 1 / 60; ctx.fillStyle = `rgba(255,255,255,${c.flip * 2})`; ctx.fillRect(0, 0, W, H); }
}
// ---------- results ----------
const RES_BTNS = () => APP.results && APP.results.mode === 'story'
  ? [{ id: 'share', x: W / 2 + 120, y: 452, w: 230, h: 52, label: 'שתפו כרטיס ציון', col: '#2fd6ff' }, { id: 'again', x: W / 2 - 100, y: 452, w: 200, h: 52, label: 'שוב את השלב', col: '#555' }, { id: 'map', x: W / 2 - 330, y: 452, w: 200, h: 52, label: APP.results.win ? 'המשך למפה' : 'למפה', col: '#ff3b4a' }]
  : [{ id: 'share', x: W / 2 + 120, y: 452, w: 230, h: 52, label: 'שתפו כרטיס ציון', col: '#2fd6ff' }, { id: 'again', x: W / 2 - 100, y: 452, w: 200, h: 52, label: 'שחקו שוב', col: '#ff3b4a' }, { id: 'menu', x: W / 2 - 330, y: 452, w: 200, h: 52, label: 'תפריט ראשי', col: '#555' }];
function drawResultsUI() {
  const R = APP.results, six = R.mode === 'sixty', t = APP.stT;
  txt(six ? (R.win ? (R.daily ? `אתגר יומי ${fmtDate(R.daily)} – הזמן נגמר!` : 'אתגר 60 שניות – הזמן נגמר!') : 'הצוות נפל...') : (R.win ? `שלב 1-${R.stage + 1} הושלם!` : 'הצוות נפל...'), W / 2, 40, 42, R.win ? '#7dff8a' : '#ff6b6b', 'center', 900, '#000', 8);
  if (APP.cardImg && APP.cardImg.complete) { const ch = 340, cw = ch * 1080 / 1350; ctx.save(); ctx.translate(50 + cw / 2, 84 + ch / 2); ctx.rotate(-0.03); ctx.drawImage(APP.cardImg, -cw / 2, -ch / 2, cw, ch); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(-cw / 2, -ch / 2, cw, ch); ctx.restore(); }
  glassPanel(W - 560, 70, 530, 364, 16);
  const rows = six ? [['ניקוד', R.score.toLocaleString('en-US')], ['אויבים שהובסו', String(R.kos)], ['רצף מקסימלי', '×' + R.maxCombo], ['כסף', '₪' + R.cash], ['לוחם פותח', R.hero], [R.daily ? 'שיא היום' : 'שיא 60 שניות', R.best.toLocaleString('en-US') + (R.newBest ? ' – שיא חדש!' : '')]]
    : [['ניקוד', R.score.toLocaleString('en-US')], ['זמן', fmtTime(R.time)], ['רצף מקסימלי', '×' + R.maxCombo], ['נזק שספגתם', String(Math.round(R.dmgTaken))], ['כסף לארנק', '₪' + (R.cashEarned || 0) + ` (סה"כ ₪${SAVE.cash})`], ['קלף לוחם', R.card ? `נמצא! ★ (${R.cards}/5)` : `${R.cards}/5 (מוסתר בארגז...)`], ['שיא שלב', R.best.toLocaleString('en-US') + (R.newBest ? ' – שיא חדש!' : '')]];
  rows.forEach((r, i) => { const a = clamp((t - 0.2 - i * 0.07) / 0.25, 0, 1); if (a <= 0) return; ctx.globalAlpha = a; const y = 100 + i * 46; txt(r[0], W - 50, y, 22, '#ccc', 'right', 700); txt(r[1], W - 290, y, 24, i === 0 ? '#ffd23f' : '#fff', 'right', 900, '#000', 4); ctx.globalAlpha = 1; });
  if (R.rank) { const k = clamp((t - 0.9) / 0.25, 0, 1); if (k > 0) { const s = lerp(3, 1, easeOutBack(k)), col = { S: '#ffd23f', A: '#7dff8a', B: '#4fd2ff', C: '#ddd' }[R.rank];
    ctx.save(); ctx.translate(318, 104); ctx.rotate(-0.18); ctx.scale(s, s); ctx.globalAlpha = k; glow(0, 0, 110, col, 0.5); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.stroke();
    txt(R.rank, 0, 4, 84, col, 'center', 900, '#000', 8); txt('דירוג', 0, 72, 18, '#fff', 'center', 800, '#000', 3); ctx.restore(); if (!APP.rankSfx) { APP.rankSfx = 1; sfx('stomp', 0.8, 1.2); FX.bloom = 1; } } }
  if (R.unlockedNew && t > 1.4) txt(`שלב 1-${R.stage + 2} נפתח!`, W - 300, 410, 20, '#ffd23f', 'center', 900, '#000', 4);
  RES_BTNS().forEach(b => { glassBtn(b, b.col !== '#555', b.col); txt(b.label, b.x + b.w / 2, b.y + b.h / 2, 22, '#fff', 'center', 900, '#000', 4); });
  if (APP.toast) txt(APP.toast.text, W / 2, 520, 20, '#7dff8a', 'center', 800, '#000', 4);
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H); glassPanel(W / 2 - 170, 110, 340, 400, 18); txt('הפסקה', W / 2, 150, 54, '#fff', 'center', 900, '#000', 8);
  PAUSE_BTNS().forEach(b => { glassBtn(b, b.id === 'resume', b.col); txt(b.label, b.x + b.w / 2, b.y + b.h / 2, 22, '#fff', 'center', 900, '#000', 3); });
}
const PAUSE_BTNS = () => [{ id: 'resume', x: W / 2 - 130, y: 200, w: 260, h: 54, label: 'המשך', col: '#ff3b4a' }, { id: 'map', x: W / 2 - 130, y: 264, w: 260, h: 54, label: G && G.mode === 'story' ? 'יציאה למפה' : 'תפריט ראשי', col: '#555' },
  { id: 'mute', x: W / 2 - 130, y: 328, w: 260, h: 54, label: muted ? 'הפעלת צליל' : 'השתקה', col: '#555' }, { id: 'q', x: W / 2 - 130, y: 392, w: 260, h: 54, label: `גרפיקה: ${Q_LABEL[QUAL.mode]}`, col: '#555' }];

// ---------- main loop ----------
let lastT = performance.now();
function exitToMenu() { APP.paused = false; touchControlsActive = false; if (curVo) try { curVo.stop(); } catch (e) { } subtitle = null; stopChargeSound();
  const story = G && G.mode === 'story'; if (G) G.state = 'menu'; transition(() => { if (story) goMap(); else { APP.state = 'title'; APP.stT = 2; playMusic('music_theme'); } }); }
function handleInput(dt, portrait) {
  if (consume('mute')) setMute(!muted);
  const st = APP.state;
  if (APP.tr && st !== 'play') { taps.length = 0; return; }
  if (st === 'title' && !portrait) {
    if (consume('left') || consume('down')) { APP.menu = (APP.menu + 1) % 3; sfx('tag', 0.5); } if (consume('right') || consume('up')) { APP.menu = (APP.menu + 2) % 3; sfx('tag', 0.5); }
    if (!APP.themeOn && AC.state === 'running') { APP.themeOn = true; playMusic('music_theme'); }
    const tp = taps.shift(); if (tp && cornerTap(tp)) { } else if (tp) { MENU_BTNS().forEach((b, i) => { if (hitRect(tp, b.x, b.y, b.w, b.h)) chooseMode(i); }); }
    else if (consume('ok') || consumeHit()) chooseMode(APP.menu);
  } else if (st === 'map') mapInput();
  else if (st === 'shop') shopInput();
  else if (st === 'select') {
    if (consume('left')) APP.sel = Math.min(3, APP.sel + 1); if (consume('right')) APP.sel = Math.max(0, APP.sel - 1);
    const tp = taps.shift(); let go = consume('ok') || consumeHit(), back = consume('pause');
    if (tp) { SEL_CARDS().forEach(cd => { if (hitRect(tp, cd.x, cd.y, cd.w, cd.h)) { if (APP.sel === cd.i) go = true; APP.sel = cd.i; sfx('tag', 0.6); } }); if (hitRect(tp, W / 2 - 120, 488, 240, 46)) go = true; if (hitRect(tp, 14, 488, 110, 46)) back = true; }
    if (back) { transition(() => { if (APP.mode === 'story') goMap(); else { APP.state = 'title'; APP.stT = 2; } }); return; }
    if (go) { clearPressed(); taps.length = 0; beginStage(); }
  } else if (st === 'comic') {
    const tp = taps.shift();
    if (tp && hitRect(tp, W - 110, H - 62, 80, 36)) comicSkip();
    else if (tp || consume('ok') || consumeHit() || consume('jump')) comicNext();
  } else if (st === 'play') {
    if (portrait) APP.paused = true;
    if (consume('pause')) APP.paused = !APP.paused;
    if (APP.paused) { const tp = taps.shift(); if (tp) PAUSE_BTNS().forEach(b => { if (hitRect(tp, b.x, b.y, b.w, b.h)) { if (b.id === 'resume' && !portrait) APP.paused = false; if (b.id === 'map') exitToMenu(); if (b.id === 'mute') setMute(!muted); if (b.id === 'q') cycleQuality(); } }); if (consume('ok')) APP.paused = false; clearPressed(); }
    else {
      const tp = taps.shift();
      if (tp) { if (usingTouch && hitRect(tp, 16, 72, 40, 34)) APP.paused = true; HUD_SLOTS().forEach(s => { if (Math.hypot(tp.x - s.x, tp.y - s.y) < 38) trySwitch(s.i); }); }
      update(dt);
    }
  } else if (st === 'results') {
    const tp = taps.shift(); let act = null; if (consume('ok')) act = APP.results.mode === 'story' ? 'map' : 'again';
    if (tp) RES_BTNS().forEach(b => { if (hitRect(tp, b.x, b.y, b.w, b.h)) act = b.id; });
    if (act === 'share') shareCard();
    if (act === 'again') { APP.rankSfx = 0; transition(() => { APP.state = 'select'; APP.stT = 0; }); }
    if (act === 'map') { APP.rankSfx = 0; transition(goMap); }
    if (act === 'menu') { APP.rankSfx = 0; transition(() => { APP.state = 'title'; APP.stT = 2; }); }
  }
}
function drawWorldLayer() {
  const st = APP.state;
  if (st === 'title') drawTitleWorld();
  else if (st === 'map') drawStagePan(STAGES[APP.stage], 0.05, 0.3, true, false);
  else if (st === 'shop') drawStagePan(STAGES[0], 0.03, 0.55, false, false);
  else if (st === 'select') drawStagePan(STAGES[APP.mode === 'sixty' ? 0 : APP.stage], 0.04, 0.62, true, false);
  else if (st === 'results') drawStagePan(STAGES[APP.results && APP.results.mode === 'story' ? APP.results.stage : 0], 0.03, 0.62, true, false);
  else if (st === 'comic') drawComicArt();
  else if (st === 'play' && G) {
    ctx.save(); const sh = G.shake; if (sh > 0) ctx.translate(rnd(-sh, sh), rnd(-sh, sh));
    const z = G.zoom * (1 + G.zp); if (z > 1.002) { const fb = G.introCard ? G.introCard.e : null; const fx = sx(fb ? fb.x : G.boss && G.over ? G.boss.x : G.P.x), fy = fb ? fb.y - 140 : 380; ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy); }
    drawWorld(); ctx.restore();
    if (!QUAL.post && G.timeScale < 0.9) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, W, H); }
  }
}
function drawUILayer(portrait) {
  const st = APP.state;
  if (st === 'loading') { ctx.fillStyle = '#120a10'; ctx.fillRect(0, 0, W, H); txt(GAME_TITLE, W / 2, H / 2 - 50, 64, '#ffd23f', 'center', 900, '#3a0000', 10); ctx.fillStyle = '#333'; rrect(W / 2 - 200, H / 2 + 20, 400, 14, 7); ctx.fill(); ctx.fillStyle = '#ff3b4a'; rrect(W / 2 - 200, H / 2 + 20, 400 * loadProgress, 14, 7); ctx.fill(); txt('טוען...', W / 2, H / 2 + 60, 20, '#fff', 'center', 700);
    if (loadDone) { loadStageLayers(STAGES[0]).then(() => { if (APP.state === 'loading') { APP.state = 'title'; APP.stT = 0; } }); APP.state = 'loading2'; } }
  else if (st === 'loading2') { ctx.fillStyle = '#120a10'; ctx.fillRect(0, 0, W, H); txt(GAME_TITLE, W / 2, H / 2 - 50, 64, '#ffd23f', 'center', 900, '#3a0000', 10); txt('מכין את השוק...', W / 2, H / 2 + 40, 20, '#fff', 'center', 700); if (LAYERS.s1 && LAYERS.s1.ready) { APP.state = 'title'; APP.stT = 0; } }
  else if (st === 'title') drawTitleUI();
  else if (st === 'map') drawMapUI();
  else if (st === 'shop') drawShopUI();
  else if (st === 'select') drawSelectUI();
  else if (st === 'comic') drawComicUI();
  else if (st === 'play' && G) {
    drawHUD(); drawCine(); drawIntroCard(); drawSubtitle(); drawTouch();
    if (APP.toast) txt(APP.toast.text, W / 2, 300, 18, '#ffd23f', 'center', 800, '#000', 4);
    if (APP.paused) drawPause();
  } else if (st === 'results') drawResultsUI();
  drawTransition();
  if (portrait) { ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0, 0, W, H); txt('סובבו את המכשיר לרוחב', W / 2, H / 2 - 20, 44, '#ffd23f', 'center', 900, '#000', 6); txt('⟳', W / 2, H / 2 + 60, 80, '#fff', 'center', 700); }
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; APP.t += dt; APP.stT += dt;
  if (APP.toast) { APP.toast.t -= dt; if (APP.toast.t <= 0) APP.toast = null; }
  const playing = APP.state === 'play' && G && !APP.paused;
  perfTick(dt, playing); updateTransition(dt);
  const portrait = IS_TOUCH && window.innerHeight > window.innerWidth;
  handleInput(dt, portrait);
  if (APP.state !== 'play') fxDecay(dt);
  taps.length = Math.min(taps.length, 3);
  // ---- render: world (offscreen -> WebGL post) + UI (crisp, on top) ----
  const grade = APP.state === 'play' && G ? G.S.grade : APP.state === 'comic' ? GRADE_COMIC : GRADE_MENU;
  const flash = APP.state === 'play' && G ? Math.max(0, G.flash) * 1.4 : 0;
  GLASS_NEXT = [];
  if (QUAL.post && APP.state !== 'loading' && APP.state !== 'loading2') {
    ctx = wctx; ctx.setTransform(wcv.width / W, 0, 0, wcv.height / H, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); drawWorldLayer(); ctx.restore();
    FX.flash = Math.max(FX.flash, flash); postRender(grade);
    ctx = hctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  } else if (APP.state !== 'loading' && APP.state !== 'loading2') {
    // low tier: world at reduced resolution offscreen, cheap 2D grade there, one scaled blit, UI stays crisp
    ctx = wctx; ctx.setTransform(wcv.width / W, 0, 0, wcv.height / H, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); drawWorldLayer(); FX.flash = Math.max(FX.flash, flash); grade2D(grade); ctx.restore();
    ctx = hctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(wcv, VIEW.ox * VIEW.dpr, VIEW.oy * VIEW.dpr, W * VIEW.s * VIEW.dpr, H * VIEW.s * VIEW.dpr);
  } else {
    ctx = hctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    const s = VIEW.s * VIEW.dpr; ctx.setTransform(s, 0, 0, s, VIEW.ox * VIEW.dpr, VIEW.oy * VIEW.dpr);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); drawWorldLayer(); FX.flash = Math.max(FX.flash, flash); if (APP.state !== 'loading') grade2D(grade); ctx.restore();
  }
  ctx = hctx; const s = VIEW.s * VIEW.dpr; ctx.setTransform(s, 0, 0, s, VIEW.ox * VIEW.dpr, VIEW.oy * VIEW.dpr);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); drawUILayer(portrait); ctx.restore();
  POST.glass = GLASS_NEXT;
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (APP.state === 'play') APP.paused = true; AC.suspend && AC.suspend(); } else tryResume(); });
// test / debug hooks (used by automated smoke tests)
window.ACE = {
  get app() { return APP; }, get G() { return G; },
  quickStart(ci = 0, mode = 'story', stage = 0) { APP.sel = ci; APP.mode = mode; APP.stage = stage; APP.daily = null; APP.tr = null; startGame(); },
  startStage(i, ci = 0) { this.quickStart(ci, 'story', i); },
  warp(x) { G.P.x = x; G.camX = Math.max(0, x - W * 0.42); },
  clearWave() { G.enemies.forEach(e => { if (!e.boss) { e.dead = true; e.alpha = 0; } }); G.pendingSpawns = []; },
  get audio() { return Object.assign({ state: AC.state }, AUDIO_STATS); }, get layout() { return { W, VIEW, SAFE, BTN }; },
  fillMeter() { TM().meter = 100; }, godMode(on = true) { G.god = on; }, setTime(t) { G.timeLeft = t; },
  get save() { return SAVE; }, resetSave() { localStorage.removeItem(SAVE_KEY); SAVE = loadSave(); APP.stage = 0; },
  setQuality(m) { setQuality(m); }, get qual() { return { mode: QUAL.mode, level: QUAL.level, post: QUAL.post, ok: POST.ok, err: POST.lastErr, ms: POST.ms, wcv: [wcv.width, wcv.height], gl: [glcv.width, glcv.height] }; },
  get perf() { return { fps: PERF.fps, hist: PERF.hist.slice() }; }, goMap() { APP.tr = null; goMap(); },
  layersReady(k) { return !!(LAYERS[k] && LAYERS[k].ready); }, get fx() { return FX; },
  bossHp(frac) { G.bosses.forEach(b => { b.hp = Math.max(1, Math.round(b.max * frac)); }); },
};
setQuality(QUAL.mode, true);
loadAll(); requestAnimationFrame(frame);
