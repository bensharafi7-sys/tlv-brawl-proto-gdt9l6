'use strict';
// ===== Ace-Af team – gameplay (Chapter 1, Stage 1: השוק) =====
const FY0 = 410, FY1 = 530;           // walkable depth band (screen y of feet)
const LEVEL_W = 4700, GRAV = 1700;
const CHARS = [
  { id: 'AceAf', name: 'Ace-Af', vo: 'ace', style: 'אגרוף + קונג פו', weapon: 'אגרופן זהב + מקל', superName: 'חליפה שחורה', color: '#ff3b4a',
    artFace: -1, h: 238, spd: 235, combo: [9, 9, 11, 17], gap: 0.21, range: 108, sp: { name: 'מקל', dmg: 22, range: 140, cd: 0.8, sfx: 'bat', col: '#d9d9e6' }, stat: { spd: 3, pow: 3 },
    vTag: 'ace_1', tagLine: 'הגיע הזמן לסדר חשבון.', vSuper: 'ace_2', superLine: 'זה הכל?', vWin: 'ace_3', winLine: 'העיר שלנו.' },
  { id: 'Daniel', name: 'Daniel', vo: 'dan', style: 'קיקבוקס + קפוארה', weapon: 'שוט שרשרת', superName: 'סופת שרשרת', color: '#2fd6ff',
    artFace: 1, h: 232, spd: 275, combo: [7, 7, 8, 9, 15], gap: 0.17, range: 114, sp: { name: 'שרשרת', dmg: 17, range: 210, cd: 0.75, sfx: 'chain', col: '#cfe8ff', pull: true }, stat: { spd: 4, pow: 2 },
    vTag: 'daniel_1', tagLine: 'תסתכל עליי.', vSuper: 'daniel_2', superLine: 'עוד אחד!', vWin: 'daniel_3', winLine: 'קל מדי.' },
  { id: 'Ravid', name: 'Ravid', vo: 'rav', style: 'נינג\'ה, קטאנה וטונפה', weapon: 'קטאנה + טונפה', superName: 'הצל הכפול', color: '#b46bff',
    artFace: -1, h: 234, spd: 300, combo: [8, 8, 10, 14], gap: 0.15, range: 116, sp: { name: 'דאש', dmg: 20, range: 230, cd: 0.9, sfx: 'blade', col: '#e6d4ff', dash: true }, stat: { spd: 5, pow: 2 },
    vTag: 'ravid_1', tagLine: 'בשקט.', vSuper: 'ravid_2', superLine: 'לא ראית אותי באה.', vWin: 'ravid_3', winLine: 'גמרנו.' },
  { id: 'Benjo', name: 'Benjo', vo: 'ben', style: 'בריון כבד / היאבקות', weapon: 'מחבט עם שרשרת', superName: 'עפים הביתה', color: '#ff9a2e',
    artFace: 1, h: 248, spd: 190, combo: [13, 13, 24], gap: 0.31, range: 122, sp: { name: 'מחבט', dmg: 32, range: 150, cd: 1.0, sfx: 'bat', col: '#ffcf8a', big: true }, stat: { spd: 2, pow: 5 },
    vTag: 'benjo_1', tagLine: 'בוא אליי.', vSuper: 'benjo_2', superLine: 'עכשיו אני כועס!', vWin: 'benjo_3', winLine: 'מי הבא?' },
];
const ETYPES = {
  grunt: { img: 'en_grunt', h: 228, hp: 45, spd: 120, dmg: 8, range: 86, wind: 0.42, cd: 1.1, score: 100, armor: 0, name: 'בריון' },
  knife: { img: 'en_knife', h: 210, hp: 34, spd: 160, dmg: 12, range: 94, wind: 0.32, cd: 1.3, score: 150, armor: 0, lunge: true, name: 'סכינאי' },
  bruiser: { img: 'en_bruiser', h: 268, hp: 150, spd: 75, dmg: 18, range: 108, wind: 0.72, cd: 1.7, score: 350, armor: 3, name: 'גורילה' },
};
const WAVES = [
  { trig: 520, lock: 260, list: [['grunt', 1], ['grunt', -1], ['grunt', 1]] },
  { trig: 1420, lock: 1150, list: [['grunt', 1], ['knife', -1], ['knife', 1], ['grunt', 1]] },
  { trig: 2330, lock: 2060, list: [['bruiser', 1], ['grunt', -1], ['grunt', 1], ['knife', 1]] },
  { trig: 3230, lock: 2960, list: [['knife', 1], ['knife', -1], ['bruiser', 1], ['grunt', -1], ['grunt', 1]] },
];
const BOSS_TRIG = 3990, BOSS_LOCK = 3740;

let G = null;
const SIXTY_LOCK = 1300;
function newGame(startChar, mode = 'story') {
  G = {
    state: 'play', t: 0, time: 0, camX: 0, camLock: null, shake: 0, hitstop: 0, timeScale: 1, slowT: 0, zoom: 1,
    score: 0, cash: 0, combo: 0, comboT: 0, maxCombo: 0, kos: 0, card: false, wave: 0, waveActive: false, goT: 0,
    team: CHARS.map(c => ({ hp: 100, max: 100, meter: 0, down: false })), active: startChar, swCd: 0,
    P: null, enemies: [], pickups: [], crates: [], fx: [], nums: [], projs: [], boss: null, bossPhase: 0, cine: null,
    banner: null, over: false, win: false, lastHitT: -9, flash: 0, introCard: null, pendingSpawns: [], tagFx: null,
    mode, timeLeft: 60, countdown: mode === 'sixty' ? 3.4 : 0, spawnT: 0, crateT: 8, grabHint: false, startChar,
  };
  G.P = { x: 120, y: 470, z: 0, vz: 0, face: 1, st: 'idle', t: 0, atkI: 0, atkT: 0, queued: false, hurtT: 0, inv: 1, spCd: 0, weapon: null, walkT: 0, flashT: 0, airAtk: false, superT: 0, landT: 0, grab: null, grabPush: 0, hit: null };
  if (mode === 'sixty') {
    G.camX = SIXTY_LOCK; G.camLock = SIXTY_LOCK; G.waveActive = true; G.P.x = SIXTY_LOCK + 260;
    const cr = (x, y, items) => G.crates.push({ x, y, hp: 2, items, shake: 0 });
    cr(SIXTY_LOCK + 140, 430, ['falafel']); cr(SIXTY_LOCK + 820, 500, ['cash', 'cash']);
    G.pickups.push({ type: 'pipe', x: SIXTY_LOCK + 480, y: 500, z: 0, t: 0 });
    stopMusic(0.4); return;
  }
  // crates & items
  const cr = (x, y, items, hidden) => G.crates.push({ x, y, hp: 2, items, hidden, shake: 0 });
  cr(820, 420, ['falafel', 'cash']); cr(1760, 500, ['cash', 'cash']); cr(2640, 430, ['falafel']);
  cr(2860, 524, ['card'], true); cr(3480, 470, ['shawarma', 'cash']); cr(3660, 420, ['falafel']);
  G.pickups.push({ type: 'pipe', x: 1020, y: 470, z: 0, t: 0 }, { type: 'bottle', x: 2200, y: 430, z: 0, t: 0 },
    { type: 'cash', x: 640, y: 500, z: 0, t: 0, v: 50 }, { type: 'cash', x: 1900, y: 425, z: 0, t: 0, v: 50 });
  playMusic('music_stage');
  G.banner = { text: 'פרק ראשון: השוק', t: 2.4 };
  setTimeout(() => { if (G && G.mode === 'story' && G.time < 3) voice('narr_1', 'פרק ראשון: השוק', ''); }, 500);
}
const CH = () => CHARS[G.active];
const TM = () => G.team[G.active];

// ---------- spawning ----------
function spawnEnemy(type, side, x, y) {
  const T = ETYPES[type];
  const sx = x != null ? x : (side > 0 ? G.camX + W + rnd(40, 140) : G.camX - rnd(40, 140));
  G.enemies.push({ type, T, x: sx, y: y != null ? y : rnd(FY0 + 10, FY1 - 6), z: 0, vz: 0, vx: 0, face: side > 0 ? -1 : 1, hp: T.hp, max: T.hp,
    st: 'walk', t: 0, cd: rnd(0.4, 1.2), hits: 0, flashT: 0, dead: false, alpha: 1, id: Math.random() });
}
// 60-second mode spawner
function sixtySpawner(dt) {
  const el = 60 - G.timeLeft; G.spawnT -= dt;
  const alive = G.enemies.filter(e => !e.dead).length + G.pendingSpawns.length;
  const want = Math.min(6, 3 + Math.floor(el / 14));
  if (alive < want && G.spawnT <= 0) {
    const bru = G.enemies.filter(e => !e.dead && e.type === 'bruiser').length;
    const r = Math.random(); let type = 'grunt';
    if (el > 22 && bru < (el > 42 ? 2 : 1) && r < 0.22) type = 'bruiser'; else if (el > 8 && r < 0.6) type = 'knife';
    spawnEnemy(type, Math.random() < 0.5 ? 1 : -1); G.spawnT = Math.max(0.35, 1.1 - el / 80);
  }
  G.crateT -= dt; if (G.crateT <= 0) { G.crateT = 12; if (G.crates.filter(c => c.hp > 0).length < 3) { const items = [['falafel'], ['cash', 'cash'], ['shawarma'], ['falafel', 'cash']][Math.floor(rnd(0, 4))];
    G.crates.push({ x: G.camX + rnd(120, W - 120), y: rnd(FY0 + 10, FY1 - 10), hp: 2, items, shake: 0.3 }); } }
}
function sixtyTimeUp() {
  G.over = true; G.win = true; slowmo(0.3, 1.4); G.zoomTo = 1.12; stopMusic(0.3); stinger('ko'); sfx('ko', 0.7);
  G.banner = { text: 'הזמן נגמר!', t: 2.6, big: true };
  G.enemies.forEach(o => { if (!o.dead && o.st !== 'grabbed') killEnemy(o, o.x > G.P.x ? 1 : -1); });
  const C = CH(); setTimeout(() => { if (G && G.state === 'play') voice(C.vWin, C.winLine, C.name); }, 1300);
  setTimeout(() => { if (G && G.state === 'play') endStage(); }, 3000);
}
function startWave(i) {
  const w = WAVES[i]; G.waveActive = true; G.camLock = w.lock; G.wave = i + 1;
  w.list.forEach((e, k) => G.pendingSpawns.push({ at: G.time + k * 0.9, type: e[0], side: e[1] }));
  G.banner = { text: `גל ${i + 1}`, t: 1.4 };
}
function startBoss() {
  G.camLock = BOSS_LOCK; G.waveActive = true; G.bossPhase = 1;
  const T = { img: 'boss_merchant', h: 318, hp: 620, spd: 95, dmg: 16, range: 115, name: 'הסוחר' };
  G.boss = { boss: true, type: 'boss', T, x: BOSS_LOCK + W + 80, y: 460, z: 0, vz: 0, vx: 0, face: -1, hp: T.hp, max: T.hp, st: 'enter', t: 0, cd: 1.5,
    flashT: 0, dead: false, alpha: 1, stagger: 0, summoned: 0, id: 'boss' };
  G.enemies.push(G.boss); stopMusic(1.2);
}

// ---------- combat ----------
function addNum(x, y, v, col = '#fff', big = false) { G.nums.push({ x, y, v, col, t: 0.9, big }); }
function burst(x, y, col = '#fff', n = 10, spd = 300, kind = 'spark') {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd); G.fx.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'debris' || kind === 'juice' || kind === 'glass' ? 220 : 0), t: rnd(0.25, 0.55), max: 0.5, col, r: rnd(2, 5), rot: rnd(0, 6) }); }
}
function ring(x, y, col, r0 = 10, r1 = 70, t = 0.3) { G.fx.push({ kind: 'ring', x, y, col, r0, r1, t, max: t }); }
function shake(a) { G.shake = Math.max(G.shake, a); }
function addMeter(n) { const tm = TM(); tm.meter = Math.min(100, tm.meter + n); }
function hitEnemy(e, dmg, opts = {}) {
  if (e.dead || (e.st === 'down' && !opts.ground) || e.st === 'enter' || e.st === 'getup' && e.t < 0.25) return false;
  if (e.st === 'grabbed' && !opts.held) return false;
  const P = G.P;
  e.hp -= dmg; e.flashT = 0.12; G.combo++; G.comboT = 1.7; G.maxCombo = Math.max(G.maxCombo, G.combo); G.lastHitT = G.time;
  G.score += Math.round(dmg * 10 * (1 + G.combo * 0.05)); addMeter(opts.noMeter ? 0 : dmg * 0.55);
  addNum(e.x, e.y - e.T.h * 0.75 - e.z, dmg, dmg >= 20 ? '#ffd23f' : '#fff', dmg >= 20);
  const hx = e.x - (e.face) * 10, hy = e.y - e.T.h * 0.55 - e.z;
  burst(hx, hy, opts.col || '#fff6c2', dmg >= 20 ? 16 : 9, dmg >= 20 ? 420 : 300); ring(hx, hy, opts.col || '#fff', 8, dmg >= 20 ? 80 : 50, 0.22);
  G.hitstop = Math.max(G.hitstop, dmg >= 20 ? 0.11 : 0.055); shake(dmg >= 20 ? 9 : 4);
  sfx(dmg >= 20 ? 'hit_heavy' : 'hit_light', dmg >= 20 ? 0.9 : 0.7);
  const dir = opts.dir != null ? opts.dir : (e.x >= P.x ? 1 : -1);
  if (!opts.held) e.face = -dir; e.recoil = 1;
  if (e.boss) {
    e.stagger += dmg;
    if (e.hp <= 0) { killEnemy(e, dir); return true; }
    if (e.stagger > 55 || opts.knock === 'big') { e.stagger = 0; e.st = 'hurt'; e.t = 0; e.vx = dir * 160; }
    return true;
  }
  if (opts.held) { if (e.hp <= 0) { releaseGrab(); killEnemy(e, dir, true); } return true; }
  const armored = e.T.armor && !opts.knock && (e.hits = (e.hits || 0) + 1) % (e.T.armor + 1) !== 0 && e.hp > 0;
  if (e.hp <= 0) { killEnemy(e, dir, opts.knock === 'big'); return true; }
  if (opts.knock) { launch(e, dir, opts.knock === 'big' ? 1.6 : 1); }
  else if (!armored) { e.st = 'hurt'; e.t = 0; e.vx = dir * 90; }
  return true;
}
function launch(e, dir, pow = 1) { e.st = 'air'; e.t = 0; e.vz = 380 * pow; e.z = Math.max(e.z, 1); e.vx = dir * 260 * pow; }
function killEnemy(e, dir, big) {
  e.dead = true; launch(e, dir, big ? 1.7 : 1.15); e.hp = 0; G.kos++; G.score += e.T.score || 1000;
  if (!e.boss) {
    if (Math.random() < 0.55) G.pickups.push({ type: 'cash', x: e.x, y: e.y, z: 40, vz: 200, t: 0, v: [20, 50, 100][Math.floor(rnd(0, 3))] });
    const alive = G.enemies.filter(x => !x.dead).length + G.pendingSpawns.length;
    if (alive === 0 && G.waveActive && !G.boss && G.mode === 'story') { slowmo(0.35, 0.7); }
  } else {
    G.score += 5000; slowmo(0.2, 2.2); G.zoomTo = 1.25; sfx('ko', 1); stinger('ko'); stopMusic(0.8); G.over = true; releaseGrab();
    voice('narr_2', 'נוקאאוט!', '');
    G.banner = { text: 'נוקאאוט!', t: 2.4, big: true };
    G.enemies.forEach(o => { if (!o.dead && o !== e) killEnemy(o, o.x > e.x ? 1 : -1); });
    const Gs = G, C = CH(), live = () => G === Gs && G.state === 'play';
    setTimeout(() => { if (live()) voice('boss_2', 'זה לא נגמר...', 'הסוחר'); }, 1500);
    setTimeout(() => { if (live()) { G.banner = { text: 'ניצחון!', t: 2.6, big: true }; voice('narr_3', 'ניצחון!', ''); stinger('win'); G.flash = 0.2; } }, 3400);
    setTimeout(() => { if (live()) voice(C.vWin, C.winLine, C.name); }, 5100);
    setTimeout(() => { if (live()) { G.win = true; endStage(); } }, 6800);
  }
}
function slowmo(scale, dur) { G.timeScale = scale; G.slowT = dur; }
function hitBox(P, range, depth = 34, back = 10) {
  // returns enemies in front of player
  return G.enemies.filter(e => !e.dead && Math.abs(e.y - P.y) < depth + (e.boss ? 14 : 0) && (e.x - P.x) * P.face > -back && (e.x - P.x) * P.face < range + (e.boss ? 30 : 0) && e.z < 90);
}
function hitCrates(P, range) {
  G.crates.forEach(c => { if (c.hp > 0 && Math.abs(c.y - P.y) < 40 && (c.x - P.x) * P.face > -10 && (c.x - P.x) * P.face < range + 20) {
    c.hp--; c.shake = 0.2; sfx('crate', 0.7); burst(c.x, c.y - 30, '#b07a3e', 6, 250, 'debris');
    if (c.hp <= 0) { burst(c.x, c.y - 30, '#9a6630', 16, 380, 'debris'); shake(5); c.items.forEach((it, i) => G.pickups.push({ type: it, x: c.x + (i - (c.items.length - 1) / 2) * 34, y: c.y, z: 30, vz: 260, t: 0, v: 50 })); }
  } });
}
function playerAttack() {
  const P = G.P, C = CH();
  if (P.weapon) {
    const wpn = P.weapon; const dmg = wpn.type === 'pipe' ? 18 : 22; const r = wpn.type === 'pipe' ? 125 : 105;
    P.st = 'atk'; P.t = 0; P.wind = 0; P.hit = null; P.atkDur = 0.3; P.smear = { col: wpn.type === 'pipe' ? '#c9ced6' : '#7fe08a', big: true };
    sfx('whoosh', 0.6);
    let hit = false; hitBox(P, r).forEach(e => { hit = hitEnemy(e, dmg, { knock: wpn.uses <= 1 ? 'big' : null }) || hit; }); hitCrates(P, r);
    if (hit) { wpn.uses--; sfx(wpn.type === 'pipe' ? 'bat' : 'hit_heavy', 0.8); }
    if (wpn.uses <= 0) { if (wpn.type === 'bottle') { sfx('bottle', 0.9); burst(P.x + P.face * 60, P.y - 90, '#9fe8a8', 14, 300, 'glass'); } G.banner = { text: 'הנשק נשבר', t: 0.9, small: true }; P.weapon = null; }
    return;
  }
  const i = P.atkI % C.combo.length; const fin = i === C.combo.length - 1;
  const wind = fin ? 0.085 : 0.045;
  P.st = 'atk'; P.t = 0; P.wind = wind; P.atkDur = C.gap + wind + (fin ? 0.1 : 0); P.atkI++; P.smear = { col: C.id === 'Ravid' ? '#e6d4ff' : '#ffffff', fin, kick: C.id === 'Daniel' ? (i % 2) : 0, alt: i % 2 };
  P.hit = { at: wind, fn: () => {
    sfx(C.id === 'Ravid' ? 'blade' : 'whoosh', 0.5, fin ? 0.8 : 1.1);
    hitBox(P, C.range).forEach(e => hitEnemy(e, C.combo[i], { knock: fin ? 1 : null, col: C.color }));
    hitCrates(P, C.range); if (fin) shake(3); P.x += P.face * (fin ? 14 : 6);
  } };
}
function playerSpecial() {
  const P = G.P, C = CH(), tm = TM();
  if (tm.meter >= 100) { startSuper(); return; }
  if (P.spCd > 0) return;
  const sp = C.sp; P.spCd = sp.cd; P.st = 'sp'; P.t = 0; P.wind = 0; P.atkDur = 0.42; P.smear = { col: sp.col, big: true, sp: true };
  sfx(sp.sfx, 0.9); sfx('whoosh', 0.6, 0.8);
  if (sp.dash) { P.dashFrom = P.x; P.inv = 0.45; P.x = clamp(P.x + P.face * sp.range, camMin() + 30, camMax() - 30);
    G.enemies.filter(e => !e.dead && Math.abs(e.y - P.y) < 42 && Math.min(P.dashFrom, P.x) - 30 < e.x && e.x < Math.max(P.dashFrom, P.x) + 30)
      .forEach(e => hitEnemy(e, sp.dmg, { knock: 1, dir: P.face, col: C.color }));
    for (let k = 0; k < 8; k++) G.fx.push({ kind: 'ghost', x: lerp(P.dashFrom, P.x, k / 8), y: P.y, img: 'hero_' + C.id, h: C.h, face: P.face, artFace: C.artFace, t: 0.3 + k * 0.03, max: 0.5, col: C.color });
    hitCrates(P, 30); return; }
  const targets = hitBox(P, sp.range, sp.pull ? 50 : 40);
  targets.forEach(e => { hitEnemy(e, sp.dmg, { knock: sp.big ? 'big' : (sp.pull ? null : 1), col: C.color });
    if (sp.pull && !e.boss && !e.dead) { e.x = P.x + P.face * 70; e.y = lerp(e.y, P.y, 0.7); e.st = 'hurt'; e.t = -0.25; } });
  hitCrates(P, sp.range);
}
function startSuper() {
  const P = G.P, C = CH(), tm = TM(); tm.meter = 0;
  G.cine = { t: 0, dur: 1.25, ci: G.active, name: C.superName, done: false };
  voice(C.vSuper, C.superLine, C.name); sfx('super', 1); P.inv = 2.2; P.st = 'super'; P.t = 0;
}
function executeSuper(ci) {
  const P = G.P, C = CHARS[ci];
  const onScreen = G.enemies.filter(e => !e.dead && e.x > G.camX - 20 && e.x < G.camX + W + 20 && e.st !== 'enter');
  G.flash = 0.35; shake(16); slowmo(0.45, 0.5);
  if (C.id === 'AceAf') { onScreen.forEach((e, k) => { for (let j = 0; j < 4; j++) setTimeout(() => { if (G && !e.dead) hitEnemy(e, j === 3 ? 22 : 11, { knock: j === 3 ? 'big' : null, noMeter: true, col: '#ff3b4a' }); }, 80 * j + k * 40); }); }
  if (C.id === 'Daniel') { onScreen.forEach(e => { if (!e.boss) { e.x = P.x + (e.x > P.x ? 60 : -60); e.y = lerp(e.y, P.y, 0.8); } });
    for (let j = 0; j < 5; j++) setTimeout(() => { if (!G) return; ring(P.x, P.y - 80, '#2fd6ff', 20, 200, 0.3); sfx('chain', 0.8); G.enemies.filter(e => !e.dead && Math.abs(e.x - P.x) < 230).forEach(e => hitEnemy(e, j === 4 ? 20 : 9, { knock: j === 4 ? 'big' : null, noMeter: true, col: '#2fd6ff' })); }, j * 110); }
  if (C.id === 'Ravid') { onScreen.forEach((e, k) => setTimeout(() => { if (!G || e.dead) return; G.fx.push({ kind: 'slash', x: e.x, y: e.y - e.T.h * 0.5, t: 0.25, max: 0.25, col: '#e6d4ff', a: rnd(-0.6, 0.6) }); sfx('blade', 0.9); hitEnemy(e, 40, { knock: 1, noMeter: true, col: '#b46bff' }); }, k * 120)); }
  if (C.id === 'Benjo') { ring(P.x, P.y, '#ff9a2e', 20, 420, 0.5); sfx('stomp', 1); onScreen.forEach(e => hitEnemy(e, 65, { knock: 'big', noMeter: true, col: '#ff9a2e', dir: e.x >= P.x ? 1 : -1 })); }
}
function trySwitch(to) {
  if (G.swCd > 0 || G.cine) return;
  const n = CHARS.length; let idx = to;
  if (idx == null) { for (let k = 1; k <= n; k++) { const j = (G.active + k) % n; if (!G.team[j].down) { idx = j; break; } } }
  if (idx == null || idx === G.active || G.team[idx].down) { if (idx != null && G.team[idx] && G.team[idx].down) G.banner = { text: `${CHARS[idx].name} מחוץ למשחק`, t: 1, small: true }; return; }
  releaseGrab();
  const P = G.P; const tagAtk = (G.time - G.lastHitT) < 0.75 && G.combo >= 2;
  const from = G.active; G.active = idx; G.swCd = 0.7; P.st = 'idle'; P.t = 0; P.atkI = 0; P.inv = Math.max(P.inv, 0.5);
  G.tagFx = { from, to: idx, t: 0.5, tag: tagAtk };
  sfx('tag', 0.9); burst(P.x, P.y - 80, CHARS[idx].color, 14, 280);
  if (tagAtk) {
    G.banner = { text: 'מתקפת צוות!', t: 1.2 }; voice(CHARS[idx].vTag, CHARS[idx].tagLine, CHARS[idx].name);
    G.fx.push({ kind: 'ghost', x: P.x - P.face * 80, y: P.y, img: 'hero_' + CHARS[from].id, h: CHARS[from].h, face: P.face, artFace: CHARS[from].artFace, t: 0.5, max: 0.5, col: CHARS[from].color });
    P.st = 'sp'; P.t = 0; P.wind = 0; P.atkDur = 0.4; P.smear = { col: CHARS[idx].color, big: true, sp: true };
    hitBox(P, 190, 50, 60).forEach(e => hitEnemy(e, 26, { knock: 'big', col: CHARS[idx].color })); G.score += 500; shake(10); G.flash = 0.15;
  } else voice(CHARS[idx].vTag, CHARS[idx].tagLine, CHARS[idx].name);
}
// ---------- grab / throw ----------
function canGrab(e) { const C = CH(); return !e.boss && !e.dead && e.z < 5 && ['walk', 'idle', 'hurt', 'wind'].includes(e.st) && (e.type !== 'bruiser' || C.id === 'Benjo' || e.hp < e.max * 0.35); }
function startGrab(e) {
  const P = G.P; P.grab = { e, t: 0, knees: 0 }; P.st = 'grab'; P.t = 0; P.grabPush = 0;
  e.st = 'grabbed'; e.t = 0; e.face = -P.face; e.x = P.x + P.face * 58; e.y = P.y; sfx('tag', 0.6, 0.7); shake(2);
  if (!G.grabHint) { G.grabHint = true; G.banner = { text: usingTouch ? 'תפיסה! מכה = ברך · קפיצה/מיוחד = זריקה' : 'תפיסה! J = ברך · K = זריקה לאחור · L = זריקה קדימה', t: 2.2, small: true }; }
}
function releaseGrab(push = true) {
  const P = G && G.P; if (!P || !P.grab) return; const e = P.grab.e; P.grab = null;
  if (e && !e.dead && e.st === 'grabbed') { e.st = 'hurt'; e.t = 0; e.vx = push ? P.face * 160 : 0; }
  if (P.st === 'grab') { P.st = 'idle'; P.t = 0; }
}
function throwGrabbed(dir) { // dir: 1 forward, -1 backward (suplex)
  const P = G.P, C = CH(); const g = P.grab; if (!g) return; const e = g.e; P.grab = null;
  const wd = P.face * dir; P.st = 'throw'; P.t = 0; P.atkDur = 0.42; P.throwDir = dir; P.smear = { col: C.color, big: true };
  if (dir < 0) { e.x = P.x - P.face * 30; P.face = -P.face; }
  sfx('whoosh', 0.9, 0.7); voiceBark();
  hitEnemy(e, 16, { held: true, col: C.color, dir: wd });
  if (!e.dead) { e.st = 'thrown'; e.t = 0; e.vz = 420; e.z = 30; e.vx = wd * 560; e.face = -wd; e.thrHit = {}; }
  G.score += 300; shake(5);
}
function voiceBark() { /* small grunt via sfx; keeps voice lines for big moments */ sfx('hurt', 0.25, 0.8); }
function updateGrab(dt) {
  const P = G.P, g = P.grab, e = g.e; g.t += dt;
  if (e.dead || e.st !== 'grabbed') { releaseGrab(false); return; }
  e.x = P.x + P.face * 58; e.y = P.y; e.face = -P.face;
  for (let i = 1; i <= 4; i++) if (consume('c' + i)) { trySwitch(i - 1); return; }
  if (consume('switch')) { trySwitch(null); return; }
  if (P.kneeT > 0) { P.kneeT -= dt; return; }
  if (consume('jump')) { throwGrabbed(-1); return; }
  if (consume('special')) { throwGrabbed(1); return; }
  if (consume('attack')) {
    const ax = inputAxis(); if (ax.x && Math.sign(ax.x) !== P.face) { throwGrabbed(-1); return; }
    if (g.knees >= 2) { throwGrabbed(1); return; }
    g.knees++; P.kneeT = 0.2; P.kneeA = 0; sfx('hit_light', 0.8, 0.9); hitEnemy(e, 8, { held: true, col: CH().color, dir: P.face }); return;
  }
  if (g.t > 1.7) releaseGrab();
}
function hurtPlayer(dmg, dir, knock) {
  const P = G.P; if (P.inv > 0 || G.cine || G.over || G.god) return false;
  releaseGrab(false);
  const tm = TM(); tm.hp = Math.max(0, tm.hp - dmg); addNum(P.x, P.y - 200, dmg, '#ff5a5a'); P.flashT = 0.15; shake(6); G.hitstop = 0.06;
  sfx('hurt', 0.7); sfx('hit_light', 0.6); G.combo = 0; tm.meter = Math.min(100, tm.meter + dmg * 0.4);
  burst(P.x, P.y - 100, '#ffb0b0', 8, 260);
  if (P.weapon && Math.random() < 0.4) { G.pickups.push({ type: P.weapon.type, x: P.x - dir * 40, y: P.y, z: 30, vz: 200, t: 0, uses: P.weapon.uses }); P.weapon = null; }
  if (tm.hp <= 0) { tm.down = true; P.st = 'down'; P.t = 0; P.vz = 360; P.z = 1; P.kx = dir * 200; P.inv = 2.5; G.banner = { text: `${CH().name} נפל!`, t: 1.4, small: true }; return true; }
  if (knock) { P.st = 'down'; P.t = 0; P.vz = 330; P.z = 1; P.kx = dir * 220; P.inv = 1.6; }
  else { P.st = 'hurt'; P.t = 0; P.kx = dir * 120; P.inv = 0.35; }
  return true;
}
function camMin() { return G.camLock != null ? G.camX : G.camX; }
function camMax() { return G.camX + W; }

// ---------- update ----------
function update(dtReal) {
  if (G.state !== 'play') return;
  if (G.cine) { G.cine.t += dtReal; if (G.cine.t >= G.cine.dur && !G.cine.done) { G.cine.done = true; const ci = G.cine.ci; G.cine = null; executeSuper(ci); } updateFx(dtReal * 0.3); return; }
  if (G.countdown > 0) { const before = Math.ceil(G.countdown); G.countdown -= dtReal; const after = Math.ceil(G.countdown);
    if (after !== before && after > 0) sfx('go', 0.6, 0.9); if (G.countdown <= 0) { sfx('go', 0.9, 1.3); playMusic('music_sixty', 0.05, false); G.banner = { text: 'קדימה!', t: 0.9, big: true }; }
    G.t += dtReal; if (G.banner && G.countdown > 0) G.banner = null; updateFx(dtReal); return; }
  if (G.introCard) { G.introCard.t -= dtReal; if (G.introCard.t <= 0 || (G.introCard.t < 2.2 && (consume('attack') || consume('ok') || taps.length))) { taps.length = 0; G.introCard = null; playMusic('music_boss'); if (G.boss) { G.boss.st = 'idle'; G.boss.t = 0; } } return; }
  if (G.slowT > 0) { G.slowT -= dtReal; if (G.slowT <= 0) { G.timeScale = 1; G.zoomTo = 1; } }
  G.zoom = lerp(G.zoom, G.zoomTo || 1, 0.08);
  if (G.hitstop > 0) { G.hitstop -= dtReal; updateFx(dtReal * 0.2); return; }
  const dt = Math.min(dtReal, 0.05) * G.timeScale;
  G.t += dt; G.time += dt;
  if (G.mode === 'sixty' && !G.over) { G.timeLeft -= dt; if (G.timeLeft <= 0) { G.timeLeft = 0; sixtyTimeUp(); } else sixtySpawner(dt); }
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (G.swCd > 0) G.swCd -= dt;
  if (G.banner) { G.banner.t -= dtReal; if (G.banner.t <= 0) G.banner = null; }
  if (G.flash > 0) G.flash -= dtReal;
  if (G.tagFx) { G.tagFx.t -= dt; if (G.tagFx.t <= 0) G.tagFx = null; }
  if (subtitle) { subtitle.t -= dtReal; if (subtitle.t <= 0) subtitle = null; }
  // bench regen
  G.team.forEach((tm, i) => { if (i !== G.active && !tm.down) tm.hp = Math.min(tm.max, tm.hp + 1.2 * dt); });
  updatePlayer(dt);
  // spawns
  G.pendingSpawns = G.pendingSpawns.filter(s => { if (G.time >= s.at) { spawnEnemy(s.type, s.side); return false; } return true; });
  G.enemies.forEach(e => e.boss ? updateBoss(e, dt) : updateEnemy(e, dt));
  G.enemies = G.enemies.filter(e => e.alpha > 0);
  updateProjs(dt); updatePickups(dt); updateFx(dt);
  G.crates.forEach(c => { if (c.shake > 0) c.shake -= dt; });
  // waves / camera
  const P = G.P;
  if (G.mode === 'sixty') { G.camX = lerp(G.camX, G.camLock, 0.1); }
  else if (!G.waveActive) {
    const target = clamp(P.x - W * 0.42, 0, LEVEL_W - W); G.camX = Math.max(G.camX, lerp(G.camX, target, 0.12));
    const wi = G.wave; if (wi < WAVES.length && P.x > WAVES[wi].trig) startWave(wi);
    else if (wi >= WAVES.length && !G.boss && P.x > BOSS_TRIG) startBoss();
  } else {
    G.camX = lerp(G.camX, G.camLock, 0.1);
    const alive = G.enemies.filter(e => !e.dead).length + G.pendingSpawns.length;
    if (alive === 0 && !G.boss) { G.waveActive = false; G.camLock = null; G.goT = 3; sfx('go', 0.7); }
  }
  if (G.goT > 0) G.goT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 40 * dtReal);
}
function updatePlayer(dt) {
  const P = G.P, C = CH(), tm = TM();
  P.t += dt; if (P.inv > 0) P.inv -= dt; if (P.flashT > 0) P.flashT -= dt; if (P.spCd > 0) P.spCd -= dt; if (P.landT > 0) P.landT -= dt;
  if (P.hit && P.t >= P.hit.at) { const h = P.hit; P.hit = null; if (P.st === 'atk') h.fn(); }
  // vertical physics
  if (P.z > 0 || P.vz > 0) { P.vz -= GRAV * dt; P.z += P.vz * dt; if (P.z <= 0) { P.z = 0; P.vz = 0; if (P.st === 'jump' || P.st === 'jatk') { P.st = 'idle'; P.landT = 0.14; burst(P.x, P.y, '#d8c8a8', 5, 120, 'dust'); } } }
  const minX = G.camX + 28, maxX = (G.waveActive ? G.camX + W - 28 : Math.min(LEVEL_W - 30, G.camX + W - 28));
  if (P.st === 'down') {
    P.x = clamp(P.x + (P.kx || 0) * dt, minX, maxX); P.kx *= 0.94;
    if (P.z <= 0 && P.t > 0.9) {
      if (tm.down) { // auto-switch
        const nxt = G.team.findIndex(t => !t.down);
        if (nxt < 0) { if (!G.over) { G.over = true; G.win = false; G.banner = { text: 'הצוות נפל...', t: 3, big: true }; stopMusic(1); setTimeout(() => { if (G && G.state === 'play') endStage(); }, 2400); } return; }
        G.active = nxt; P.st = 'idle'; P.t = 0; P.inv = 1.5; P.atkI = 0; sfx('tag', 1); burst(P.x, P.y - 80, CHARS[nxt].color, 16, 300);
        voice(CHARS[nxt].vTag, CHARS[nxt].tagLine, CHARS[nxt].name);
      } else { P.st = 'idle'; P.t = 0; }
    }
    return;
  }
  if (P.st === 'hurt') { P.x = clamp(P.x + (P.kx || 0) * dt, minX, maxX); if (P.t > 0.28) { P.st = 'idle'; P.t = 0; } return; }
  if (P.st === 'super') { if (P.t > 0.5) { P.st = 'idle'; } return; }
  if (P.grab) { updateGrab(dt); return; }
  if (P.st === 'throw') { if (P.t >= P.atkDur) { P.st = 'idle'; P.t = 0; } return; }
  if (G.over) { if (P.st === 'walk') P.st = 'idle'; return; }
  // input
  const ax = inputAxis();
  for (let i = 1; i <= 4; i++) if (consume('c' + i)) trySwitch(i - 1);
  if (consume('switch')) trySwitch(null);
  const busy = (P.st === 'atk' || P.st === 'sp') && P.t < P.atkDur;
  if (consume('special') && P.z === 0 && (!busy || P.t > P.atkDur * 0.6)) { playerSpecial(); return; }
  if (consume('jump') && P.z === 0 && !busy) { P.st = 'jump'; P.t = 0; P.vz = 640; P.z = 1; P.airAtk = false; sfx('whoosh', 0.3, 1.4); }
  if (consume('attack')) {
    if (P.z > 0 && !P.airAtk) { P.airAtk = true; P.st = 'jatk'; P.t = 0; sfx('whoosh', 0.6); }
    else if (P.z === 0) {
      if (busy && P.t < P.atkDur * 0.45) P.queued = true;
      else { if (!busy || P.t >= P.atkDur) { if (G.time - (P.lastAtkT || 0) > 0.6) P.atkI = 0; } P.lastAtkT = G.time; playerAttack(); }
    }
  }
  if (P.queued && busy && P.t >= P.atkDur * 0.6) { P.queued = false; P.lastAtkT = G.time; playerAttack(); }
  if (P.st === 'jatk') { hitBox(P, C.range + 10, 40, 10).forEach(e => { if (!e.jHit) { e.jHit = true; hitEnemy(e, 14, { knock: 1, col: C.color }); setTimeout(() => e.jHit = false, 400); } }); }
  if ((P.st === 'atk' || P.st === 'sp') && P.t >= P.atkDur) { P.st = 'idle'; P.t = 0; }
  const canMove = !(P.st === 'atk' || P.st === 'sp');
  const sp = C.spd * (P.z > 0 ? 0.95 : 1);
  if (canMove) {
    P.x = clamp(P.x + ax.x * sp * dt, minX, maxX); P.y = clamp(P.y + ax.y * sp * 0.62 * dt, FY0, FY1);
    if (ax.x) P.face = ax.x > 0 ? 1 : -1;
    if (P.z === 0 && P.st !== 'jump') { if (ax.x || ax.y) { if (P.st !== 'walk') { P.st = 'walk'; } P.walkT += dt * sp / 60; } else if (P.st === 'walk') P.st = 'idle'; }
    // walking into an enemy -> grab
    if (P.z === 0 && (P.st === 'walk') && ax.x && Math.sign(ax.x) === P.face) {
      const tgt = G.enemies.find(e => canGrab(e) && Math.abs(e.y - P.y) < 20 && (e.x - P.x) * P.face > 15 && (e.x - P.x) * P.face < 74);
      if (tgt) { P.grabPush += dt; if (P.grabPush > 0.16) startGrab(tgt); } else P.grabPush = 0;
    } else P.grabPush = 0;
  } else { P.x = clamp(P.x, minX, maxX); }
}
function updateEnemy(e, dt) {
  const P = G.P, T = e.T; e.t += dt; if (e.flashT > 0) e.flashT -= dt; if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - dt * 4);
  if (e.st === 'grabbed') { if (!P.grab || P.grab.e !== e) { e.st = 'hurt'; e.t = 0; e.vx = 0; } return; }
  if (e.st === 'thrown') {
    e.vz -= GRAV * dt; e.z += e.vz * dt; e.x += e.vx * dt; e.t += 0;
    G.enemies.forEach(o => { if (o !== e && !o.dead && !e.thrHit[o.id] && o.st !== 'grabbed' && Math.abs(o.x - e.x) < 60 && Math.abs(o.y - e.y) < 38 && o.z < 90) {
      e.thrHit[o.id] = 1; hitEnemy(o, 22, { knock: o.boss ? null : 1, dir: Math.sign(e.vx), col: '#ffd23f' }); G.score += 250; addNum(o.x, o.y - 230, 'פגיעה!', '#ffd23f'); } });
    if (e.z <= 0) { e.z = 0; e.vz = 0; e.st = 'down'; e.t = 0; sfx('stomp', 0.9, 1.1); burst(e.x, e.y, '#d8c8a8', 12, 220, 'dust'); shake(8); G.hitstop = 0.05;
      e.hp -= 12; addNum(e.x, e.y - 160, 12, '#ffd23f'); if (e.hp <= 0) killEnemy(e, Math.sign(e.vx) || 1); }
    return;
  }
  if (e.st === 'air') {
    e.vz -= GRAV * dt; e.z += e.vz * dt; e.x += e.vx * dt;
    if (e.z <= 0) { e.z = 0; e.vz = 0; e.st = 'down'; e.t = 0; sfx('stomp', 0.35, 1.3); burst(e.x, e.y, '#d8c8a8', 7, 160, 'dust'); shake(3); }
    return;
  }
  if (e.st === 'down') { if (e.dead) { if (e.t > 0.9) e.alpha -= dt * 2.5; } else if (e.t > 0.85) { e.st = 'getup'; e.t = 0; } return; }
  if (e.st === 'getup') { if (e.t > 0.35) { e.st = 'walk'; e.t = 0; e.cd = rnd(0.3, 0.8); } return; }
  if (e.st === 'hurt') { e.x += e.vx * dt; e.vx *= 0.9; if (e.t > 0.32) { e.st = 'walk'; e.t = 0; e.cd = Math.max(e.cd, 0.35); } return; }
  if (P.st === 'down' && TM().down) { e.st = 'walk'; }
  if (G.over) { e.st = 'idle'; return; }
  // AI
  const dx = P.x - e.x, dy = P.y - e.y, adx = Math.abs(dx);
  if (e.st === 'walk' || e.st === 'idle') {
    e.cd -= dt;
    const attackers = G.enemies.filter(o => !o.dead && (o.st === 'wind' || o.st === 'attack')).length;
    const side = dx > 0 ? -1 : 1; const wantX = P.x + side * (T.range * 0.8); const wantY = P.y;
    const near = adx < T.range && Math.abs(dy) < 22;
    let mx = 0, my = 0;
    if (!near || e.cd > 0 || attackers >= 2) {
      const hold = (e.cd > 0 || attackers >= 2) && adx < T.range * 2.2;
      const tx = hold ? P.x + side * (T.range * 1.7 + (e.id * 60 % 50)) : wantX;
      mx = Math.abs(tx - e.x) > 8 ? Math.sign(tx - e.x) : 0; my = Math.abs(wantY - e.y) > 6 ? Math.sign(wantY - e.y) : 0;
      if (hold && Math.random() < 0.01) my = rnd(-1, 1);
    } else if (e.cd <= 0) { e.st = 'wind'; e.t = 0; e.face = dx > 0 ? 1 : -1; }
    // separation
    G.enemies.forEach(o => { if (o !== e && !o.dead && Math.abs(o.x - e.x) < 50 && Math.abs(o.y - e.y) < 20) { mx += Math.sign(e.x - o.x || 1) * 0.6; my += Math.sign(e.y - o.y || 1) * 0.5; } });
    e.x += mx * T.spd * dt; e.y = clamp(e.y + my * T.spd * 0.6 * dt, FY0, FY1);
    if (mx || my) e.walkT = (e.walkT || 0) + dt * T.spd / 55;
    e.st = (mx || my) && e.st !== 'wind' ? 'walk' : (e.st === 'wind' ? 'wind' : 'idle');
    if (e.st !== 'wind') e.face = dx > 0 ? 1 : -1;
    // don't wander too far off-screen once on
    if (!G.waveActive) e.x = clamp(e.x, G.camX - 200, G.camX + W + 200);
    return;
  }
  if (e.st === 'wind') { if (e.t >= T.wind) { e.st = 'attack'; e.t = 0; e.didHit = false; if (T.lunge) e.vx = e.face * 420; sfx('whoosh', 0.5, T.lunge ? 1.3 : 0.8); } return; }
  if (e.st === 'attack') {
    if (T.lunge) { e.x += e.vx * dt; e.vx *= 0.88; }
    if (!e.didHit && e.t > 0.06) { e.didHit = true;
      if (Math.abs(P.y - e.y) < 30 && (P.x - e.x) * e.face > -10 && (P.x - e.x) * e.face < T.range + 20 && P.z < 60) {
        if (T.lunge) sfx('blade', 0.6); hurtPlayer(T.dmg, e.face, e.type === 'bruiser'); } }
    if (e.t > 0.32) { e.st = 'walk'; e.t = 0; e.cd = T.cd * rnd(0.8, 1.3); }
  }
}
function updateBoss(e, dt) {
  const P = G.P, T = e.T; e.t += dt; if (e.flashT > 0) e.flashT -= dt;
  const enraged = G.bossPhase === 2, spd = enraged ? 1.25 : 1;
  if (e.st === 'air') { e.vz -= GRAV * dt; e.z += e.vz * dt; e.x += e.vx * dt * 0.5; if (e.z <= 0) { e.z = 0; e.st = 'down'; e.t = 0; shake(10); sfx('stomp', 1); } return; }
  if (e.st === 'down') { if (e.dead && e.t > 2.5) e.alpha -= dt; return; }
  if (e.st === 'enter') { e.x -= 120 * dt; e.face = -1; e.walkT = (e.walkT || 0) + dt * 2; if (e.x < BOSS_LOCK + W - 220) { e.st = 'card'; G.introCard = { t: 4.4 }; voice('boss_1', 'מי נגע לי בדוכן? עכשיו אתם בצרות!', 'הסוחר'); sfx('stomp', 1); shake(8); } return; }
  if (e.st === 'card') return;
  if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - dt * 4);
  if (e.st === 'hurt') { e.x += e.vx * dt; e.vx *= 0.9; if (e.t > 0.4) { e.st = 'idle'; e.t = 0; } return; }
  if (G.over) return;
  // phase change
  if (G.bossPhase === 1 && e.hp < e.max * 0.5) { G.bossPhase = 2; e.st = 'summon'; e.t = 0; G.banner = { text: 'שלב 2 – הסוחר מתעצבן!', t: 1.6 }; shake(10); G.flash = 0.2; }
  if (e.st === 'summon') { if (e.t > 0.8 && e.summoned < 1) { e.summoned = 1; spawnEnemy('grunt', -1); spawnEnemy('knife', 1); G.pickups.push({ type: 'shawarma', x: G.camX + W / 2, y: 430, z: 200, vz: 0, t: 0 }); } if (e.t > 1.4) { e.st = 'idle'; e.t = 0; e.cd = 0.6; } return; }
  if (G.bossPhase === 2 && e.hp < e.max * 0.25 && e.summoned < 2) { e.summoned = 2; spawnEnemy('grunt', 1); spawnEnemy('grunt', -1); }
  const dx = P.x - e.x, adx = Math.abs(dx), dy = P.y - e.y;
  if (e.st === 'idle' || e.st === 'walk') {
    e.cd -= dt * spd; e.face = dx > 0 ? 1 : -1;
    if (e.cd <= 0) {
      const r = Math.random();
      if (adx < T.range + 20 && Math.abs(dy) < 34) { e.st = 'punchW'; e.t = 0; }
      else if (enraged && r < 0.45) { e.st = 'rollW'; e.t = 0; e.laneY = P.y; }
      else if (r < 0.75) { e.st = 'throwW'; e.t = 0; e.tx = P.x; e.ty = P.y; }
      else { e.cd = 0.4; }
      return;
    }
    const tx = P.x - e.face * (T.range * 0.85); const mx = Math.abs(tx - e.x) > 10 ? Math.sign(tx - e.x) : 0; const my = Math.abs(dy) > 8 ? Math.sign(dy) : 0;
    e.x = clamp(e.x + mx * T.spd * spd * dt, G.camX + 60, G.camX + W - 60); e.y = clamp(e.y + my * T.spd * 0.6 * dt, FY0, FY1);
    e.st = (mx || my) ? 'walk' : 'idle'; if (mx || my) e.walkT = (e.walkT || 0) + dt * 2.2;
    return;
  }
  if (e.st === 'punchW') { if (e.t > 0.62 / spd) { e.st = 'punch'; e.t = 0; sfx('whoosh', 0.8, 0.7);
      if (Math.abs(P.y - e.y) < 36 && (P.x - e.x) * e.face > -10 && (P.x - e.x) * e.face < T.range + 40) hurtPlayer(T.dmg, e.face, true); } return; }
  if (e.st === 'punch') { if (e.t > 0.45) { e.st = 'idle'; e.t = 0; e.cd = rnd(0.9, 1.5); } return; }
  if (e.st === 'throwW') { if (e.t < 0.5) { e.tx = lerp(e.tx, P.x, 0.08); e.ty = lerp(e.ty, P.y, 0.08); }
    if (e.t > 0.9 / spd) { e.st = 'throw'; e.t = 0; sfx('whoosh', 0.9, 0.6);
      const n = enraged ? 3 : 1; for (let k = 0; k < n; k++) { const ox = k === 0 ? 0 : (k === 1 ? -90 : 90); G.projs.push({ kind: 'melon', x0: e.x + e.face * 20, y0: e.y, x: e.x, y: e.y, z: 200, tx: e.tx + ox, ty: clamp(e.ty + (k ? rnd(-30, 30) : 0), FY0, FY1), t: 0, dur: 0.75, spin: 0 }); } }
    return; }
  if (e.st === 'throw') { if (e.t > 0.5) { e.st = 'idle'; e.t = 0; e.cd = rnd(1.0, 1.6); } return; }
  if (e.st === 'rollW') { if (e.t > 0.95) { e.st = 'roll'; e.t = 0; for (let k = 0; k < 3; k++) G.projs.push({ kind: 'roll', x: e.x, y: e.laneY, z: 0, vx: (dx > 0 ? 1 : -1) * 560, delay: k * 0.28, t: 0, spin: 0 }); sfx('stomp', 0.8); } return; }
  if (e.st === 'roll') { if (e.t > 1.2) { e.st = 'idle'; e.t = 0; e.cd = rnd(0.8, 1.4); } return; }
}
function updateProjs(dt) {
  const P = G.P;
  G.projs = G.projs.filter(p => {
    p.t += dt; p.spin += dt * 10;
    if (p.kind === 'melon') {
      const k = Math.min(1, p.t / p.dur); p.x = lerp(p.x0, p.tx, k); p.y = lerp(p.y0, p.ty, k); p.z = 200 * (1 - k) + Math.sin(k * Math.PI) * 160;
      if (k >= 1) { burst(p.tx, p.ty - 10, '#ff4d6d', 14, 360, 'juice'); burst(p.tx, p.ty - 10, '#2f9e44', 8, 300, 'debris'); ring(p.tx, p.ty, '#ff8fa3', 10, 70, 0.3); sfx('crate', 0.8, 0.7); shake(5);
        if (Math.hypot((P.x - p.tx) * 0.7, (P.y - p.ty) * 1.4) < 62 && P.z < 50) hurtPlayer(17, P.x > p.tx ? 1 : -1, true); return false; }
      return true;
    }
    if (p.kind === 'roll') {
      if (p.t < p.delay) return true; p.x += p.vx * dt;
      if (Math.abs(P.x - p.x) < 36 && Math.abs(P.y - p.y) < 24 && P.z < 30) { if (hurtPlayer(14, Math.sign(p.vx), true)) { burst(p.x, p.y - 20, '#ff4d6d', 12, 300, 'juice'); return false; } }
      return p.x > G.camX - 100 && p.x < G.camX + W + 100;
    }
    return false;
  });
}
function updatePickups(dt) {
  const P = G.P;
  G.pickups = G.pickups.filter(p => {
    p.t += dt;
    if (p.z > 0 || p.vz > 0) { p.vz = (p.vz || 0) - GRAV * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = p.vz < -150 ? -p.vz * 0.3 : 0; } }
    if (P.st === 'down' || p.t < 0.3) return true;
    if (Math.abs(P.x - p.x) < 42 && Math.abs(P.y - p.y) < 26 && P.z < 40) {
      const tm = TM();
      if (p.type === 'cash') { G.cash += p.v || 50; G.score += (p.v || 50) * 5; sfx('coin', 0.8); addNum(p.x, p.y - 50, '₪' + (p.v || 50), '#7dff8a'); }
      else if (p.type === 'falafel') { tm.hp = Math.min(tm.max, tm.hp + 30); sfx('eat', 0.9); addNum(p.x, p.y - 60, '+30', '#7dff8a'); }
      else if (p.type === 'shawarma') { tm.hp = tm.max; sfx('eat', 1); const d = G.team.findIndex(t => t.down);
        if (d >= 0) { G.team[d].down = false; G.team[d].hp = 50; G.banner = { text: `${CHARS[d].name} חזר למשחק!`, t: 1.6 }; } else addNum(p.x, p.y - 60, 'מלא!', '#7dff8a'); }
      else if (p.type === 'pipe' || p.type === 'bottle') { if (P.weapon) return true; P.weapon = { type: p.type, uses: p.uses || (p.type === 'pipe' ? 10 : 3) }; sfx('tag', 0.6, 0.8); G.banner = { text: p.type === 'pipe' ? 'צינור!' : 'בקבוק!', t: 0.9, small: true }; }
      else if (p.type === 'card') { G.card = true; G.score += 2000; sfx('super', 0.6, 1.3); G.banner = { text: 'קלף לוחם נמצא! 1/60', t: 2.2 }; G.flash = 0.15; }
      burst(p.x, p.y - 30, '#fff7b0', 8, 200); return false;
    }
    return true;
  });
}
function updateFx(dt) {
  G.fx = G.fx.filter(f => { f.t -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.kind !== 'spark') f.vy += 900 * dt; f.vx *= 0.97; f.rot += dt * 8; } return f.t > 0; });
  G.nums = G.nums.filter(n => { n.t -= dt; n.y -= 60 * dt; return n.t > 0; });
}

// ---------- render ----------
function sx(x) { return x - G.camX; }
function drawSprite(key, x, y, h, face, artFace, o = {}) {
  const img = IMG[key]; if (!img) return;
  const w = img.width * h / img.height;
  ctx.save(); ctx.translate(x + (o.ox || 0), y + (o.oy || 0));
  ctx.rotate(o.rot || 0); ctx.scale((face === artFace ? 1 : -1) * (o.sx || 1), o.sy || 1);
  const al = o.alpha != null ? o.alpha : 1; ctx.globalAlpha = al;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 22; }
  const tim = o.tint ? IMG[key + '_' + o.tint] : null, ta = al * (o.tintA || 0.7);
  const iw = img.width, ih = img.height;
  const piece = (sy0, sy1, dy0, dy1) => { ctx.globalAlpha = al; ctx.drawImage(img, 0, sy0, iw, sy1 - sy0, -w / 2, dy0, w, dy1 - dy0); if (tim) { const sb = ctx.shadowBlur; ctx.shadowBlur = 0; ctx.globalAlpha = ta; ctx.drawImage(tim, 0, sy0, iw, sy1 - sy0, -w / 2, dy0, w, dy1 - dy0); ctx.shadowBlur = sb; } };
  const r = o.rig;
  if (!r) piece(0, ih, -h, 0);
  else { // two-part rig: legs (shear = stride) + upper body (lean / reach) pivoting at the hip
    const hip = r.hip, af = artFace, yh = -h * hip, sh = ih * (1 - hip), ov = 0.025;
    ctx.save(); ctx.translate(0, yh); ctx.transform(1, 0, (r.shear || 0) * af, r.lsy || 1, 0, 0); piece(sh, ih, 0, h * hip); ctx.restore();
    ctx.save(); ctx.translate((r.uox || 0) * af, yh + (r.uoy || 0)); ctx.rotate((r.lean || 0) * af); piece(0, Math.min(ih, sh + ih * ov), -h * (1 - hip), h * ov); ctx.restore();
  }
  ctx.restore();
}
function shadow(x, y, r, z = 0) { const k = 1 / (1 + z / 200); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, r * k, r * 0.28 * k, 0, 0, Math.PI * 2); ctx.fill(); }
function depthScale(y) { return 0.88 + 0.14 * (y - FY0) / (FY1 - FY0); }
function drawWorld() {
  // background: Ari's market panorama, scrolls 1:1 with the floor, mirrored tiles beyond its width
  const bg = IMG.bg_market;
  if (bg) { const bw = bg.width * H / bg.height; const i0 = Math.floor(G.camX / bw);
    for (let i = i0 - 1; i <= i0 + 1; i++) { const x = Math.round(i * bw - G.camX); ctx.save(); if (i % 2) { ctx.translate(x + bw, 0); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, bw, H); } else ctx.drawImage(bg, x, 0, bw, H); ctx.restore(); } }
  // boss arena marker
  if (G.boss && G.camLock != null) { ctx.fillStyle = 'rgba(120,0,0,0.12)'; ctx.fillRect(0, FY0 - 12, W, H - FY0 + 12); }
  // telegraphs
  G.enemies.forEach(e => { if (e.boss && e.st === 'throwW') { const k = Math.min(1, e.t / 0.9); ctx.strokeStyle = `rgba(255,40,40,${0.5 + 0.4 * Math.sin(G.t * 30)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx(e.tx), e.ty, 60 * k + 10, 20 * k + 4, 0, 0, Math.PI * 2); ctx.stroke(); if (G.bossPhase === 2) [-90, 90].forEach(o => { ctx.beginPath(); ctx.ellipse(sx(e.tx + o), e.ty, 50 * k, 16 * k, 0, 0, Math.PI * 2); ctx.stroke(); }); }
    if (e.boss && e.st === 'rollW') { ctx.fillStyle = `rgba(255,30,30,${0.18 + 0.15 * Math.sin(G.t * 25)})`; ctx.fillRect(0, e.laneY - 22, W, 44); txt('!', sx(e.x) + e.face * 80, e.laneY - 40, 40, '#ff3030', 'center', 900, '#000', 5); } });
  // collect drawables
  const D = [];
  G.crates.forEach(c => { if (c.hp > 0) D.push({ y: c.y, f: () => drawCrate(c) }); });
  G.pickups.forEach(p => D.push({ y: p.y, f: () => drawPickup(p) }));
  G.enemies.forEach(e => D.push({ y: e.y, f: () => drawEnemy(e) }));
  G.projs.forEach(p => D.push({ y: p.y, f: () => drawProj(p) }));
  D.push({ y: G.P.y + 0.1, f: drawPlayer });
  G.fx.forEach(f => { if (f.kind === 'ghost') D.push({ y: f.y - 0.1, f: () => drawSprite(f.img, sx(f.x), f.y, f.h * depthScale(f.y), f.face, f.artFace, { alpha: f.t / f.max * 0.5, tint: 'W', tintA: 0.6 }) }); });
  D.sort((a, b) => a.y - b.y).forEach(d => d.f());
  // fx
  G.fx.forEach(f => {
    const a = clamp(f.t / f.max, 0, 1);
    if (f.kind === 'spark') { ctx.strokeStyle = f.col; ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx(f.x), f.y); ctx.lineTo(sx(f.x) - f.vx * 0.04, f.y - f.vy * 0.04); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.kind === 'ring') { const k = 1 - a; ctx.strokeStyle = f.col; ctx.globalAlpha = a; ctx.lineWidth = 5 * a + 1; ctx.beginPath(); ctx.arc(sx(f.x), f.y, lerp(f.r0, f.r1, k), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.kind === 'slash') { ctx.save(); ctx.translate(sx(f.x), f.y); ctx.rotate(f.a); ctx.strokeStyle = f.col; ctx.globalAlpha = a; ctx.lineWidth = 8 * a + 2; ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(90, 0); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }
    else if (f.kind !== 'ghost') { ctx.fillStyle = f.col; ctx.globalAlpha = a; ctx.save(); ctx.translate(sx(f.x), f.y); ctx.rotate(f.rot); const r = f.kind === 'dust' ? f.r * 3 * (1.5 - a) : f.r; if (f.kind === 'dust') { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); } else ctx.fillRect(-r, -r / 2, r * 2, r); ctx.restore(); ctx.globalAlpha = 1; }
  });
  G.nums.forEach(n => { const a = clamp(n.t / 0.9, 0, 1); ctx.globalAlpha = a; txt(String(n.v), sx(n.x), n.y, n.big ? 34 : 24, n.col, 'center', 900, '#000', 5); ctx.globalAlpha = 1; });
}
function drawCrate(c) {
  const x = sx(c.x) + (c.shake > 0 ? rnd(-3, 3) : 0), y = c.y; shadow(x, y, 34);
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#9b6a35'; ctx.fillRect(-32, -56, 64, 56); ctx.strokeStyle = '#5e3c18'; ctx.lineWidth = 4; ctx.strokeRect(-32, -56, 64, 56);
  ctx.beginPath(); ctx.moveTo(-32, -56); ctx.lineTo(32, 0); ctx.moveTo(32, -56); ctx.lineTo(-32, 0); ctx.stroke();
  ctx.fillStyle = c.hidden ? '#7a5228' : '#c0392b'; ctx.beginPath(); ctx.arc(-14, -62, 9, 0, 7); ctx.arc(10, -63, 10, 0, 7); ctx.fill(); ctx.restore();
}
function drawPickup(p) {
  const x = sx(p.x), y = p.y - p.z - 6 + Math.sin(p.t * 5) * 3; shadow(sx(p.x), p.y, 18, p.z);
  ctx.save(); ctx.translate(x, y);
  if (p.type === 'cash') { ctx.fillStyle = '#3fae49'; ctx.fillRect(-16, -12, 32, 18); ctx.strokeStyle = '#1d5e24'; ctx.lineWidth = 2; ctx.strokeRect(-16, -12, 32, 18); txt('₪', 0, -3, 16, '#e8ffe8', 'center', 900); }
  else if (p.type === 'falafel') { ctx.fillStyle = '#f2d39a'; ctx.beginPath(); ctx.ellipse(0, -10, 20, 14, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#7a4a1c'; [-8, 0, 8].forEach(o => { ctx.beginPath(); ctx.arc(o, -18, 6, 0, 7); ctx.fill(); }); ctx.fillStyle = '#3fae49'; ctx.fillRect(-12, -24, 24, 4); }
  else if (p.type === 'shawarma') { ctx.rotate(-0.3); ctx.fillStyle = '#f5deb3'; ctx.fillRect(-10, -40, 20, 40); ctx.fillStyle = '#a0522d'; ctx.fillRect(-8, -46, 16, 10); ctx.fillStyle = '#3fae49'; ctx.fillRect(-9, -40, 4, 6); ctx.fillStyle = '#e74c3c'; ctx.fillRect(3, -41, 4, 6); }
  else if (p.type === 'pipe') { ctx.rotate(-0.5); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-36, -8, 72, 10); ctx.fillStyle = '#6b7480'; ctx.fillRect(-40, -10, 10, 14); }
  else if (p.type === 'bottle') { ctx.rotate(-0.4); ctx.fillStyle = 'rgba(70,170,90,0.9)'; ctx.fillRect(-9, -34, 18, 30); ctx.fillRect(-4, -46, 8, 14); }
  else if (p.type === 'card') { ctx.rotate(Math.sin(p.t * 3) * 0.2); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffd23f'; ctx.fillRect(-16, -48, 32, 44); ctx.shadowBlur = 0; ctx.fillStyle = '#7a1f1f'; ctx.fillRect(-12, -44, 24, 36); txt('★', 0, -26, 18, '#ffd23f', 'center', 900); }
  ctx.restore();
}
function drawProj(p) {
  if (p.kind === 'roll' && p.t < p.delay) return;
  const x = sx(p.x), y = p.y - p.z; shadow(x, p.y, 22, p.z);
  ctx.save(); ctx.translate(x, y - 18); ctx.rotate(p.spin); ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -6); ctx.quadraticCurveTo(0, -14, 20, -6); ctx.moveTo(-22, 4); ctx.quadraticCurveTo(0, -2, 22, 4); ctx.stroke(); ctx.restore();
}
const ease = k => 1 - (1 - k) * (1 - k);
// attack curve: anticipation (back) -> strike (forward, overshoot) -> follow-through settle. returns about -0.8..1.15
function atkCurve(k, wf) {
  if (k < wf) return -0.8 * ease(k / wf);
  const k2 = (k - wf) / (1 - wf);
  if (k2 < 0.28) return lerp(-0.8, 1.15, ease(k2 / 0.28));
  const k3 = (k2 - 0.28) / 0.72; return 1.15 * (1 - ease(k3)) - 0.1 * Math.sin(k3 * Math.PI);
}
function poseFor(o, isHero) {
  // procedural animation -> sprite transform + 2-part rig {lean, uox, uoy, shear, lsy}
  const t = o.t, st = o.st; let ox = 0, oy = 0, rot = 0, sxx = 1, syy = 1, lean = 0, uox = 0, uoy = 0, shear = 0, lsy = 1;
  const ph = typeof o.id === 'number' ? o.id * 10 : 0;
  if (st === 'idle' || st === 'card') { const b = Math.sin(G.t * 3.2 + ph); uoy = b * 1.6; syy = 1 + b * 0.008; lean = 0.02 + b * 0.012; }
  else if (st === 'walk' || st === 'enter') { const w = (o.walkT || 0) * 2.2; oy = -Math.abs(Math.sin(w)) * 6; shear = Math.sin(w) * 0.14; lean = 0.06 + Math.cos(w * 2) * 0.02; uoy = Math.abs(Math.cos(w)) * 2; rot = Math.sin(w) * 0.02 * o.face; syy = 1 + Math.abs(Math.cos(w)) * 0.015; }
  else if ((st === 'atk' || st === 'sp' || st === 'throw') && isHero) {
    const d = o.atkDur || 0.3, k = clamp(t / d, 0, 1), wf = clamp((o.wind || 0.02) / d, 0.1, 0.4), c = atkCurve(k, wf), cp = Math.max(0, c), cn = Math.min(0, c);
    const big = st !== 'atk' || (o.smear && o.smear.fin);
    lean = c * (big ? 0.26 : 0.18); uox = c * (big ? 22 : 14); sxx = 1 + cp * 0.05; syy = 1 - cp * 0.03 - cn * 0.03; shear = cp * 0.16; ox = o.face * cp * 8;
    if (o.smear && o.smear.alt && !big) { lean *= 0.7; uoy = -cp * 4; }
    if (o.smear && o.smear.kick) { lean = -cp * 0.2 + cn * 0.1; shear = cp * 0.5; lsy = 1 - cp * 0.06; oy = -cp * 6; uox = -c * 4; }
    if (st === 'throw') { lean = o.throwDir < 0 ? -c * 0.4 : c * 0.32; uoy = -Math.abs(c) * 6; }
  }
  else if (st === 'attack' || st === 'punch') { const k = clamp(t / 0.32, 0, 1), c = atkCurve(k, 0.06), cp = Math.max(0, c); lean = c * 0.22; uox = c * 16; shear = cp * 0.18; ox = o.face * cp * 6; sxx = 1 + cp * 0.04; }
  else if (st === 'throw') { const k = clamp(t / 0.5, 0, 1), c = atkCurve(k, 0.05); lean = c * 0.28; uox = c * 18; uoy = -Math.max(0, c) * 8; }
  else if (st === 'wind' || st === 'punchW' || st === 'throwW' || st === 'rollW') { const k = clamp(t / ((o.T && o.T.wind) || 0.6), 0, 1), e = ease(k); lean = -0.16 * e; uox = -8 * e; syy = 1 - 0.03 * k; shear = -0.05 * k; ox = rnd(-1, 1) * k;
    if (st === 'throwW' || st === 'rollW') { lean = -0.24 * e; uoy = -5 * k; } }
  else if (st === 'hurt') { const r = 1 - clamp(t / 0.3, 0, 1); lean = -0.3 * r; uox = -10 * r; rot = -o.face * 0.06 * r; ox = rnd(-2, 2) * r; sxx = 1 - 0.04 * r; }
  else if (st === 'grabbed') { lean = -0.18 - (o.recoil || 0) * 0.15; uox = -4; syy = 0.98; ox = rnd(-1, 1); }
  else if (st === 'grab') { const kn = o.kneeT > 0 ? Math.sin((1 - o.kneeT / 0.2) * Math.PI) : 0; lean = 0.1 + kn * 0.08; uox = 6; shear = kn * 0.38; lsy = 1 - kn * 0.08; }
  else if (st === 'air' || st === 'thrown') { rot = -o.face * clamp(t * 4, 0, 1.3); lean = -0.2; shear = 0.15; }
  else if (st === 'down') { rot = -o.face * 1.45; oy = 6; }
  else if (st === 'getup') { const k = clamp(t / 0.35, 0, 1); rot = -o.face * 1.45 * (1 - k); lean = 0.15 * (1 - k); }
  else if (st === 'jump') { const up = o.vz > 0; syy = up ? 1.07 : 0.99; sxx = up ? 0.95 : 1.01; lean = up ? 0.05 : -0.04; shear = up ? -0.12 : 0.08; lsy = up ? 0.88 : 0.95; rot = o.face * 0.05; }
  else if (st === 'jatk') { lean = 0.2; shear = 0.45; lsy = 0.9; rot = o.face * 0.2; }
  else if (st === 'super') { syy = 1.05 + Math.sin(G.t * 30) * 0.02; lean = -0.1; uoy = -3; }
  else if (st === 'summon') { oy = -Math.abs(Math.sin(t * 12)) * 10; lean = -0.15; }
  if (o.landT > 0) { const k = o.landT / 0.14; syy *= 1 - 0.1 * k; sxx *= 1 + 0.08 * k; }
  if (o.recoil > 0 && st !== 'hurt' && st !== 'grabbed') { lean -= 0.12 * o.recoil; uox -= 5 * o.recoil; }
  return { ox, oy, rot, sx: sxx, sy: syy, rig: { hip: isHero ? 0.48 : (o.boss ? 0.45 : 0.47), lean, uox, uoy, shear, lsy } };
}
function drawSmear(x, y, h, face, sm, k) {
  const a = 1 - k; if (a <= 0) return; const big = sm.big || sm.fin; const R = big ? 78 : 56;
  ctx.save(); ctx.translate(x + face * (big ? 38 : 30), y - h * (sm.kick ? 0.42 : 0.6)); ctx.scale(face, 1);
  ctx.strokeStyle = sm.col; ctx.globalAlpha = a * 0.85; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.lineWidth = (big ? 14 : 9) - i * 4; ctx.beginPath(); ctx.arc(0, 0, R - i * 9, -1.1 + k * 0.6, 1.0 + k * 0.6); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawPlayer() {
  const P = G.P, C = CH(), s = depthScale(P.y), h = C.h * s, x = sx(P.x), y = P.y - P.z;
  shadow(x, P.y, 44 * s, P.z);
  const pose = poseFor(P, true);
  const blink = P.inv > 0 && P.st !== 'super' && P.st !== 'sp' && Math.floor(G.t * 20) % 2 === 0 && P.st !== 'down';
  const opts = Object.assign({}, pose, { alpha: blink ? 0.55 : 1 });
  if (P.flashT > 0) { opts.tint = 'W'; opts.tintA = 0.75; }
  if (P.st === 'super' || TM().meter >= 100) opts.glow = C.color;
  if (P.st === 'down' && TM().down) { opts.tint = 'K'; opts.tintA = 0.35; }
  const striking = (P.st === 'atk' || P.st === 'sp' || P.st === 'throw') && P.t > (P.wind || 0);
  if (striking && P.t < (P.atkDur || 0.3) * 0.7) [0.07, 0.035].forEach((dt, k) => { const gp = poseFor(Object.assign({}, P, { t: Math.max(0, P.t - dt) }), true);
    drawSprite('hero_' + C.id, x, y, h, P.face, C.artFace, Object.assign(gp, { alpha: 0.16 + k * 0.1, tint: 'W', tintA: 0.55 })); });
  drawSprite('hero_' + C.id, x, y, h, P.face, C.artFace, opts);
  if ((striking || P.st === 'jatk') && P.smear) { const w0 = P.st === 'jatk' ? 0 : (P.wind || 0); drawSmear(x, y, h, P.face, P.st === 'jatk' ? { col: C.color, kick: 1 } : P.smear, clamp((P.t - w0) / Math.max(0.08, (P.atkDur || 0.3) * 0.8 - w0), 0, 1)); }
  if (P.weapon) { const wk = P.st === 'atk' ? atkCurve(clamp(P.t / (P.atkDur || 0.3), 0, 1), 0.15) : 0; ctx.save(); ctx.translate(x + P.face * (34 + wk * 14), y - h * 0.55); ctx.rotate(P.face * (P.st === 'atk' ? 1.1 * wk - 0.2 : -0.6)); ctx.fillStyle = P.weapon.type === 'pipe' ? '#9aa3ad' : 'rgba(70,170,90,0.95)';
    if (P.weapon.type === 'pipe') ctx.fillRect(-5, -70, 10, 76); else { ctx.fillRect(-8, -36, 16, 30); ctx.fillRect(-4, -48, 8, 14); } ctx.restore(); }
}
function drawEnemy(e) {
  const T = e.T, s = depthScale(e.y), h = T.h * s, x = sx(e.x), y = e.y - e.z;
  shadow(x, e.y, (e.boss ? 60 : 40) * s, e.z);
  const pose = poseFor(e, false);
  const opts = Object.assign({}, pose, { alpha: e.alpha });
  if (e.flashT > 0) { opts.tint = 'W'; opts.tintA = 0.8; }
  else if (e.st === 'wind' || e.st === 'punchW' || e.st === 'throwW' || e.st === 'rollW') { opts.tint = 'R'; opts.tintA = 0.25 + 0.25 * Math.sin(G.t * 35); }
  if (e.dead && e.st === 'down') opts.alpha = e.alpha * (Math.floor(G.t * 16) % 2 ? 1 : 0.4);
  drawSprite(T.img, x, y, h, e.face, -1, opts);
  if ((e.st === 'attack' || e.st === 'punch') && e.t < 0.25) drawSmear(x, y, h, e.face, { col: e.type === 'knife' ? '#dfe6ee' : '#ffb3b3', big: e.boss || e.type === 'bruiser' }, e.t / 0.25);
  if (e.st === 'wind' || e.st === 'punchW') txt('!', x, y - h - 18, 34, '#ff3030', 'center', 900, '#000', 5);
  // small hp bar for regular enemies
  if (!e.boss && !e.dead && e.hp < e.max) { const bw = 50; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2, y - h - 8, bw, 6); ctx.fillStyle = '#ff4757'; ctx.fillRect(x - bw / 2, y - h - 8, bw * e.hp / e.max, 6); }
}
