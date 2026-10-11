'use strict';
// ===== v4 visuals: quality tiers, WebGL post (bloom / grade / chroma / radial blur / vignette / frosted glass),
// lights, parallax layers, ambient particles, frame-atlas drawing with rim light =====
const QUAL = { mode: localStorage.getItem('aceaf_q') || 'auto', level: 'high', post: false, wdpr: 1, parts: 1 };
const wcv = document.createElement('canvas'); const wctx = wcv.getContext('2d', { alpha: false });
const hctx = ctx;   // HUD/UI canvas (the visible top canvas that also receives input)
const glcv = document.createElement('canvas'); glcv.id = 'gl';
glcv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;display:none;pointer-events:none';
document.body.insertBefore(glcv, cv);
const POST = { gl: null, ok: false, P: {}, w: 0, h: 0, bw: 0, bh: 0, glass: [], lastErr: null, ms: 0 };
const FX = { bloom: 0, ca: 0, rb: 0, rbc: [0.5, 0.5], flash: 0, slow: 0, light: 0 };   // transient screen-space effect strengths
function detectQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const px = screen.width * screen.height * (window.devicePixelRatio || 1) ** 2;
  if (!IS_TOUCH) return 'high';
  if (mem <= 3 || cores <= 4) return 'low';
  if (mem >= 8 && cores >= 8) return 'high';
  return px > 3.5e6 ? 'med' : 'high';
}
function setQuality(mode, silent) {
  QUAL.mode = mode; localStorage.setItem('aceaf_q', mode);
  let lv = mode === 'auto' ? (QUAL.autoLevel || detectQuality()) : mode;
  if (lv !== 'low' && !POST.gl && !postInit()) lv = 'low';
  QUAL.level = lv; QUAL.post = lv !== 'low' && POST.ok;
  QUAL.parts = lv === 'high' ? 1 : lv === 'med' ? 0.7 : 0.4;
  glcv.style.display = QUAL.post ? 'block' : 'none';
  resize();
}
// ---------- WebGL post pipeline ----------
const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}';
const FS_DOWN = 'precision mediump float;varying vec2 uv;uniform sampler2D t;uniform vec2 px;void main(){vec3 c=texture2D(t,uv+px*vec2(-1.,-1.)).rgb+texture2D(t,uv+px*vec2(1.,-1.)).rgb+texture2D(t,uv+px*vec2(-1.,1.)).rgb+texture2D(t,uv+px*vec2(1.,1.)).rgb;gl_FragColor=vec4(c*0.25,1.);}';
const FS_BLUR = 'precision mediump float;varying vec2 uv;uniform sampler2D t;uniform vec2 dir;void main(){vec3 c=texture2D(t,uv).rgb*0.227027;c+=(texture2D(t,uv+dir*1.3846).rgb+texture2D(t,uv-dir*1.3846).rgb)*0.3162162;c+=(texture2D(t,uv+dir*3.2308).rgb+texture2D(t,uv-dir*3.2308).rgb)*0.0702703;gl_FragColor=vec4(c,1.);}';
const FS_COMP = `precision mediump float;varying vec2 uv;uniform sampler2D s;uniform sampler2D b;
uniform float bloom,thr,ca,rb,vig,sat,con,slow,flash,aspect;uniform vec3 lift,gain;uniform vec2 rbc;uniform vec4 g0,g1,g2,g3,g4,g5;
vec3 sc(vec2 u){if(ca>0.0005){vec2 d=(u-0.5)*ca;return vec3(texture2D(s,u+d).r,texture2D(s,u).g,texture2D(s,u-d).b);}return texture2D(s,u).rgb;}
float inR(vec4 r,vec2 u){vec2 a=step(r.xy,u)*step(u,r.zw);return a.x*a.y;}
void main(){vec3 c;
if(rb>0.0005){vec2 d=(uv-rbc)*rb;c=vec3(0.);for(int i=0;i<8;i++){c+=sc(uv-d*float(i)/7.);}c*=0.125;}else c=sc(uv);
vec3 bl=texture2D(b,uv).rgb;
float g=max(max(max(inR(g0,uv),inR(g1,uv)),max(inR(g2,uv),inR(g3,uv))),max(inR(g4,uv),inR(g5,uv)));
c=mix(c,bl*0.8+0.02,g*0.9);
c+=max(bl-thr,0.)*(bloom/(1.-thr))*(1.-g);
c=c*gain+lift;float l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,sat*(1.-slow*0.5));c=(c-0.5)*con+0.5;
vec2 q=uv-0.5;q.x*=aspect;float v=smoothstep(0.95,0.22,length(q));c*=mix(1.,v,clamp(vig+slow*0.45,0.,1.));
c=c+flash;gl_FragColor=vec4(c,1.);}`;
function postInit() {
  if (POST.tried) return POST.ok; POST.tried = true;
  let gl = null; try { gl = glcv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false }); } catch (e) { }
  if (!gl) return false;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (fs, names) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; names.forEach(n => u[n] = gl.getUniformLocation(p, n)); return { p, u }; };
  try {
    POST.P.down = prog(FS_DOWN, ['t', 'px']); POST.P.blur = prog(FS_BLUR, ['t', 'dir']);
    POST.P.comp = prog(FS_COMP, ['s', 'b', 'bloom', 'thr', 'ca', 'rb', 'vig', 'sat', 'con', 'slow', 'flash', 'aspect', 'lift', 'gain', 'rbc', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5']);
  } catch (e) { POST.lastErr = String(e); console.warn('post shaders', e); return false; }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  POST.scene = tex(); POST.t1 = tex(); POST.t2 = tex(); POST.f1 = gl.createFramebuffer(); POST.f2 = gl.createFramebuffer();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  glcv.addEventListener('webglcontextlost', e => { e.preventDefault(); POST.ok = false; QUAL.autoLevel = 'low'; setQuality(QUAL.mode === 'auto' ? 'auto' : 'low'); });
  POST.gl = gl; POST.ok = true; return true;
}
function postSize(bw, bh) {
  const gl = POST.gl; if (POST.bw === bw && POST.bh === bh) return; POST.bw = bw; POST.bh = bh;
  [[POST.t1, POST.f1], [POST.t2, POST.f2]].forEach(([t, f]) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, bw, bh, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// grade = {lift:[r,g,b], gain:[r,g,b], sat, con, vig, bloom, thr}
const GRADE_NEUTRAL = { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1.05, con: 1.04, vig: 0.35, bloom: 0.35, thr: 0.62 };
function postRender(gr) {
  const gl = POST.gl, t0 = performance.now(); if (!gl || gl.isContextLost()) return;
  const sw = wcv.width, sh = wcv.height, bw = Math.max(8, sw >> 2), bh = Math.max(8, sh >> 2); postSize(bw, bh);
  gl.bindTexture(gl.TEXTURE_2D, POST.scene); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, wcv);
  const pass = (P, fb, w, h) => { gl.useProgram(P.p); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); };
  pass(POST.P.down, POST.f1, bw, bh); gl.uniform1i(POST.P.down.u.t, 0); gl.uniform2f(POST.P.down.u.px, 1 / sw, 1 / sh); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const blur = (sp) => {
    pass(POST.P.blur, POST.f2, bw, bh); gl.bindTexture(gl.TEXTURE_2D, POST.t1); gl.uniform1i(POST.P.blur.u.t, 0); gl.uniform2f(POST.P.blur.u.dir, sp / bw, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    pass(POST.P.blur, POST.f1, bw, bh); gl.bindTexture(gl.TEXTURE_2D, POST.t2); gl.uniform2f(POST.P.blur.u.dir, 0, sp / bh); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  blur(1); if (QUAL.level === 'high') blur(2.2);
  // composite into the letterboxed game rect
  const C = POST.P.comp, u = C.u; gl.useProgram(C.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, glcv.width, glcv.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  const d = QUAL.gdpr, vx = Math.round(VIEW.ox * d), vy = Math.round(glcv.height - (VIEW.oy + H * VIEW.s) * d);
  gl.viewport(vx, vy, Math.round(W * VIEW.s * d), Math.round(H * VIEW.s * d));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, POST.scene); gl.uniform1i(u.s, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, POST.t1); gl.uniform1i(u.b, 1); gl.activeTexture(gl.TEXTURE0);
  const g = gr || GRADE_NEUTRAL;
  gl.uniform1f(u.bloom, (g.bloom != null ? g.bloom : 0.35) + FX.bloom); gl.uniform1f(u.thr, g.thr || 0.62);
  gl.uniform1f(u.ca, FX.ca * 0.012); gl.uniform1f(u.rb, FX.rb * 0.09); gl.uniform2f(u.rbc, FX.rbc[0], FX.rbc[1]);
  gl.uniform1f(u.vig, g.vig != null ? g.vig : 0.35); gl.uniform1f(u.sat, g.sat || 1); gl.uniform1f(u.con, g.con || 1); gl.uniform1f(u.slow, FX.slow); gl.uniform1f(u.flash, FX.flash);
  gl.uniform1f(u.aspect, W / H); gl.uniform3fv(u.lift, g.lift); gl.uniform3fv(u.gain, g.gain);
  for (let i = 0; i < 6; i++) { const r = POST.glass[i]; gl.uniform4f(u['g' + i], r ? r[0] / W : 2, r ? 1 - (r[1] + r[3]) / H : 2, r ? (r[0] + r[2]) / W : 2, r ? 1 - r[1] / H : 2); }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  POST.ms = lerp(POST.ms, performance.now() - t0, 0.1);
}
// 2D fallback grade (low quality): soft-light tint + baked vignette
let VIG2D = null;
function grade2D(gr) {
  const g = gr || GRADE_NEUTRAL;
  if (g.tint) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.5; ctx.fillStyle = g.tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (!VIG2D || VIG2D.w !== W) { const c = document.createElement('canvas'); c.width = 256; c.height = 144; const x = c.getContext('2d'); const rg = x.createRadialGradient(128, 72, 40, 128, 72, 150); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.75)'); x.fillStyle = rg; x.fillRect(0, 0, 256, 144); VIG2D = { c, w: W }; }
  ctx.globalAlpha = clamp((g.vig != null ? g.vig : 0.35) + FX.slow * 0.4, 0, 1); ctx.drawImage(VIG2D.c, 0, 0, W, H); ctx.globalAlpha = 1;
  if (FX.flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, FX.flash)})`; ctx.fillRect(0, 0, W, H); }
}
function fxDecay(dt) { FX.ca = Math.max(0, FX.ca - dt * 4); FX.rb = Math.max(0, FX.rb - dt * 2.2); FX.bloom = Math.max(0, FX.bloom - dt * 2.5); FX.flash = Math.max(0, FX.flash - dt * 2.5); }
// ---------- light sprites (additive glows) ----------
const LSPR = {};
function lightSprite(col) {
  if (LSPR[col]) return LSPR[col];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(0.25, col + 'aa'); g.addColorStop(0.6, col + '33'); g.addColorStop(1, col + '00');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return LSPR[col] = c;
}
function glow(x, y, r, col, a = 1, sy = 1) {
  if (a <= 0.01) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(lightSprite(col), x - r, y - r * sy, r * 2, r * 2 * sy); ctx.restore();
}
let SHADOW_SPR = null;
function softShadow(x, y, r, z = 0, a = 0.5) {
  if (!SHADOW_SPR) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 32, 2, 64, 32, 62);
    rg.addColorStop(0, 'rgba(0,0,0,0.75)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.setTransform(1, 0, 0, 0.5, 0, 16); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); SHADOW_SPR = c; }
  const k = 1 / (1 + z / 220); ctx.globalAlpha = a * k; ctx.drawImage(SHADOW_SPR, x - r * 1.25 * k, y - r * 0.4 * k, r * 2.5 * k, r * 0.8 * k); ctx.globalAlpha = 1;
}
// ---------- frame atlases (heroes + enemies) with per-stage tint + rim light ----------
const TINTC = {};   // cache: key|color -> tinted canvas
function tintedCached(key, img, col, mode) {
  const k = key + '|' + col + '|' + (mode || 's'); if (TINTC[k]) return TINTC[k];
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  if (mode === 'mul') { x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0); }
  else { x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); }
  return TINTC[k] = c;
}
// draws one key-pose frame. o: {ox,oy,rot,sx,sy,alpha,glow,glowB,tint,tintA,lift}
function drawAtlasFrame(key, img, meta, fname, x, y, h, face, o = {}) {
  if (!img || !meta) return false;
  const fr = meta.f[fname] || meta.f.idle, sc = h / meta.T;
  const S = G && G.S, lit = S && QUAL.level !== 'low' && !o.noLight;
  const base = lit && S.charMul ? tintedCached(key, img, S.charMul, 'mul') : img;
  ctx.save(); ctx.translate(x + (o.ox || 0), y + (o.oy || 0)); ctx.rotate(o.rot || 0);
  const al = o.alpha != null ? o.alpha : 1;
  if (lit && S.rim && al > 0.3) { // rim light: bright silhouette nudged toward the scene light, peeking out on that side
    const rim = tintedCached(key, img, S.rim); const d = (S.rimDir || -1) * 2.6;
    ctx.save(); ctx.translate(d, -1.5); ctx.scale(face * (o.sx || 1) * sc, (o.sy || 1) * sc); ctx.globalAlpha = al * (S.rimA || 0.65) * 0.75;
    ctx.drawImage(rim, fr.x, fr.y, fr.w, fr.h, -fr.ax, -fr.h, fr.w, fr.h); ctx.restore();
  }
  ctx.scale(face * (o.sx || 1) * sc, (o.sy || 1) * sc); ctx.globalAlpha = al;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowB || 22; }
  ctx.drawImage(base, fr.x, fr.y, fr.w, fr.h, -fr.ax, -fr.h, fr.w, fr.h);
  if (o.tint) { const tim = tintedCached(key, img, o.tint === 'W' ? '#ffffff' : o.tint === 'R' ? '#ff2a2a' : o.tint === 'K' ? '#000000' : o.tint);
    ctx.shadowBlur = 0; ctx.globalAlpha = al * (o.tintA || 0.7); ctx.drawImage(tim, fr.x, fr.y, fr.w, fr.h, -fr.ax, -fr.h, fr.w, fr.h); }
  ctx.restore(); return true;
}
// ---------- stage layers ----------
const LAYERS = {};   // stage key -> {main, far, props:[canvas], fg:[blurred canvas], lights}
let PROPS_META = null, LIGHTS_META = null;
function blurredCopy(src, k = 4, dark = 0.55) {
  const w = Math.max(1, Math.round(src.width / k)), h = Math.max(1, Math.round(src.height / k));
  const a = document.createElement('canvas'); a.width = w; a.height = h; const ax = a.getContext('2d'); ax.imageSmoothingQuality = 'high'; ax.drawImage(src, 0, 0, w, h);
  if (dark) { ax.globalCompositeOperation = 'source-atop'; ax.fillStyle = `rgba(8,4,12,${dark})`; ax.fillRect(0, 0, w, h); }
  const b = document.createElement('canvas'); b.width = Math.round(w * 2); b.height = Math.round(h * 2); const bx = b.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(a, 0, 0, b.width, b.height); return b;
}
function loadStageLayers(S) {
  if (LAYERS[S.key] && LAYERS[S.key].ready) return Promise.resolve(LAYERS[S.key]);
  if (LAYERS[S.key] && LAYERS[S.key].p) return LAYERS[S.key].p;
  const L = LAYERS[S.key] = { ready: false };
  const base = 'assets/stages/' + S.key, v = '?v=4';
  const meta = PROPS_META ? Promise.resolve() : Promise.all([fetch('assets/stages/props.json' + v).then(r => r.json()).then(j => PROPS_META = j), fetch('assets/stages/lights.json' + v).then(r => r.json()).then(j => LIGHTS_META = j)]).catch(e => console.warn('stage meta', e));
  L.p = Promise.all([loadImg(base + '_main.webp' + v), S.far ? loadImg(base + '_far.webp' + v) : null, loadImg(base + '_props.webp' + v), meta]).then(([main, far, props]) => {
    L.main = main; L.far = far; L.props = []; L.fg = [];
    const pm = PROPS_META && PROPS_META[S.key] || [];
    pm.forEach((r, i) => { const c = document.createElement('canvas'); c.width = r[2]; c.height = r[3]; if (props) c.getContext('2d').drawImage(props, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); L.props[i] = c; });
    (S.fgProps || []).forEach(i => { if (L.props[i]) L.fg[i] = blurredCopy(L.props[i], 5, S.fgDark != null ? S.fgDark : 0.55); });
    L.lights = (LIGHTS_META && LIGHTS_META[S.key]) || []; L.ready = true; return L;
  });
  return L.p;
}
// mirrored tiling of a layer image scaled to height hh, scrolled by camX*k
function drawTiled(img, camX, k, y, hh) {
  const bw = img.width * hh / img.height, off = camX * k, i0 = Math.floor(off / bw);
  for (let i = i0; i <= i0 + Math.ceil(W / bw) + 1; i++) { const x = Math.round(i * bw - off);
    if (x > W || x + bw < 0) continue;
    if (i & 1) { ctx.save(); ctx.translate(x + bw, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, bw + 1, hh); ctx.restore(); } else ctx.drawImage(img, x, y, bw + 1, hh); }
  return bw;
}
function drawStageBack(S, camX, t) {
  const L = LAYERS[S.key]; if (!L || !L.ready) { ctx.fillStyle = '#120a10'; ctx.fillRect(0, 0, W, H); return; }
  // sky gradient behind everything
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (L.far && S.far) { const fh = H * S.far.h; drawTiled(L.far, camX, S.far.k, S.far.y, fh);
    if (S.weather === 'storm' && FX.light > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = FX.light * 0.55; drawTiled(L.far, camX, S.far.k, S.far.y, fh); ctx.restore(); } }
  // atmospheric haze between far and main
  if (S.haze) { const hg = ctx.createLinearGradient(0, H * 0.15, 0, H * 0.6); hg.addColorStop(0, S.haze + '00'); hg.addColorStop(1, S.haze + '55'); ctx.fillStyle = hg; ctx.fillRect(0, H * 0.15, W, H * 0.45); }
  const bw = drawTiled(L.main, camX, 1, 0, H);
  // lights baked from the art (lamps, lanterns, fires) -> flickering additive glows
  if (QUAL.level !== 'low' && L.lights.length) {
    const i0 = Math.floor(camX / bw);
    for (let i = i0; i <= i0 + Math.ceil(W / bw) + 1; i++) L.lights.forEach((l, j) => {
      const u = i & 1 ? 1 - l[0] : l[0], x = i * bw + u * bw - camX, y = l[1] * H; if (x < -120 || x > W + 120) return;
      const fl = S.flicker ? 0.82 + 0.18 * Math.sin(t * (7 + j % 5) + j * 1.7) * Math.sin(t * 3.1 + j) : 1;
      glow(x, y, (S.lightR || 70) * (0.7 + l[2] * 0.5), l[3], (S.lightA || 0.35) * l[2] * fl);
    });
  }
  (S.lightShafts || []).forEach(ls => { // volumetric light shafts (additive trapezoids)
    const x = ((ls.x - camX * (ls.k || 1)) % (bw * 2) + bw * 2) % (bw * 2) - 200; if (x > W + 300) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ls.a * (0.85 + 0.15 * Math.sin(t * 0.7 + ls.x));
    const lg = ctx.createLinearGradient(0, ls.y0, 0, ls.y1); lg.addColorStop(0, ls.col); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x, ls.y0); ctx.lineTo(x + ls.w0, ls.y0); ctx.lineTo(x + ls.w0 + ls.dx + ls.w1, ls.y1); ctx.lineTo(x + ls.dx, ls.y1); ctx.closePath(); ctx.fill(); ctx.restore(); });
  // mid props standing on the back edge of the floor (sharp, world space)
  (S.backProps || []).forEach(bp => { const img = L.props[bp.i]; if (!img) return; const hh = bp.h, ww = img.width * hh / img.height, x = bp.x - camX;
    if (x + ww < -50 || x - ww > W + 50) return; softShadow(x, bp.y, ww * 0.45, 0, 0.45); ctx.drawImage(img, x - ww / 2, bp.y - hh, ww, hh);
    if (bp.light) glow(x + (bp.lx || 0) * ww, bp.y - hh * (bp.ly || 0.8), bp.lr || 90, bp.light, 0.55 * (S.flicker ? 0.85 + 0.15 * Math.sin(t * 9 + bp.x) : 1)); });
}
// foreground props (parallax > 1, blurred + darkened) pass in front of the action
function drawStageFront(S, camX, t) {
  const L = LAYERS[S.key]; if (!L || !L.ready || !S.fg || QUAL.level === 'low' && !S.fgLow) return;
  const k = S.fg.k || 1.45, sp = S.fg.spacing || 900, off = camX * k, i0 = Math.floor(off / sp) - 1;
  for (let i = i0; i <= i0 + Math.ceil(W / sp) + 2; i++) {
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1; const pi = S.fgProps[Math.floor(r * S.fgProps.length) % S.fgProps.length];
    const img = L.fg[pi]; if (!img) continue; const hang = (S.fgHang || []).includes(pi);
    const hh = (hang ? 300 : 420) * (S.fg.scale || 1), ww = img.width * hh / img.height, x = i * sp + r * sp * 0.4 - off;
    if (x + ww < 0 || x > W) continue;
    if (hang) ctx.drawImage(img, x, -30 - r * 40, ww, hh); else ctx.drawImage(img, x, H - hh * 0.72 + r * 40, ww, hh);
  }
}
// ---------- ambient particles ----------
function ambSpawn(S, dt) {
  if (!S || !S.amb) return; const A = G.amb, max = Math.round(70 * QUAL.parts);
  const rate = { dust: 10, rain: 90, ember: 16, frost: 6, spice: 8, feather: 3 };
  S.amb.forEach(kind => { let n = (rate[kind] || 6) * dt * QUAL.parts; while (n > 0 && A.length < max * (kind === 'rain' ? 2.4 : 1)) { if (Math.random() < n) ambAdd(kind); n -= 1; } });
}
function ambAdd(kind) {
  const p = { kind, x: rnd(0, W), y: rnd(0, H), t: 0, life: rnd(3, 7), vx: 0, vy: 0, r: 2, a: 0.6, ph: rnd(0, 7) };
  if (kind === 'dust') { p.vx = rnd(-8, 14); p.vy = rnd(-10, 4); p.r = rnd(1.2, 3); p.col = '#ffe6b0'; p.a = rnd(0.25, 0.6); }
  if (kind === 'spice') { p.y = rnd(80, 220); p.vx = rnd(-20, 20); p.vy = rnd(40, 90); p.r = rnd(1.5, 3); p.col = ['#e8572a', '#f2a541', '#c4302b', '#ffd36b'][Math.floor(rnd(0, 4))]; p.a = 0.85; p.life = 3; }
  if (kind === 'rain') { p.y = rnd(-40, H * 0.4); p.vx = -90; p.vy = rnd(900, 1200); p.life = 0.8; p.a = rnd(0.15, 0.35); p.len = rnd(14, 26); }
  if (kind === 'ember') { p.y = rnd(H * 0.5, H + 20); p.vx = rnd(-25, 25); p.vy = rnd(-90, -40); p.r = rnd(1.2, 2.8); p.col = Math.random() < 0.5 ? '#ff9a3c' : '#ffcf6b'; p.a = 0.9; p.life = rnd(2, 4); }
  if (kind === 'frost') { p.y = rnd(FY0 - 40, H); p.vx = rnd(6, 20); p.vy = rnd(-3, 3); p.r = rnd(60, 130); p.col = '#bfe6ff'; p.a = rnd(0.05, 0.11); p.life = rnd(6, 10); }
  if (kind === 'feather') { p.y = rnd(40, 200); p.vx = rnd(20, 50); p.vy = rnd(10, 30); p.r = 3; p.col = '#e8e2d8'; p.a = 0.8; p.life = 6; }
  G.amb.push(p);
}
function ambUpdate(dt) {
  G.amb = G.amb.filter(p => { p.t += dt; p.x += (p.vx + (p.kind === 'dust' || p.kind === 'feather' ? Math.sin(p.t * 1.3 + p.ph) * 10 : 0)) * dt; p.y += p.vy * dt;
    if (p.kind === 'ember') p.vx += Math.sin(p.t * 3 + p.ph) * 30 * dt; return p.t < p.life && p.y < H + 40 && p.y > -60; });
}
function ambDraw(layer) {
  if (!G.amb.length) return; ctx.save();
  G.amb.forEach(p => { const life = Math.min(1, p.t / 0.4, (p.life - p.t) / 0.6); const a = p.a * Math.max(0, life);
    if (p.kind === 'frost') { if (layer !== 0) return; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(lightSprite('#bfe6ff'), p.x - p.r, p.y - p.r * 0.45, p.r * 2, p.r * 0.9); return; }
    if (layer !== 1) return;
    if (p.kind === 'rain') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.strokeStyle = '#cfe3ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.len * 0.08, p.y - p.len); ctx.stroke(); return; }
    if (p.kind === 'ember' || p.kind === 'dust') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (p.kind === 'ember' ? 0.7 + 0.3 * Math.sin(p.t * 12 + p.ph) : 1); ctx.drawImage(lightSprite(p.col), p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6); return; }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.fillRect(p.x - p.r, p.y - p.r * 0.6, p.r * 2, p.r * 1.2); });
  ctx.restore();
}
// ---------- FPS monitor (auto quality) ----------
const PERF = { frames: 0, acc: 0, fps: 60, samples: [], low: 0, hist: [] };
function perfTick(dt, playing) {
  PERF.frames++; PERF.acc += dt;
  if (PERF.acc >= 1) { PERF.fps = PERF.frames / PERF.acc; PERF.hist.push(Math.round(PERF.fps)); if (PERF.hist.length > 120) PERF.hist.shift(); PERF.frames = 0; PERF.acc = 0;
    if (playing && QUAL.mode === 'auto' && !document.hidden) {
      if (PERF.fps < 45) PERF.low++; else PERF.low = Math.max(0, PERF.low - 1);
      if (PERF.low >= 3 && QUAL.level !== 'low') { QUAL.autoLevel = QUAL.level === 'high' ? 'med' : 'low'; PERF.low = 0; setQuality('auto'); APP.toast = { text: 'איכות הגרפיקה הותאמה למכשיר', t: 2 }; }
    } }
}
