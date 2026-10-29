# בנג׳ו ברחוב — V2 (playtest build) — 2026-10-29

## מה השתנה מול V1
- **תנועה קולנועית רציפה**: "ריג" פרוצדורלי — כל דמות (PNG יחיד) מצוירת כ-14 רצועות אופקיות עם הטיית גו, נדנוד אגן וצעד ברגליים, squash/stretch, נשימה בעמידה, wind-up → lunge → recover עם easing, הרמה הדרגתית בזמן תפיסה/זריקה, afterimages (motion blur) בריצה/נגיחה/זעם, hit-stop, רעידת מצלמה ו-zoom-punch במכות כבדות. אין החלפת תמונות סטטיות.
- **4 שלבים**: הסמטה → המוסכים → החניון → הגשר, כל אחד עם הרקע הנעול שלו (parallax קל). מעבר שלבים עם fade + באנר.
- **4 אויבים אנושיים מהתמונות הנעולות** (חיתוך רקע אוטומטי): רזה/מהיר (HP 30, מהיר, נתפס), כבד (HP 95, מסה 2, איטי, לא נתפס), בוס הסמטה (סוף שלב 1, HP 260, ריצת הסתערות עם סימון אדום), בוס הגשר (בוס סופי, HP 420, הסתערות + "רקיעה" אזורית עם סימון). לבוסים פס חיים עליון ו-super-armor על מכות קלות בזמן מכה.
- **מצב זעם**: מד מתמלא ממכות וממכות שספגת; V / כפתור "זעם" → 8 שנ׳ מהירות ×1.35, נזק ×1.6, נזק נספג ×0.6, גוון ורוד-אדום + הילה + afterimages.
- **נגיחה (dash/tackle)**: החזק Shift (או כפתור "נגיחה") לריצת טעינה, שחרר → נגיחה שעוברת דרך כמה אויבים; לחיצה כפולה על חץ = נגיחה קצרה מיידית.
- **אורך**: 14 גלים סה״כ (4+3+3+4) + 2 בוסים; 3 חיים; ריפוי חלקי בין שלבים.
- **HUD**: ניקוד, ♥ חיים, HP, מד זעם, שלב/גל, קומבו גדול במרכז, פס בוס. טאץ׳: 5 כפתורים (3 גדולים + נגיחה + זעם), ללא HUD מעל הפקדים.
- **ללא מוזיקה** (רק SFX סינתיסייזר).
- נכסים: רקעים הוקטנו ל-1280px JPG (~250KB), אויבים PNG שקוף 480px (~160KB). `alley.png` הישן הוסר.
- `#sim` — בוט בדיקה עובר את כל 4 השלבים (בדיקת יציבות).

## מגבלות ידועות
- עדיין תמונה אחת לכל דמות — הריג מעוות אותה, אבל אין גפיים אמיתיות (אגרוף = lunge + הבזק). sprite sheet אמיתי ישדרג מאוד.
- כיוון הפנים המקורי של חלק מהאויבים ניחוש (`srcFace` ב-ETYPES).
- רקעים מורחבים ע״י שכפול+מראה (תפר סימטרי).
- אין קפיצה, אין מוזיקה, איזון ראשוני בלבד.

## V2.1 (29.10.2026) — אחרי פידבק פלייטסט של בן
- **תנועת קרב (פרוצדורלית, מקסימום בלי ארט חדש):** STRIPS 14→22; פרמטר `reach` שדוחף קדימה רק את רצועות הכתפיים/ידיים בזמן שהרגליים נטועות; `crouch` = כיווץ גוף תחתון (נחיתת צעד / הכנה למכה). אגרופים: wind-up חזק (משיכה לאחור + squash, ease-in קובי) → מכה מתפרצת (ease-out-back) → recover. זרוע+אגרוף מצוירים עם smear וקווי פגיעה בפריימים אקטיביים (במקום משולש). Afterimages מציגים את תנוחת המכה. הליכה: צעד/ירך גדולים יותר, bob אנכי מסונכרן, squash בנחיתת רגל. פגיעה: רתיעה + פלאש חזק יותר. אויבים: אותו wind-up/strike מוגזם + אגרוף מצויר.
- **חץ «קדימה»** מצביע ימינה (➜) + חץ גדול מהבהב בצד ימין.
- **תפיסה/זריקה:** כפתור «תפיסה»; רמז צף «תפיסה» / «C תפיסה» כשאויב ניתן לתפיסה מולך; «זרוק!» בזמן החזקה. טווח רחב יותר וסלחנות בכיוון. גם `heavy` ניתן לתפיסה (כשהוא פגוע/מתחת 60% חיים; הרמה איטית יותר, זריקה קצרה יותר). בוסים — לא.
- **SFX:** הוחלפו לרעש מסונן + thump נמוך, דרך compressor, עוצמה נמוכה וקצרה יותר.
- **מוזיקה:** עדיין אין — בכוונה. ממתין לאישור בן על טרק Sol Style. hook מוכן: `AUDIO.bgm` (מושתק, בלי src).

### מגבלות שנשארו
- זו עדיין דפורמציה של PNG יחיד. אנימציית גפיים אמיתית (ידיים/רגליים זזות) מחייבת פריימים של ספרייטים מ-Ari (idle/walk/light/heavy/hurt/knock/grab/throw לכל דמות).
- BGM — אחרי שבן מאשר את טרק Sol.

## V2.1.1 — grab/throw reliability + visuals (code only)
- Grab: radius 150px forward, 40px behind, ±60px depth; picks closest grabbable (front-weighted). 0.18s input buffer so a tap just before reaching range still grabs; grab can cancel light-punch recovery.
- Rules: bosses never; thin always; heavy when HP<60% or hit within last 0.9s / hurt / knocked.
- Holding: second press always throws (after short lift); light hits no longer make you drop — only big hits.
- Visual: held enemy lifted high above Benjo with ease-out over ~0.25s, scaled ~80%, tilted, drawn AFTER player (no "image on image"); persistent «זרוק!» hint above it.
- Throw: higher arc, continuous spin, impact as before.
- No new art, no music change, no fake limb animation.

## V2.2 — frame animation (2026-10-29)
- Punch (light / combo / heavy) uses discrete frames `assets/frames/punch_00..04`: startup (00,01) → active (02, hitbox only here) → recovery (03,04).
- Hitlag on hit clamped to 2–4 frames (33–67 ms).
- Grab/throw uses `grab_00..05`: contact (00) → lift (01) → hold lifted, enemy baked into frame (02) → throw (03) → recovery (04,05, clipped to Benjo only). V2.1.1 grab logic kept (range, 0.18s buffer, lift, throw arc/physics).
- Tackle/hurt/walk still use the rig (no kick/hurt frames).
- Known: in hold frames the lifted enemy is the person from the sheet, not the in-game enemy sprite (Ari QC: enemy face drift on grab).
- Music: not included. Hook `window.BGM_SRC` reserved for Sol's BGM. Soft SFX unchanged.

## V2.2.1 — music
- Benjo Street OST wired: Track A `assets/audio/bgm_stage.mp3` (take1) loops during stages; Track B `assets/audio/bgm_boss.mp3` (take2) loops while a boss is alive.
- `playBgm('stage'|'boss')` / `stopBgm()` / `syncBgm()` (per frame): boss alive → boss track, otherwise stage track; stops on game over. Starts in `startGame` (user click), play() rejections ignored. Synth SFX unchanged.
- MP3 160 kbps stereo; source WAVs kept in `ost/` (not published).
