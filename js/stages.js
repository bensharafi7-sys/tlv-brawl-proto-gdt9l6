'use strict';
// ===== v4: Chapter 1 – five stages, save/progress, upgrades shop, cutscenes =====
const W1 = 1273, W5 = 1752;   // logical width of one background tile (main layer at 540 tall)
const STAGES = [
  { id: 1, key: 's1', name: 'השוק', sub: 'שוק הכרמל · שקיעה', w: 4700, music: 'music_stage', hpMul: 1,
    sky: ['#f5a25a', '#4a1d2a'], far: { k: 0.3, y: 0, h: 1 }, haze: '#ffb070',
    grade: { lift: [0.02, 0.006, 0], gain: [1.06, 1.0, 0.92], sat: 1.12, con: 1.06, vig: 0.42, bloom: 0.42, thr: 0.6, tint: '#ff9a40' },
    charMul: '#fff0dc', rim: '#ffc27a', rimDir: -1, rimA: 0.6, flicker: true, lightA: 0.32, lightR: 60, amb: ['dust', 'spice'],
    lightShafts: [{ x: 300, y0: 0, y1: 520, w0: 70, w1: 220, dx: 260, a: 0.12, col: 'rgba(255,190,110,0.9)' }, { x: 1700, y0: 0, y1: 520, w0: 50, w1: 180, dx: 240, a: 0.1, col: 'rgba(255,190,110,0.9)' }],
    fg: { k: 1.4, spacing: 950 }, fgProps: [0, 3, 4], fgHang: [3, 4],
    backProps: [{ i: 6, x: 700, y: 404, h: 70 }, { i: 1, x: 1560, y: 404, h: 90 }, { i: 5, x: 2480, y: 404, h: 92 }, { i: 2, x: 3300, y: 404, h: 60 }, { i: 6, x: 4150, y: 404, h: 70 }],
    waves: [
      { trig: 520, lock: 260, list: [['grunt', 1], ['grunt', -1], ['grunt', 1]] },
      { trig: 1420, lock: 1150, list: [['grunt', 1], ['knife', -1], ['knife', 1], ['grunt', 1]] },
      { trig: 2330, lock: 2060, list: [['bruiser', 1], ['grunt', -1], ['grunt', 1], ['knife', 1]] },
      { trig: 3230, lock: 2960, list: [['knife', 1], ['knife', -1], ['bruiser', 1], ['grunt', -1], ['grunt', 1]] },
      { trig: 3990, lock: 3740, list: [['bruiser', 1], ['knife', -1], ['grunt', 1], ['knife', 1], ['grunt', -1], ['bruiser', -1]], final: true, title: 'מארב!' },
    ],
    crates: [[820, 420, ['falafel', 'cash']], [1760, 500, ['cash', 'cash']], [2640, 430, ['falafel']], [2860, 524, ['card'], true], [3480, 470, ['shawarma', 'cash']], [3660, 420, ['falafel']]],
    pickups: [['pipe', 1020, 470], ['bottle', 2200, 430], ['cash', 640, 500], ['cash', 1900, 425]],
    newEnemy: 'בריון · סכינאי · גורילה', tip: 'הולכים לתוך אויב = תפיסה. החזיקו אגרוף לטעינת מכה כבדה.' },
  { id: 2, key: 's2', name: 'הסמטאות', sub: 'לילה בשוק', w: 4400, music: 'music_stage', musicRate: 0.92, musicLP: 1400, hpMul: 1.06,
    sky: ['#0b1730', '#05060c'], far: { k: 0.2, y: 0, h: 0.62 }, haze: '#2a6f8f',
    grade: { lift: [0, 0.008, 0.03], gain: [0.94, 1.0, 1.1], sat: 1.04, con: 1.1, vig: 0.58, bloom: 0.6, thr: 0.52, tint: '#2a62a8' },
    charMul: '#a9bad6', rim: '#7feaff', rimDir: 1, rimA: 0.7, flicker: true, lightA: 0.45, lightR: 80, amb: ['rain', 'dust'],
    fg: { k: 1.45, spacing: 820 }, fgProps: [1, 2, 4, 6], fgHang: [4, 6],
    backProps: [{ i: 0, x: 900, y: 404, h: 92 }, { i: 5, x: 1700, y: 404, h: 62 }, { i: 3, x: 2600, y: 404, h: 58 }, { i: 0, x: 3400, y: 404, h: 92 }, { i: 1, x: 2150, y: 404, h: 250, light: '#ffcf7a', lx: 0.05, ly: 0.93, lr: 110 }],
    waves: [
      { trig: 520, lock: 260, list: [['grunt', 1], ['bottle', 1], ['grunt', -1]] },
      { trig: 1400, lock: 1140, list: [['bottle', 1], ['knife', -1], ['grunt', 1], ['bottle', -1]] },
      { trig: 2280, lock: 2020, list: [['bruiser', 1], ['bottle', 1], ['knife', -1], ['grunt', 1], ['bottle', -1]] },
    ],
    boss: { kind: 'abdu', trig: 3260, lock: 3000 },
    crates: [[760, 430, ['falafel']], [1850, 520, ['card'], true], [2500, 440, ['cash', 'cash']], [2950, 500, ['shawarma']]],
    pickups: [['pipe', 1100, 480], ['cash', 600, 470], ['cash', 2100, 500], ['bottle', 2700, 450]],
    newEnemy: 'זורק בקבוקים', tip: 'זורקי הבקבוקים שומרים מרחק – רוצו אליהם. מיני-בוס: עבדו האבטיחים.', comic: 2 },
  { id: 3, key: 's3', name: 'הגגות', sub: 'מעל השוק · דמדומים', w: 4400, music: 'music_sixty', hpMul: 1.12,
    sky: ['#6b4a8f', '#f08a6b'], far: { k: 0.18, y: 0, h: 0.75 }, haze: '#e08aa0',
    grade: { lift: [0.03, 0.0, 0.035], gain: [1.05, 0.96, 1.02], sat: 1.12, con: 1.05, vig: 0.42, bloom: 0.45, thr: 0.6, tint: '#d26a9a' },
    charMul: '#f6d2d6', rim: '#ffa070', rimDir: -1, rimA: 0.65, flicker: true, lightA: 0.3, lightR: 55, amb: ['dust', 'feather'],
    fg: { k: 1.5, spacing: 1000 }, fgProps: [0, 6, 2], fgHang: [],
    backProps: [{ i: 3, x: 800, y: 404, h: 64 }, { i: 5, x: 1650, y: 404, h: 86 }, { i: 1, x: 2400, y: 404, h: 110 }, { i: 4, x: 3150, y: 404, h: 120 }, { i: 3, x: 3900, y: 404, h: 60 }],
    waves: [
      { trig: 520, lock: 260, list: [['parkour', 1], ['grunt', -1], ['grunt', 1]] },
      { trig: 1400, lock: 1140, list: [['parkour', 1], ['knife', -1], ['parkour', -1], ['grunt', 1]] },
      { trig: 2280, lock: 2020, list: [['bruiser', 1], ['parkour', 1], ['bottle', -1], ['parkour', -1]] },
      { trig: 3150, lock: 2890, list: [['parkour', 1], ['parkour', -1], ['knife', 1], ['parkour', 1], ['bruiser', -1]], final: true, title: 'הקרב על הגג' },
    ],
    crates: [[700, 470, ['cash']], [1500, 430, ['falafel', 'cash']], [2550, 510, ['shawarma']], [3320, 524, ['card'], true]],
    pickups: [['pipe', 900, 470], ['cash', 1900, 440], ['cash', 2700, 500]],
    newEnemy: 'הפארקוריסט', tip: 'הפארקוריסט קופץ ובועט מרחוק – זוזו למעלה או למטה כשהוא מזנק.', comic: 3 },
  { id: 4, key: 's4', name: 'המחסן', sub: 'חדר הקירור שמאחורי השוק', w: 4200, music: 'music_boss', musicRate: 0.9, musicLP: 2200, hpMul: 1.18,
    sky: ['#0a121a', '#0a121a'], far: null,
    grade: { lift: [0, 0.01, 0.025], gain: [0.92, 1.0, 1.08], sat: 0.88, con: 1.08, vig: 0.5, bloom: 0.5, thr: 0.58, tint: '#6aa8d8' },
    charMul: '#c2d6e6', rim: '#c8f2ff', rimDir: 1, rimA: 0.6, flicker: false, lightA: 0.4, lightR: 90, amb: ['frost', 'dust'],
    lightShafts: [{ x: 360, y0: 40, y1: 540, w0: 40, w1: 260, dx: -110, a: 0.1, col: 'rgba(200,240,255,0.9)' }, { x: 1060, y0: 40, y1: 540, w0: 40, w1: 240, dx: -100, a: 0.09, col: 'rgba(255,240,200,0.9)' }],
    fg: { k: 1.45, spacing: 860 }, fgProps: [0, 2, 1], fgHang: [0, 2], fgDark: 0.6,
    backProps: [{ i: 3, x: 900, y: 404, h: 110 }, { i: 5, x: 1600, y: 404, h: 90 }, { i: 6, x: 2350, y: 404, h: 80 }, { i: 4, x: 3050, y: 404, h: 64 }, { i: 5, x: 3700, y: 404, h: 90 }],
    waves: [
      { trig: 520, lock: 260, list: [['butcher', 1], ['grunt', -1], ['knife', 1]] },
      { trig: 1400, lock: 1140, list: [['butcher', 1], ['parkour', -1], ['bottle', 1], ['grunt', -1]] },
      { trig: 2250, lock: 1990, list: [['butcher', 1], ['butcher', -1], ['knife', 1], ['grunt', -1]] },
    ],
    boss: { kind: 'twins', trig: 3000, lock: 2740 },
    crates: [[1100, 520, ['card'], true], [1700, 430, ['falafel']], [2500, 470, ['cash', 'cash']], [2850, 430, ['shawarma']]],
    pickups: [['pipe', 800, 470], ['cash', 1300, 450], ['bottle', 2000, 490]],
    newEnemy: 'הקצב', tip: 'הקצבים עמידים – תפסו וזרקו אותם. מיני-בוס: התאומים חומוס תוקפים בזוג.', comic: 4 },
  { id: 5, key: 's5', name: 'זירת הסוחר', sub: 'הקרב האחרון של פרק 1', w: 2 * W5, music: 'music_stage', musicRate: 1.04, hpMul: 1.22,
    sky: ['#1a0a14', '#3a1010'], far: null,
    grade: { lift: [0.03, 0.0, 0.012], gain: [1.08, 0.95, 0.9], sat: 1.12, con: 1.1, vig: 0.5, bloom: 0.6, thr: 0.52, tint: '#ff5a2a' },
    charMul: '#ffd2b4', rim: '#ff8a40', rimDir: 1, rimA: 0.7, flicker: true, lightA: 0.42, lightR: 70, amb: ['ember'],
    fg: { k: 1.45, spacing: 1100 }, fgProps: [0, 2], fgHang: [],
    backProps: [{ i: 3, x: 700, y: 404, h: 84 }, { i: 4, x: 1400, y: 404, h: 60 }, { i: 2, x: 1950, y: 404, h: 110, light: '#ff8a30', ly: 0.95, lr: 120 }],
    waves: [
      { trig: 500, lock: 240, list: [['shield', 1], ['grunt', -1], ['knife', 1]] },
      { trig: 1300, lock: 1040, list: [['shield', 1], ['shield', -1], ['bottle', 1], ['parkour', -1], ['butcher', 1]] },
    ],
    boss: { kind: 'merchant', center: W5 + W5 / 2 },
    crates: [[900, 520, ['card'], true], [1600, 440, ['falafel', 'cash']], [2050, 500, ['shawarma']]],
    pickups: [['pipe', 700, 470], ['cash', 1150, 460]],
    newEnemy: 'שומר עם מגן', tip: 'מגן נשבר רק ממכה כבדה, תפיסה או זריקה. הסוחר: שלושה שלבים – בשלב האחרון הוא דורס עם עגלה משוריינת!', comic: 5 },
];
// ---------- save ----------
const SAVE_KEY = 'aceaf_save_v4';
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 4) return s; } catch (e) { } return { v: 4, unlocked: 1, cleared: {}, cards: {}, cash: 0, up: { hp: 0, dmg: 0, sup: 0 }, seenIntro: false, sel: 1 }; }
let SAVE = loadSave();
function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }
const UPGRADES = [
  { id: 'hp', name: 'חיים', desc: '+15 חיים מקסימליים לכל הצוות', icon: '❤', col: '#ff4d6d', cost: [250, 500, 900] },
  { id: 'dmg', name: 'כוח', desc: '+10% נזק לכל המכות', icon: '✊', col: '#ffb02e', cost: [300, 600, 1000] },
  { id: 'sup', name: 'טעינת סופר', desc: '+20% מהירות טעינת הסופר', icon: '⚡', col: '#4fd2ff', cost: [250, 500, 900] },
];
const upMaxHp = () => 100 + 15 * (SAVE.up.hp || 0);
const upDmg = () => 1 + 0.1 * (SAVE.up.dmg || 0);
const upSup = () => 1 + 0.2 * (SAVE.up.sup || 0);
function rankFor(R) { // S/A/B/C from time, damage taken and combo
  let p = 0; p += R.maxCombo >= 25 ? 3 : R.maxCombo >= 15 ? 2 : R.maxCombo >= 8 ? 1 : 0;
  p += R.dmgTaken < 60 ? 3 : R.dmgTaken < 150 ? 2 : R.dmgTaken < 260 ? 1 : 0;
  p += R.time < 150 ? 2 : R.time < 240 ? 1 : 0; p += R.card ? 1 : 0;
  return p >= 8 ? 'S' : p >= 6 ? 'A' : p >= 3 ? 'B' : 'C';
}
const RANK_ORDER = { S: 4, A: 3, B: 2, C: 1 };
// ---------- cutscenes between stages (comic pages + narrator / uncle voice) ----------
// page: {bg, art: 'uncle'|'stage key'|..., chars:[], cap, lines:[{who,text,vo}]}
const STAGE_COMICS = {
  2: [{ bg: 'night', art: 'uncle', cap: 'בית קפה קטן בקצה השוק. הדוד יודע כל מה שקורה כאן.', lines: [{ who: 'הדוד', text: 'הסוחר שלח אנשים לסמטה. שימו לב לבקבוקים!', vo: 'unc_2' }] },
    { bg: 'night', art: 's2', chars: ['Ravid', 'Benjo'], cap: 'פרק 1 · שלב 2: הסמטאות', lines: [{ who: '', text: 'לילה בשוק. החושך מסתיר הרבה.', vo: 'nar_2' }] }],
  3: [{ bg: 'purple', art: 'uncle', cap: 'עבדו ברח – והשאיר אחריו מפתח לגגות.', lines: [{ who: 'הדוד', text: 'הם בורחים לגגות. שם הם קופצים מהר.', vo: 'unc_3' }] },
    { bg: 'dawn', art: 's3', chars: ['Daniel', 'AceAf'], cap: 'פרק 1 · שלב 3: הגגות', lines: [{ who: '', text: 'על הגגות רואים את כל תל אביב.', vo: 'nar_3' }] }],
  4: [{ bg: 'night', art: 'uncle', cap: 'מהגג רואים משאית קירור נכנסת למחסן האחורי.', lines: [{ who: 'הדוד', text: 'במחסן יש קצבים. תפסו ותזרקו אותם!', vo: 'unc_4' }] },
    { bg: 'night', art: 's4', chars: ['Benjo', 'Ravid'], cap: 'פרק 1 · שלב 4: המחסן', lines: [{ who: '', text: 'קר במחסן. קר כמו קרח.', vo: 'nar_4' }] }],
  5: [{ bg: 'fire', art: 'uncle', cap: 'התאומים דיברו. הסוחר מחכה בזירה שלו – עם צבא שומרים.', lines: [{ who: 'הדוד', text: 'לשומרים יש מגן. מכה כבדה שוברת אותו!', vo: 'unc_5' }] },
    { bg: 'fire', art: 's5', chars: ['AceAf', 'Daniel', 'Ravid', 'Benjo'], cap: 'פרק 1 · שלב 5: זירת הסוחר', lines: [{ who: '', text: 'הזירה של הסוחר. אין דרך חזרה.', vo: 'nar_5' }] }],
};
const COMIC_FINALE = [
  { bg: 'fire', chars: ['boss'], cap: 'הסוחר על הרצפה. השוק נושם שוב.', lines: [{ who: 'הסוחר', text: 'זה לא נגמר...', vo: 'boss_2' }] },
  { bg: 'night', chars: ['Ravid', 'AceAf'], cap: 'בכיס שלו: כרטיס ביקור של "מגדלי עזאזל"... וכתובת בנמל יפו.', lines: [{ who: 'Ravid', text: 'הנמל. מחר בלילה.' }, { who: 'Ace-Af', text: 'העיר שלנו.', vo: 'ace_3' }] },
  { bg: 'dark', art: 'uncle', cap: 'באותו לילה, בבית הקפה הקטן...', lines: [{ who: 'הדוד', text: 'כן. הם ניצחו את הסוחר. אני מטפל בזה.', vo: 'unc_end' }] },
  { bg: 'dawn', chars: ['Daniel', 'Benjo'], cap: 'סוף פרק 1 · פרק 2: הנמל – בקרוב', lines: [{ who: '', text: 'בקרוב...' }] },
];
