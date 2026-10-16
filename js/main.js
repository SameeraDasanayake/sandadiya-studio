import { togglePlainRange, toggleMarkupSelection } from './markup.js';
import { renderScene, sceneSize, photoGeom, FONTS } from './render.js';
import {
  PRESETS, loadState, saveState, deepMerge, clone, pickStyle, getPath, setPath,
  loadQuotes, saveQuotes, loadMyPresets, saveMyPresets,
} from './state.js';
import * as idb from './idb.js';
import {
  TEXT_FX, MOTIONS, HL_FX, LOOP_FX, MOODS, videoState, timeline, typingTimes, renderVideoFrame, exportVideo, canEncode,
} from './video.js';
import { PARTICLES, PARTICLE_EMOJI, drawParticles } from './particles.js';
import { SOUNDS, decodeAudio, renderMix, playMix, stopMix, drawWave } from './audio.js';
import {
  EMOJI_SETS, VEC_STICKERS, TEXT_PRESETS, STICKER_ANIMS, drawStickerShape, handlePoints, handleSize, hitSticker,
} from './stickers.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const state = loadState();
const assets = {
  photo: null, photoId: 0, photoUrl: null, logo: null,
  bgVideo: null, bgVideoUrl: null, bgVideoBlob: null,
  music: null, musicName: '', clipAudio: undefined, // clipAudio: undefined = තවම decode කරලා නෑ, null = සද්දයක් නෑ
};
// Preview එකටයි export එකටයි යන mix කරපු සද්දය
const mix = { key: '', buf: null, timer: 0, busy: null };
// t = null කියන්නේ "edit view": වදන ඔක්කොම පේන අන්තිම frame එක පෙන්නනවා
const player = { playing: false, t: null, t0: 0, D: 10 };

const isVideo = () => state.mode === 'video';
// දැන් background එකට පාවිච්චි වෙන්නේ ෆොටෝ එකද video clip එකද
const bgMedia = () => (isVideo() && state.video.bg === 'video' && assets.bgVideo ? assets.bgVideo : assets.photo);
const viewState = () => (isVideo() ? videoState(state) : state);
// දැන් mode එකේ text box එක (ෆොටෝ එකට එකක්, video එකට එකක්)
const tb = () => (isVideo() ? state.video.textBox : state.textBox);
const customFonts = [];
let quotes = loadQuotes();
let myPresets = loadMyPresets();
let mode = 'move';
let layout = null;

const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const stage = $('#stage');
const ta = $('#text');

// ---------- පොඩි උදව් ----------

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

let saveT;
function saveSoon() {
  clearTimeout(saveT);
  saveT = setTimeout(() => saveState(state), 300);
}

let syncT;
function syncSoon() {
  clearTimeout(syncT);
  syncT = setTimeout(syncInputs, 150);
}

// ---------- Render ----------

let raf = 0;
function scheduleRender() {
  if (!raf) raf = requestAnimationFrame(draw);
}

function draw() {
  raf = 0;
  const bg = bgMedia();
  const [bw, bh] = sceneSize(viewState(), bg);
  const sw = stage.clientWidth - 20, sh = stage.clientHeight - 20;
  const s = Math.min(sw / bw, sh / bh);
  const cw = Math.max(60, Math.floor(bw * s)), ch = Math.max(60, Math.floor(bh * s));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.min(bw, Math.round(cw * dpr));
  const H = Math.round((W * bh) / bw);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  if (isVideo()) {
    const tl = timeline(state, bg);
    player.D = tl.D;
    if (player.playing) {
      player.t = (performance.now() - player.t0) / 1000;
      if (player.t >= tl.D) {
        player.t = 0;
        player.t0 = performance.now();
        syncBgVideo(true);
        playMix(mix.buf, 0);
      }
    }
    scheduleMix(tl.D);
    const t = player.t == null ? Math.min(tl.revealEnd + 0.2, tl.D) : Math.min(player.t, tl.D);
    if (player.t != null) player.t = t;
    layout = renderVideoFrame(ctx, state, assets, { W, H, t, D: tl.D, bg, editor: !player.playing, selectedSticker: selId });
    updateTransport(tl);
    if (player.playing) scheduleRender();
  } else {
    layout = renderScene(ctx, state, assets, { W, H, editor: true, cache: true, selectedSticker: selId, afterBackground: photoFxHook() });
    scheduleThumbs();
  }
}

// ---------- Video preview ----------

const fmt = (s) => s.toFixed(1);
let scrubbing = false;

function updateTransport(tl) {
  const scrub = $('#scrub');
  scrub.max = String(tl.D);
  const t = player.t ?? Math.min(tl.revealEnd + 0.2, tl.D);
  if (!scrubbing) scrub.value = String(t);
  paintRange(scrub);
  $('#timeLbl').textContent = `${fmt(t)} / ${fmt(tl.D)}s`;
  $('#btnPlay').textContent = player.playing ? '⏸' : '▶';
  $('#autoLenOut').textContent = `තත්පර ${fmt(tl.auto)}`;
  $('#durOut').textContent = `තත්පර ${fmt(state.video.duration)}`;
}

// Background video clip එක preview එකේ වෙලාවට ගැලපෙන්න
function syncBgVideo(seek) {
  const v = assets.bgVideo;
  if (!v || bgMedia() !== v) return;
  if (seek || !player.playing) v.currentTime = v.duration ? player.t % v.duration : 0;
  if (player.playing) v.play().catch(() => {});
  else v.pause();
}

function play() {
  if (player.t == null || player.t >= player.D - 0.05) player.t = 0;
  player.playing = true;
  player.t0 = performance.now() - player.t * 1000;
  syncBgVideo(true);
  playMix(mix.buf, player.t);
  scheduleRender();
}

function pause() {
  player.playing = false;
  syncBgVideo(false);
  stopMix();
  scheduleRender();
}

// ---------- Music ----------

function mixKey(D) {
  const a = state.audio;
  if (a.src === 'none' && !a.clipAudio && !a.typing) return 'silent';
  return JSON.stringify([a, D, a.typing ? [state.text, state.video.textFx, state.video.speed, state.video.delay, state.video.aspect, tb()] : 0,
    assets.musicName, a.clipAudio ? assets.bgVideoUrl : 0]);
}

// සද්දය බලපාන දෙයක් වෙනස් වුණාම (හිමින්) mix එක ආයේ හදනවා
function scheduleMix(D) {
  const key = mixKey(D);
  if (key === mix.key) return;
  mix.key = key;
  clearTimeout(mix.timer);
  mix.timer = setTimeout(() => { mix.busy = buildMix(key); }, 350);
}

async function buildMix(key) {
  const bg = bgMedia();
  const { D } = timeline(state, bg);
  const a = state.audio;
  if (a.clipAudio && assets.clipAudio === undefined && assets.bgVideoBlob) {
    try { assets.clipAudio = await decodeAudio(assets.bgVideoBlob); } catch { assets.clipAudio = null; }
    if (!assets.clipAudio) toast('මේ video clip එකේ සද්දයක් නෑ');
  }
  let buf = null;
  try {
    buf = await renderMix({
      a, D, music: assets.music, clip: bgMedia() === assets.bgVideo ? assets.clipAudio : null,
      typing: a.typing ? typingTimes(state, bg) : [],
    });
  } catch (err) {
    console.error(err);
  }
  if (key !== mix.key) return null; // මේ අතරේ ආයේ වෙනස් වෙලා, අලුත් එකක් හැදෙනවා
  mix.buf = buf;
  if (player.playing) playMix(buf, player.t);
  return buf;
}

// Export කරන්න කලින් අලුත්ම mix එක අනිවාර්යයෙන් හදාගන්නවා
async function freshMix() {
  const { D } = timeline(state, bgMedia());
  const key = mixKey(D);
  clearTimeout(mix.timer);
  if (key !== mix.key || !mix.busy) {
    mix.key = key;
    mix.busy = buildMix(key);
  }
  await mix.busy;
  return mix.key === key ? mix.buf : null;
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function updateMusicUI() {
  const a = state.audio;
  $('#musicBox').hidden = a.src !== 'file';
  $('#musicName').textContent = assets.music ? `🎵 ${assets.musicName} (${mmss(assets.music.duration)})` : 'තවම සින්දුවක් තෝරලා නෑ';
  $('#startOut').textContent = mmss(a.start);
  if (assets.music) $('#musicStart').max = String(Math.max(0, assets.music.duration - 1));
  paintRange($('#musicStart'));
  if (a.src === 'file' && $('[data-pane=music]').classList.contains('on')) {
    drawWave($('#wave'), assets.music, a.start, player.D, { on: '#f0cf95', off: '#3a4d6b', window: 'rgba(240,207,149,.12)' });
  }
}

async function setMusic(blob, name, isNew = true) {
  if (isNew) toast('🎵 සින්දුව load කරනවා...');
  let buf;
  try {
    buf = await decodeAudio(blob);
  } catch {
    toast('😕 මේ සින්දුව open කරන්න බැරි වුණා');
    return;
  }
  assets.music = buf;
  assets.musicName = name;
  if (isNew) {
    state.audio.src = 'file';
    state.audio.start = 0;
    idb.set('music', { blob, name });
    syncInputs();
    saveSoon();
    toast('✅ සින්දුව දැම්මා. Waveform එකෙන් කොටස තෝරන්න');
  }
  updateMusicUI();
  scheduleRender();
}

function playFrom(t) {
  player.t = t;
  play();
}

// ---------- Inputs ↔ state ----------

function changed(path) {
  if (path.startsWith('font.')) loadFonts();
  if (path === 'video.particles') {
    state.video.particleColor = PARTICLES.find((p) => p.id === state.video.particles)?.color || '#ffffff';
    syncInputs();
  }
  if (path === 'photoFx.type') {
    state.photoFx.color = PARTICLES.find((p) => p.id === state.photoFx.type)?.color || '#ffffff';
    syncInputs();
  }
  if (path === 'video.particles' || path === 'photoFx.type') updateEmojiRows();
  if (path === 'video.duration') {
    state.video.autoLen = false;
    syncInputs();
  }
  if (path === 'video.bg') syncBgVideo(true);
  if (path === 'audio.src' && state.audio.src === 'file' && !assets.music) $('#fileMusic').click();
  if (path.startsWith('audio.')) updateMusicUI();
  // Effect එකක් හරි සද්දයක් හරි තේරුවම මුල ඉඳන් play කරලා පෙන්නනවා
  if (['video.textFx', 'video.particles', 'video.motion', 'video.hlFx', 'video.loopFx', 'audio.src', 'audio.typing', 'audio.clipAudio'].includes(path)) playFrom(0);
  scheduleRender();
  saveSoon();
}

function bindInputs() {
  for (const el of $$('[data-bind]')) {
    el.addEventListener('input', () => {
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'range' || el.dataset.type === 'number') v = parseFloat(el.value);
      else v = el.value;
      setPath(state, el.dataset.bind, v);
      changed(el.dataset.bind);
    });
  }
  for (const seg of $$('[data-seg]')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-val]');
      if (!b) return;
      setPath(state, seg.dataset.seg, b.dataset.val);
      changed(seg.dataset.seg);
      syncInputs();
    });
  }
}

function syncInputs() {
  for (const el of $$('[data-bind]')) {
    if (el === document.activeElement && (el.tagName === 'TEXTAREA' || el.type === 'text')) continue;
    const v = getPath(state, el.dataset.bind);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (v != null) el.value = String(v);
  }
  for (const seg of $$('[data-seg]')) {
    const v = String(getPath(state, seg.dataset.seg));
    for (const b of $$('button[data-val]', seg)) b.classList.toggle('on', b.dataset.val === v);
  }
  for (const r of $$('input[type=range]')) paintRange(r);
}

// Slider එකේ පිරිලා තියෙන කොටසට gradient එක (CSS --p)
function paintRange(r) {
  const min = parseFloat(r.min) || 0, max = parseFloat(r.max) || 100;
  r.style.setProperty('--p', `${(((parseFloat(r.value) - min) / (max - min || 1)) * 100).toFixed(1)}%`);
}

// ---------- Fonts ----------

function fillFontSelects() {
  const all = [...FONTS, ...customFonts];
  for (const sel of $$('.fontSelect')) {
    sel.innerHTML = all.map((f) => `<option value="${esc(f.family)}">${esc(f.label)}</option>`).join('');
  }
  syncInputs();
}

function loadFonts() {
  const f = state.font;
  const specs = new Set([
    `${f.bodyWeight} 40px "${f.body}"`, `700 40px "${f.body}"`, `600 40px "${f.body}"`,
    `${f.titleWeight} 40px "${f.title}"`,
  ]);
  Promise.all([...specs].map((s) => document.fonts.load(s, 'අආකා').catch(() => {}))).then(scheduleRender);
}

// Preset thumbnails වලට ඕනේ නිසා ඔක්කොම fonts පස්සෙන් load කරනවා
function preloadAllFonts() {
  for (const f of FONTS) for (const w of [400, 600, 700, 800]) document.fonts.load(`${w} 40px "${f.family}"`, 'අ').catch(() => {});
}

async function registerFont(family, buf) {
  const ff = new FontFace(family, buf);
  await ff.load();
  document.fonts.add(ff);
  if (!customFonts.some((f) => f.family === family)) customFonts.push({ family, label: `⭐ ${family}` });
}

async function addFontFile(file) {
  const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').trim() || 'My Font';
  const buf = await file.arrayBuffer();
  try {
    await registerFont(family, buf.slice(0));
  } catch {
    toast('😕 මේ font එක load කරන්න බැරි වුණා');
    return;
  }
  const saved = ((await idb.get('fonts')) || []).filter((f) => f.family !== family);
  saved.push({ family, buf });
  await idb.set('fonts', saved);
  fillFontSelects();
  state.font.body = family;
  syncInputs();
  changed('font.body');
  toast(`✅ "${family}" font එක එකතු කළා`);
}

// ---------- Photo ----------

async function setPhotoFromBlob(blob, isNew = true) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    toast('😕 මේ ෆොටෝ එක open කරන්න බැරි වුණා');
    return;
  }
  if (assets.photoUrl) URL.revokeObjectURL(assets.photoUrl);
  assets.photo = img;
  assets.photoUrl = url;
  assets.photoId++;
  if (isNew) {
    state.photo = { zoom: 1, panX: 0, panY: 0 };
    if (isVideo()) state.video.bg = 'photo';
    idb.set('photo', blob);
    syncInputs();
    saveSoon();
  }
  scheduleRender();
}

async function setBgVideo(blob, isNew = true) {
  const url = URL.createObjectURL(blob);
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', src: url });
  const ok = await new Promise((resolve) => {
    v.addEventListener('loadeddata', () => resolve(true), { once: true });
    v.addEventListener('error', () => resolve(false), { once: true });
  });
  if (!ok) {
    URL.revokeObjectURL(url);
    toast('😕 මේ video එක open කරන්න බැරි වුණා');
    return;
  }
  if (assets.bgVideo) assets.bgVideo.pause();
  if (assets.bgVideoUrl) URL.revokeObjectURL(assets.bgVideoUrl);
  v.addEventListener('seeked', scheduleRender);
  assets.bgVideo = v;
  assets.bgVideoUrl = url;
  assets.bgVideoBlob = blob;
  assets.clipAudio = undefined;
  if (isNew) {
    state.photo = { zoom: 1, panX: 0, panY: 0 };
    state.video.bg = 'video';
    syncInputs();
    saveSoon();
    idb.set('bgvideo', blob);
    toast('🎞️ Video clip එක දැම්මා');
  }
  syncBgVideo(true);
  scheduleRender();
}

function removePhoto() {
  if (assets.photoUrl) URL.revokeObjectURL(assets.photoUrl);
  assets.photo = null;
  assets.photoUrl = null;
  assets.photoId++;
  idb.del('photo');
  if (state.aspect === 'photo') state.aspect = '1:1';
  syncInputs();
  scheduleRender();
}

// ---------- Canvas gestures ----------

const pointers = new Map();
let g = null;

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
}

function onText(p) {
  if (!layout || !layout.lines.length) return false;
  const b = layout.bounds, pad = layout.base * 0.8;
  return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
}

// Stickers: උඩින්ම තියෙන එකෙන් පටන් අරන් බලනවා. තෝරපු එකේ ✕ / ↻ handles මුලින්ම.
function stickerAt(p) {
  const boxes = layout?.stickers;
  if (!boxes?.length) return null;
  const U = Math.min(canvas.width, canvas.height);
  const sel = boxes.find((b) => b.id === selId);
  if (sel) {
    const hp = handlePoints(sel, U), r = handleSize(U) * 1.5;
    if (Math.hypot(p.x - hp.del.x, p.y - hp.del.y) <= r) return { part: 'del', id: sel.id };
    if (Math.hypot(p.x - hp.rot.x, p.y - hp.rot.y) <= r) return { part: 'rot', id: sel.id, box: sel };
  }
  for (let k = boxes.length - 1; k >= 0; k--) if (hitSticker(boxes[k], p.x, p.y, U)) return { part: 'body', id: boxes[k].id };
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  pointers.set(e.pointerId, p);
  if (pointers.size === 1) {
    const hit = stickerAt(p);
    if (hit?.part === 'del') {
      deleteSticker(hit.id);
      g = { kind: 'none' };
      return;
    }
    if (hit?.part === 'rot') {
      const s = curSticker();
      const { cx, cy } = hit.box;
      g = { kind: 'stRot', cx, cy, a0: Math.atan2(p.y - cy, p.x - cx), d0: Math.hypot(p.x - cx, p.y - cy) || 1, size0: s.size, rot0: s.rot };
      return;
    }
    if (hit) {
      selectSticker(hit.id);
      g = { kind: 'sticker', start: p, last: p, moved: false };
      return;
    }
    if (selId) selectSticker(null);
    g = { kind: onText(p) || !bgMedia() ? 'text' : 'photo', start: p, last: p, moved: false };
  } else if (pointers.size === 2 && g) {
    const [a, b] = [...pointers.values()];
    const s = curSticker();
    g = {
      kind: 'pinch', target: g.kind === 'sticker' && s ? 'sticker' : g.kind === 'photo' ? 'photo' : 'text',
      d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x),
      size0: tb().size, zoom0: state.photo.zoom, ssize0: s?.size, srot0: s?.rot,
    };
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !g || g.kind === 'none') return;
  const p = canvasPoint(e);
  pointers.set(e.pointerId, p);
  const W = canvas.width, H = canvas.height;
  if (g.kind === 'pinch') {
    if (pointers.size < 2) return;
    const [a, b] = [...pointers.values()];
    const k = Math.hypot(a.x - b.x, a.y - b.y) / g.d0;
    if (g.target === 'sticker' && curSticker()) {
      const s = curSticker();
      s.size = clamp(g.ssize0 * k, 0.02, 1.2);
      s.rot = g.srot0 + (Math.atan2(b.y - a.y, b.x - a.x) - g.a0);
    } else if (g.target === 'text') tb().size = clamp(g.size0 * k, 0.015, 0.14);
    else state.photo.zoom = clamp(g.zoom0 * k, 1, 6);
  } else if (g.kind === 'stRot') {
    const s = curSticker();
    if (!s) return;
    s.rot = g.rot0 + (Math.atan2(p.y - g.cy, p.x - g.cx) - g.a0);
    s.size = clamp(g.size0 * (Math.hypot(p.x - g.cx, p.y - g.cy) / g.d0), 0.02, 1.2);
  } else {
    if (!g.moved) {
      const thr = (8 * W) / canvas.clientWidth;
      if (Math.hypot(p.x - g.start.x, p.y - g.start.y) < thr) return;
      g.moved = true;
    }
    const dx = p.x - g.last.x, dy = p.y - g.last.y;
    g.last = p;
    if (g.kind === 'sticker') {
      const s = curSticker();
      if (s) { s.x = clamp(s.x + dx / W, -0.1, 1.1); s.y = clamp(s.y + dy / H, -0.1, 1.1); }
    } else if (g.kind === 'text') {
      tb().x = clamp(tb().x + dx / W, 0, 1);
      tb().y = clamp(tb().y + dy / H, 0, 1);
    } else if (bgMedia()) {
      const geo = photoGeom(state, bgMedia(), W, H);
      if (geo.ox > 0.5) state.photo.panX = clamp(state.photo.panX + dx / (geo.ox / 2), -1, 1);
      if (geo.oy > 0.5) state.photo.panY = clamp(state.photo.panY + dy / (geo.oy / 2), -1, 1);
    }
  }
  scheduleRender();
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (g && (g.kind === 'text' || g.kind === 'photo') && !g.moved && mode === 'highlight' && layout) {
    const p = canvasPoint(e);
    const pad = layout.base * 0.15;
    const w = layout.words.find((w) => p.x >= w.x - pad && p.x <= w.x + w.w + pad && p.y >= w.y && p.y <= w.y + w.h);
    if (w) {
      state.text = togglePlainRange(state.text, w.start, w.end);
      ta.value = state.text;
      changed('text');
    }
  }
  if (pointers.size === 0) {
    if (g?.kind === 'sticker' || g?.kind === 'stRot' || g?.target === 'sticker') updateStickerPanel();
    g = null;
    syncInputs();
    saveSoon();
  } else if (g?.kind === 'pinch') {
    g = { kind: 'none' };
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const k = Math.exp(-e.deltaY * 0.0015);
  const hit = stickerAt(p);
  if (hit && hit.part !== 'del') {
    selectSticker(hit.id);
    const s = curSticker();
    if (e.shiftKey) s.rot += e.deltaY * 0.003; // Shift + wheel = කරකවන්න
    else s.size = clamp(s.size * k, 0.02, 1.2);
    updateStickerPanel();
  } else if (onText(p) || !bgMedia()) tb().size = clamp(tb().size * k, 0.015, 0.14);
  else state.photo.zoom = clamp(state.photo.zoom * k, 1, 6);
  scheduleRender();
  syncSoon();
  saveSoon();
}, { passive: false });

// ---------- Stickers ----------

let selId = null;
const stickers = () => (isVideo() ? state.video.stickers : state.stickers);
const curSticker = () => stickers().find((s) => s.id === selId) || null;

function selectSticker(id) {
  selId = id;
  updateStickerPanel();
  scheduleRender();
}

function addSticker(kind, value, extra = {}) {
  const list = stickers();
  const n = list.length;
  const s = {
    kind, value,
    x: 0.5 + ((n % 5) - 2) * 0.06, y: 0.3 + (n % 4) * 0.06,
    size: kind === 'text' ? 0.24 : 0.16, rot: 0, opacity: 1,
    color: '#ffffff', font: 'Great Vibes', anim: isVideo() ? 'float' : 'none',
    ...extra,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  };
  list.push(s);
  if (s.kind === 'text') loadFontFamily(s.font);
  selectSticker(s.id);
  saveSoon();
  toast('✅ දැම්මා! ඇදලා තැනට දාන්න');
}

function deleteSticker(id) {
  const list = stickers();
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0) list.splice(i, 1);
  if (selId === id) selId = null;
  updateStickerPanel();
  scheduleRender();
  saveSoon();
}

function updateStickerPanel() {
  const s = curSticker();
  $('#stickerEdit').hidden = !s;
  if (!s) return;
  $('#stSize').value = String(s.size);
  $('#stRot').value = String(Math.round((((s.rot * 180) / Math.PI + 540) % 360) - 180));
  $('#stOpacity').value = String(s.opacity ?? 1);
  $('#stColorRow').hidden = s.kind === 'emoji';
  $('#stColor').value = s.color || '#ffffff';
  $('#stickerTextRow').hidden = s.kind !== 'text';
  if (s.kind === 'text') {
    if (document.activeElement !== $('#stText')) $('#stText').value = s.value;
    $('#stFont').value = s.font;
  }
  $('#stAnimRow').hidden = !isVideo();
  for (const b of $$('#stAnim button')) b.classList.toggle('on', b.dataset.val === (s.anim || 'none'));
  for (const id of ['#stSize', '#stRot', '#stOpacity']) paintRange($(id));
}

function updateEmojiRows() {
  $('#particleEmojiRow').hidden = state.video.particles !== 'emoji';
  $('#photoEmojiRow').hidden = state.photoFx.type !== 'emoji';
}

function stickerPreview(kind, value, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 108;
  const x = c.getContext('2d');
  x.translate(54, 54);
  drawStickerShape(x, { kind, value, color }, 92);
  return c;
}

function buildStickerUI() {
  // Text stickers: ඒ ඒ font එකෙන්ම පෙන්නනවා
  $('#textStickerGrid').innerHTML = TEXT_PRESETS.map((t, i) => `<button data-i="${i}" style="font-family:'${t.font}', 'Noto Sans Sinhala'">${esc(t.value)}</button>`).join('');
  $('#textStickerGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const t = TEXT_PRESETS[+b.dataset.i];
    addSticker('text', t.value, { font: t.font, color: t.color });
  });
  $('#btnAddTextSticker').addEventListener('click', () => {
    const v = $('#newTextSticker').value.trim();
    if (!v) return toast('මුලින් වචනයක් ටයිප් කරන්න');
    addSticker('text', v, { font: 'Atlas Chirani' });
    $('#newTextSticker').value = '';
  });

  const vg = $('#vecGrid');
  for (const v of VEC_STICKERS) {
    const b = document.createElement('button');
    b.title = v.name;
    b.append(stickerPreview('vec', v.id, v.color));
    b.insertAdjacentHTML('beforeend', `<span>${esc(v.name)}</span>`);
    b.addEventListener('click', () => addSticker('vec', v.id, { color: v.color, size: 0.2 }));
    vg.append(b);
  }

  // Emoji: categories
  const fillEmoji = (catsEl, gridEl, onPick) => {
    catsEl.innerHTML = EMOJI_SETS.map((c, i) => `<button data-i="${i}" class="${i ? '' : 'on'}">${esc(c.name)}</button>`).join('');
    const show = (i) => {
      gridEl.innerHTML = EMOJI_SETS[i].list.map((em) => `<button data-e="${em}">${em}</button>`).join('');
      for (const b of $$('button', catsEl)) b.classList.toggle('on', b.dataset.i === String(i));
    };
    catsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
    // Textarea එකේ cursor එක නැති නොවෙන්න
    gridEl.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-e]')) e.preventDefault(); });
    gridEl.addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) onPick(b.dataset.e); });
    show(0);
  };
  fillEmoji($('#emojiCats'), $('#emojiGrid'), (em) => addSticker('emoji', em, { size: 0.13 }));
  fillEmoji($('#palCats'), $('#palGrid'), (em) => {
    const pos = ta.selectionStart ?? ta.value.length;
    setText(ta.value.slice(0, pos) + em + ta.value.slice(ta.selectionEnd ?? pos), pos + em.length);
  });
  $('#btnEmojiPal').addEventListener('click', () => { $('#emojiPalette').hidden = !$('#emojiPalette').hidden; });

  // තෝරපු sticker එකේ controls
  $('#stAnim').innerHTML = STICKER_ANIMS.map((a) => `<button data-val="${a.id}">${esc(a.name)}</button>`).join('');
  const edit = (fn) => { const s = curSticker(); if (!s) return; fn(s); scheduleRender(); saveSoon(); };
  $('#stSize').addEventListener('input', (e) => edit((s) => { s.size = parseFloat(e.target.value); }));
  $('#stRot').addEventListener('input', (e) => edit((s) => { s.rot = (parseFloat(e.target.value) * Math.PI) / 180; }));
  $('#stOpacity').addEventListener('input', (e) => edit((s) => { s.opacity = parseFloat(e.target.value); }));
  $('#stColor').addEventListener('input', (e) => edit((s) => { s.color = e.target.value; }));
  $('#stText').addEventListener('input', (e) => edit((s) => { s.value = e.target.value || ' '; }));
  $('#stFont').addEventListener('input', (e) => edit((s) => { s.font = e.target.value; loadFontFamily(s.font); }));
  $('#stAnim').addEventListener('click', (e) => {
    const b = e.target.closest('[data-val]');
    if (!b) return;
    edit((s) => { s.anim = b.dataset.val; });
    updateStickerPanel();
    if (isVideo()) playFrom(0);
  });
  $('#stDup').addEventListener('click', () => { const s = curSticker(); if (s) addSticker(s.kind, s.value, { ...s, x: s.x + 0.05, y: s.y + 0.05 }); });
  $('#stFront').addEventListener('click', () => edit((s) => { const l = stickers(); l.splice(l.indexOf(s), 1); l.push(s); }));
  $('#stDel').addEventListener('click', () => { if (selId) deleteSticker(selId); });
  $('#stDone').addEventListener('click', () => selectSticker(null));

  // "ඔක්කොම අයින් කරන්න" එක වැරදිලාවත් ඔබපු එකකට නොවෙන්න දෙපාරක් ඔබන්න ඕනේ
  let clearArm = 0;
  const clearBtn = $('#btnClearStickers');
  const clearLabel = clearBtn.textContent;
  clearBtn.addEventListener('click', () => {
    if (!stickers().length) return toast('Stickers මොකුත් නෑ');
    if (Date.now() - clearArm > 3000) {
      clearArm = Date.now();
      clearBtn.textContent = '⚠️ ඇත්තටම? ආයේ ඔබන්න';
      setTimeout(() => { clearBtn.textContent = clearLabel; }, 3000);
      return;
    }
    stickers().length = 0;
    selectSticker(null);
    saveSoon();
    clearBtn.textContent = clearLabel;
    toast('🧹 Stickers ඔක්කොම අයින් කළා');
  });

  // Effects: ෆොටෝ effects grid + emoji වැස්සේ emoji
  $('#photoFxGrid').innerHTML = PARTICLES.map((p) => fxButton(p.id, p.icon, p.name)).join('');
  const emojiPick = (el, get, set) => {
    el.innerHTML = PARTICLE_EMOJI.map((em) => `<button data-e="${em}">${em}</button>`).join('');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-e]');
      if (!b) return;
      set(b.dataset.e);
      for (const x of $$('button', el)) x.classList.toggle('on', x === b);
      scheduleRender();
      saveSoon();
    });
    for (const x of $$('button', el)) x.classList.toggle('on', x.dataset.e === get());
  };
  emojiPick($('#particleEmojiGrid'), () => state.video.particleEmoji, (v) => { state.video.particleEmoji = v; });
  emojiPick($('#photoEmojiGrid'), () => state.photoFx.emoji, (v) => { state.photoFx.emoji = v; });
  updateEmojiRows();

  // PC එකේ Delete key එකෙන් තෝරපු sticker එක මකන්න
  document.addEventListener('keydown', (e) => {
    if (!selId || e.target.closest('input, textarea, select')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSticker(selId); }
    if (e.key === 'Escape') selectSticker(null);
  });
}

function loadFontFamily(fam) {
  document.fonts.load(`700 40px "${fam}"`, 'අa').then(scheduleRender).catch(() => {});
}

// ෆොටෝ එකේ effects: video එකේ particles වලින් එක "freeze" frame එකක්
function photoFxHook() {
  const f = state.photoFx;
  if (f.type === 'none') return null;
  return (c, W, H) => drawParticles(c, f.type, 3 + f.seed * 1.37, W, H, f.density, f.color, f.emoji);
}

// ---------- ෆොටෝ / Video mode ----------

function selectTab(name) {
  for (const x of $$('#tabs button')) x.classList.toggle('on', x.dataset.tab === name);
  for (const p of $$('.pane')) p.classList.toggle('on', p.dataset.pane === name);
  if (name === 'style') renderThumbs();
  if (name === 'music') requestAnimationFrame(updateMusicUI); // canvas එක පේනවා නම් විතරයි waveform අඳින්න පුළුවන්
}

// උඩ bar එකේ ඔක්කොම එක පේළියට ගැලපෙන්නේ නැත්නම් (පොඩි screen / ලොකු font) icons විතරක් පෙන්නනවා
function fitTopbar() {
  const bar = $('.topbar');
  bar.classList.remove('compact');
  if (bar.scrollWidth > bar.clientWidth + 1) bar.classList.add('compact');
}

function setAppMode(m) {
  state.mode = m;
  const vid = m === 'video';
  for (const b of $$('#appModeSeg button')) b.classList.toggle('on', b.dataset.appmode === m);
  $('[data-tab=video]').hidden = !vid;
  $('[data-tab=music]').hidden = !vid;
  $('#transport').hidden = !vid;
  $('#photoFxBox').hidden = vid; // video එකට effects තියෙන්නේ Video tab එකේ
  selId = null;
  updateStickerPanel();
  // Size බොත්තම් (උඩ තියෙන ඒවයි ෆොටෝ tab එකේ ඒවයි) දැන් තියෙන mode එකේ size එක මාරු කරනවා
  $('#aspectSeg').dataset.seg = vid ? 'video.aspect' : 'aspect';
  $('#photoAspectSeg').dataset.seg = vid ? 'video.aspect' : 'aspect';
  // අකුරු tab එකේ ප්‍රමාණය/තැන controls දැන් mode එකේ text box එකට bind කරනවා
  for (const el of $$('[data-bind*="textBox."]')) el.dataset.bind = (vid ? 'video.' : '') + el.dataset.bind.replace(/^video\./, '');
  for (const el of $$('[data-seg*="textBox."]')) el.dataset.seg = (vid ? 'video.' : '') + el.dataset.seg.replace(/^video\./, '');
  $('#btnExport').innerHTML = vid ? '🎬<span class="lbl"> හදන්න</span>' : '💾<span class="lbl"> Save</span>';
  $('#btnExport').title = vid ? 'Video එක හදන්න' : 'Save';
  fitTopbar();
  const cur = $('#tabs button.on')?.dataset.tab;
  if (vid) selectTab('video');
  else if (cur === 'video' || cur === 'music') selectTab('text');
  if (!vid) pause();
  syncInputs();
  saveSoon();
  scheduleRender();
}

function fxButton(val, icon, name, sub) {
  return `<button data-val="${val}"><span class="ic">${icon}</span><span class="nm">${esc(name)}</span>${sub ? `<span class="sb">${esc(sub)}</span>` : ''}</button>`;
}

function buildVideoUI() {
  $('#textFxGrid').innerHTML = TEXT_FX.map((f) => fxButton(f.id, f.icon, f.name, f.sub)).join('');
  $('#particleGrid').innerHTML = PARTICLES.map((p) => fxButton(p.id, p.icon, p.name)).join('');
  $('#hlFxSeg').innerHTML = HL_FX.map((h) => `<button data-val="${h.id}">${esc(h.name)}</button>`).join('');
  $('#loopFxSeg').innerHTML = LOOP_FX.map((h) => `<button data-val="${h.id}">${esc(h.name)}</button>`).join('');
  $('#motionSeg').innerHTML = MOTIONS.map((m) => `<button data-val="${m.id}">${esc(m.name)}</button>`).join('');
  $('#soundGrid').innerHTML = SOUNDS.map((s) => fxButton(s.id, s.icon, s.name)).join('');
  $('#moodGrid').innerHTML = MOODS.map((m) => `<button data-mood="${m.id}">${esc(m.name)}</button>`).join('');
  $('#moodGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mood]');
    if (!b) return;
    const mood = MOODS.find((m) => m.id === b.dataset.mood);
    deepMerge(state.video, clone(mood.video));
    // එයා තෝරපු සින්දුවක් තියෙනවා නම් ඒක වෙනස් කරන්නේ නෑ
    if (state.audio.src !== 'file') state.audio.src = mood.sound;
    updateMusicUI();
    syncInputs();
    saveSoon();
    playFrom(0);
    toast(`${mood.name} mood එක දැම්මා`);
  });
}

// ---------- Video export ----------

let vidFile = null;
let vidAbort = null;

function resetVideoDialog() {
  vidFile = null;
  $('#vidProgress').hidden = true;
  $('#btnVidMake').hidden = false;
  $('#btnVidDownload').hidden = true;
  $('#btnVidShare').hidden = true;
  $('#btnVidClose').textContent = 'වහන්න';
  const bg = bgMedia();
  const [bw, bh] = sceneSize(videoState(state), bg);
  const short = state.video.quality === '720' ? 720 : 1080;
  const s = short / Math.min(bw, bh);
  const { D } = timeline(state, bg);
  const a = state.audio;
  const sound = a.src !== 'none' || a.clipAudio || a.typing ? '🎵 සද්දය එක්ක' : '🔇 සද්දයක් නෑ';
  $('#vidInfo').textContent = `${Math.round(bw * s)}×${Math.round(bh * s)} • තත්පර ${fmt(D)} • 30fps • MP4 • ${sound}`;
}

async function makeVideo() {
  if (!canEncode()) return toast('😕 මේ browser එකේ video හදන්න බෑ. Chrome එක update කරලා බලන්න');
  pause();
  vidAbort = new AbortController();
  const bar = $('#vidProgress');
  bar.hidden = false;
  $('#btnVidMake').hidden = true;
  $('#btnVidClose').textContent = '✖ නවත්තන්න';
  let lock = null;
  try { lock = await navigator.wakeLock?.request('screen'); } catch { /* wake lock නැත්නම් කමක් නෑ */ }
  try {
    bar.lastElementChild.textContent = '🎵 සද්දය ලෑස්ති කරනවා...';
    const audio = await freshMix();
    const { blob, audioCodec } = await exportVideo({
      st: clone(state), assets, bg: bgMedia(), quality: state.video.quality, audio, signal: vidAbort.signal,
      onProgress: (p) => {
        bar.firstElementChild.style.width = `${(p * 100).toFixed(1)}%`;
        bar.lastElementChild.textContent = p < 1 ? `හදනවා... ${Math.floor(p * 100)}%` : '✅ ලෑස්තියි!';
      },
    });
    vidFile = new File([blob], `sandadiya-${stamp()}.mp4`, { type: 'video/mp4' });
    $('#btnVidDownload').hidden = false;
    $('#btnVidShare').hidden = false;
    $('#btnVidClose').textContent = 'වහන්න';
    if (audio && !audioCodec) toast('⚠️ Video එක හැදුණා, ඒත් මේ device එකේ සද්දය දාන්න බැරි වුණා');
    else toast('✅ Video එක ලෑස්තියි!');
  } catch (err) {
    if (err.name === 'AbortError') toast('Video එක හදන එක නැවැත්තුවා');
    else if (err.message === 'nocodec') toast('😕 මේ device එකේ MP4 හදන්න බෑ');
    else { console.error(err); toast('😕 Video එක හදද්දි අවුලක් වුණා'); }
    if ($('#exportDlg').open) resetVideoDialog();
  } finally {
    vidAbort = null;
    lock?.release().catch(() => {});
  }
}

function setMode(m) {
  mode = m;
  for (const b of $$('#modeSeg button')) b.classList.toggle('on', b.dataset.mode === m);
  canvas.classList.toggle('hl-mode', m === 'highlight');
  $('#gestureHint').textContent = m === 'highlight'
    ? '✨ ෆොටෝ එකේ වචනයක් tap කරලා highlight කරන්න / අයින් කරන්න'
    : '✋ Text එක ඇදලා තැන මාරු කරන්න • ඇඟිලි දෙකෙන් / mouse wheel එකෙන් ලොකු කරන්න • ෆොටෝ එක ඇදලා frame කරන්න';
  // පොඩි screen වල hint එක හංගලා තියෙන්නේ, ඒ නිසා toast එකක් පෙන්නනවා
  if (m === 'highlight' && window.innerWidth <= 600) toast('✨ වචනයක් tap කරලා highlight කරන්න');
}

// ---------- Text tools ----------

function setText(text, selStart, selEnd) {
  ta.value = text;
  state.text = text;
  if (selStart != null) ta.setSelectionRange(selStart, selEnd ?? selStart);
  changed('text');
}

function highlightSelection() {
  const r = toggleMarkupSelection(ta.value, ta.selectionStart, ta.selectionEnd);
  if (r.text === ta.value) {
    toast('වචනයක් select කරලා මේක ඔබන්න');
    return;
  }
  setText(r.text, r.start, r.end);
}

function insertDivider() {
  const v = ta.value, pos = ta.selectionStart;
  const before = v.slice(0, pos), after = v.slice(pos);
  const ins = `${before && !before.endsWith('\n') ? '\n' : ''}---${after && !after.startsWith('\n') ? '\n' : ''}`;
  setText(before + ins + after, before.length + ins.length);
}

function quoteTitle(text) {
  const line = text.split('\n').map((l) => l.replace(/\*/g, '').trim()).find((l) => l && !/^[-—~_]{2,}$/.test(l));
  return line || '(හිස් වදනක්)';
}

function renderQuotes() {
  const box = $('#quoteList');
  $('#btnQuotes').textContent = `📚 වදන් පොත (${quotes.length})`;
  if (box.hidden) return;
  box.innerHTML = quotes.length
    ? quotes.map((q) => `<div class="quote" data-id="${q.id}">
        <span class="qt" title="මේ වදන පාවිච්චි කරන්න">${esc(quoteTitle(q.text))}</span>
        <button data-act="use" title="පාවිච්චි කරන්න">✏️</button>
        <button data-act="del" title="මකන්න">🗑️</button></div>`).join('')
    : '<p class="note">තවම save කරපු වදන් නෑ. 📥 Save වදන ඔබලා එකතු කරන්න.</p>';
}

$('#quoteList').addEventListener('click', (e) => {
  const row = e.target.closest('.quote');
  if (!row) return;
  const q = quotes.find((x) => String(x.id) === row.dataset.id);
  if (!q) return;
  if (e.target.closest('[data-act=del]')) {
    quotes = quotes.filter((x) => x !== q);
    saveQuotes(quotes);
    renderQuotes();
    toast('🗑️ වදන මැකුවා');
  } else {
    setText(q.text);
    toast('✏️ වදන load කළා');
  }
});

// ---------- Presets ----------

let thumbT, thumbKey = '';
function scheduleThumbs() {
  if (!$('[data-pane=style]').classList.contains('on')) return;
  clearTimeout(thumbT);
  thumbT = setTimeout(renderThumbs, 400);
}

function presetCard(p, deletable) {
  const btn = document.createElement('button');
  btn.className = 'preset';
  btn.innerHTML = `<canvas></canvas><span class="pname">${esc(p.name)}</span>${deletable ? '<span class="del" role="button" title="මකන්න">✕</span>' : ''}`;
  const c = btn.querySelector('canvas');
  const [bw, bh] = sceneSize(viewState(), bgMedia());
  const W = 220, H = Math.round((W * bh) / bw);
  c.width = W;
  c.height = H;
  const st = deepMerge(clone(viewState()), clone(p.style));
  renderScene(c.getContext('2d'), st, { ...assets, photo: bgMedia(), photoId: -1 }, { W, H });
  btn.addEventListener('click', (e) => {
    if (e.target.closest('.del')) {
      myPresets = myPresets.filter((x) => x.id !== p.id);
      saveMyPresets(myPresets);
      renderThumbs(true);
      return;
    }
    deepMerge(state, clone(p.style));
    syncInputs();
    loadFonts();
    changed('style');
    toast(`🎨 "${p.name}" ස්ටයිල් එක දැම්මා`);
  });
  return btn;
}

function renderThumbs(force) {
  const key = JSON.stringify([state.mode, state.video.bg, assets.photoId, state.text, state.aspect, state.video.aspect, tb(), state.photo, state.watermark.mode, myPresets.length]);
  if (!force && key === thumbKey) return;
  thumbKey = key;
  $('#presetGrid').replaceChildren(...PRESETS.map((p) => presetCard(p, false)));
  const mine = $('#myPresetGrid');
  if (myPresets.length) mine.replaceChildren(...myPresets.map((p) => presetCard(p, true)));
  else mine.innerHTML = '<p class="empty">ඔයාට ගැලපෙන විදිහට පාට, font හදලා පහළින් නමක් දීලා save කරන්න.</p>';
}

function saveMyStyle() {
  const input = $('#myPresetName');
  const name = input.value.trim() || `මගේ ස්ටයිල් ${myPresets.length + 1}`;
  myPresets.push({ id: Date.now(), name, style: pickStyle(state) });
  saveMyPresets(myPresets);
  input.value = '';
  renderThumbs(true);
  toast(`⭐ "${name}" save කළා`);
}

// ---------- Export ----------

function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function makeFile() {
  const [bw, bh] = sceneSize(state, assets.photo);
  const s = state.export.quality === '2k' ? 2048 / Math.max(bw, bh) : 1080 / Math.min(bw, bh);
  const W = Math.round(bw * s), H = Math.round(bh * s);
  await document.fonts.ready;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  renderScene(c.getContext('2d'), state, assets, { W, H, editor: false, afterBackground: photoFxHook() });
  const png = state.export.format === 'png';
  const blob = await new Promise((r) => c.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.95));
  return new File([blob], `sandadiya-${stamp()}.${png ? 'png' : 'jpg'}`, { type: blob.type });
}

function download(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

async function doDownload() {
  const file = await makeFile();
  download(file);
  $('#exportDlg').close();
  toast('✅ Save කළා! Gallery / Downloads එකේ තියෙනවා');
}

async function doShare() {
  await shareFile(await makeFile());
}

async function shareFile(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'සඳදිය' });
      $('#exportDlg').close();
    } catch (err) {
      if (err.name !== 'AbortError') { download(file); toast('Share වුණේ නෑ, ඒ නිසා download කළා'); }
    }
  } else {
    download(file);
    $('#exportDlg').close();
    toast('මේ device එකේ share බෑ, ඒ නිසා download කළා ✅');
  }
}

// ---------- Wiring ----------

function wire() {
  document.addEventListener('input', (e) => { if (e.target.type === 'range') paintRange(e.target); });
  // Mobile එකේ ටයිප් කරද්දි යට tab bar එක හංගනවා (keyboard එකට ඉඩ)
  document.addEventListener('focusin', (e) => { if (e.target.matches('textarea, input[type=text]')) document.body.classList.add('typing'); });
  document.addEventListener('focusout', () => document.body.classList.remove('typing'));

  bindInputs();

  for (const b of $$('#tabs button')) b.addEventListener('click', () => selectTab(b.dataset.tab));
  for (const b of $$('#modeSeg button')) b.addEventListener('click', () => setMode(b.dataset.mode));
  for (const b of $$('#appModeSeg button')) b.addEventListener('click', () => setAppMode(b.dataset.appmode));

  // Video transport
  $('#btnPlay').addEventListener('click', () => (player.playing ? pause() : play()));
  const scrub = $('#scrub');
  scrub.addEventListener('input', () => {
    scrubbing = true;
    if (player.playing) pause();
    player.t = parseFloat(scrub.value);
    syncBgVideo(true);
    scheduleRender();
  });
  scrub.addEventListener('change', () => { scrubbing = false; });

  $('#btnMusic').addEventListener('click', () => $('#fileMusic').click());
  $('#fileMusic').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) setMusic(f, f.name.replace(/\.[^.]+$/, ''));
    else if (!assets.music) { state.audio.src = 'none'; syncInputs(); updateMusicUI(); }
    e.target.value = '';
  });
  // Waveform එකේ tap / drag කරලා සින්දුවේ පටන් ගන්න තැන තෝරන්න (තෝරපු කොටසේ මැද එතනට එනවා)
  const wave = $('#wave');
  const pickStart = (e) => {
    if (!assets.music) return;
    const r = wave.getBoundingClientRect();
    const at = ((e.clientX - r.left) / r.width) * assets.music.duration;
    state.audio.start = Math.round(clamp(at - player.D / 2, 0, Math.max(0, assets.music.duration - 1)) * 10) / 10;
    syncInputs();
    updateMusicUI();
    saveSoon();
  };
  wave.addEventListener('pointerdown', (e) => { wave.setPointerCapture(e.pointerId); pickStart(e); });
  wave.addEventListener('pointermove', (e) => { if (wave.hasPointerCapture(e.pointerId)) pickStart(e); });
  wave.addEventListener('pointerup', () => { scheduleRender(); playFrom(0); });

  $('#btnBgVideo').addEventListener('click', () => $('#fileVideo').click());
  $('#fileVideo').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) setBgVideo(f);
    e.target.value = '';
  });
  $('#btnVidMake').addEventListener('click', makeVideo);
  $('#btnVidDownload').addEventListener('click', () => { if (vidFile) { download(vidFile); toast('✅ Video එක save කළා'); } });
  $('#btnVidShare').addEventListener('click', () => { if (vidFile) shareFile(vidFile); });
  // Dialog එක වැහුවොත් හදමින් තියෙන video එක නවත්තනවා
  $('#exportDlg').addEventListener('close', () => vidAbort?.abort());

  const pickPhoto = () => $('#filePhoto').click();
  $('#btnPhoto').addEventListener('click', pickPhoto);
  $('#btnPhoto2').addEventListener('click', pickPhoto);
  $('#btnPhoto3').addEventListener('click', pickPhoto);
  $('#filePhoto').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) setPhotoFromBlob(f);
    e.target.value = '';
  });
  $('#btnRemovePhoto').addEventListener('click', removePhoto);
  $('#btnResetPhoto').addEventListener('click', () => {
    state.photo = { zoom: 1, panX: 0, panY: 0 };
    syncInputs();
    changed('photo');
  });

  // Highlight බොත්තම ඔබද්දි textarea එකේ selection එක නැති නොවෙන්න
  for (const id of ['#btnHl', '#btnDivider']) $(id).addEventListener('pointerdown', (e) => e.preventDefault());
  $('#btnHl').addEventListener('click', highlightSelection);
  $('#btnDivider').addEventListener('click', insertDivider);
  $('#btnSaveQuote').addEventListener('click', () => {
    if (!state.text.trim()) return toast('වදනක් ටයිප් කරලා save කරන්න');
    quotes = [{ id: Date.now(), text: state.text }, ...quotes.filter((q) => q.text !== state.text)].slice(0, 300);
    saveQuotes(quotes);
    renderQuotes();
    toast('📥 වදන් පොතට එකතු කළා');
  });
  $('#btnQuotes').addEventListener('click', () => {
    const box = $('#quoteList');
    box.hidden = !box.hidden;
    renderQuotes();
  });

  $('#btnCenter').addEventListener('click', () => { Object.assign(tb(), { x: 0.5, y: 0.5 }); changed('textBox'); });
  $('#btnLeftArea').addEventListener('click', () => { Object.assign(tb(), { x: 0.36, y: 0.47 }); changed('textBox'); });

  $('#btnAddFont').addEventListener('click', () => $('#fileFont').click());
  $('#fileFont').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) addFontFile(f);
    e.target.value = '';
  });

  $('#btnSaveStyle').addEventListener('click', saveMyStyle);

  $('#btnExport').addEventListener('click', () => {
    syncInputs();
    $('#exportPhoto').hidden = isVideo();
    $('#exportVideo').hidden = !isVideo();
    if (isVideo()) resetVideoDialog();
    $('#exportDlg').showModal();
  });
  // Quality මාරු කළාම size එක update කරන්න
  $('#exportVideo [data-seg="video.quality"]').addEventListener('click', () => setTimeout(() => { if (!vidAbort) resetVideoDialog(); }));
  $('#btnDownload').addEventListener('click', doDownload);
  $('#btnShare').addEventListener('click', doShare);

  // PC එකේ ෆොටෝ එකක් drag & drop හරි Ctrl+V හරි කරන්න පුළුවන්
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
    if (f) setPhotoFromBlob(f);
  });
  window.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); setPhotoFromBlob(item.getAsFile()); }
  });

  document.fonts.addEventListener('loadingdone', () => { thumbKey = ''; scheduleRender(); });
  new ResizeObserver(scheduleRender).observe(stage);
  new ResizeObserver(fitTopbar).observe($('.topbar'));
  document.fonts.ready.then(fitTopbar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(state); });
}

async function init() {
  buildVideoUI();
  buildStickerUI();
  wire();
  fillFontSelects();
  ta.value = state.text;
  setAppMode(state.mode);
  setMode('move');
  renderQuotes();
  loadFonts();
  scheduleRender();

  const logo = new Image();
  logo.src = 'icons/icon-512.png';
  logo.decode().then(() => { assets.logo = logo; scheduleRender(); }).catch(() => {});

  for (const f of (await idb.get('fonts')) || []) {
    try { await registerFont(f.family, f.buf); } catch { /* කැඩිච්ච font එකක් නම් අතෑරලා යනවා */ }
  }
  if (customFonts.length) fillFontSelects();
  loadFonts();

  const blob = await idb.get('photo');
  if (blob) await setPhotoFromBlob(blob, false);
  const vblob = await idb.get('bgvideo');
  if (vblob) await setBgVideo(vblob, false);
  const saved = await idb.get('music');
  if (saved?.blob) await setMusic(saved.blob, saved.name, false);
  updateMusicUI();
  preloadAllFonts();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
