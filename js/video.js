// Video mode: text animations, background motion, timeline සහ MP4 export.
// Frame එකක් අඳින්නේ render.js එකේ renderScene එකෙන්මයි. මෙතන තියෙන්නේ වෙලාව අනුව
// මොනවා වෙනස් වෙනවද කියන එක විතරයි.

import { renderScene, sceneSize, layoutText, graphemes } from './render.js';
import { drawParticles } from './particles.js';
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';

// unit: word = වචනයෙන් වචනය, char = අකුරෙන් අකුර, line = පේළියෙන් පේළිය, all = එකපාර
// rate = තත්පරයකට units කීයක්ද (speed 1 දී), dur = එක unit එකක් මතු වෙන්න යන කාලය
export const TEXT_FX = [
  { id: 'typeword', name: 'Typewriter', sub: 'වචනයෙන් වචනය', icon: '⌨️', unit: 'word', rate: 3.6, dur: 0.12 },
  { id: 'typeletter', name: 'Typewriter', sub: 'අකුරෙන් අකුර', icon: '✍️', unit: 'char', rate: 16, dur: 0 },
  { id: 'fadeword', name: 'මෘදු වචන', sub: 'හිමින් මතුවෙනවා', icon: '🌫️', unit: 'word', rate: 3, dur: 0.7 },
  { id: 'fadeline', name: 'පේළියෙන් පේළිය', sub: 'Fade', icon: '📜', unit: 'line', rate: 0.85, dur: 1 },
  { id: 'slideup', name: 'යටින් උඩට', sub: 'Slide', icon: '⬆️', unit: 'line', rate: 0.85, dur: 0.9 },
  { id: 'blurin', name: 'සිහිනයක් වගේ', sub: 'Blur → පැහැදිලි', icon: '💭', unit: 'line', rate: 0.75, dur: 1.2 },
  { id: 'pop', name: 'Pop', sub: 'පනින වචන', icon: '💥', unit: 'word', rate: 3, dur: 0.45 },
  { id: 'whole', name: 'එකපාර', sub: 'මුළු වදනම fade', icon: '🌅', unit: 'all', rate: 1, dur: 1.6 },
  { id: 'none', name: 'Animation නෑ', sub: 'නිකන්ම', icon: '⏸️', unit: 'all', rate: 1, dur: 0 },
];
const FX = Object.fromEntries(TEXT_FX.map((f) => [f.id, f]));

export const MOTIONS = [
  { id: 'none', name: '⏹️ නෑ' },
  { id: 'zoomin', name: '🔍 ළඟට' },
  { id: 'zoomout', name: '🔭 ඈතට' },
  { id: 'panleft', name: '⬅️ වමට' },
  { id: 'panright', name: '➡️ දකුණට' },
];

export const HL_FX = [
  { id: 'none', name: 'නෑ' },
  { id: 'glow', name: '✨ දිලිසෙනවා' },
  { id: 'beat', name: '💓 හද ගැස්ම' },
];

// එක tap එකෙන් video ස්ටයිල් එකක්
export const MOODS = [
  { id: 'love', name: '💕 ආදර', video: { textFx: 'fadeword', particles: 'petals', particleColor: '#ffb3c6', motion: 'zoomin', hlFx: 'glow' } },
  { id: 'sad', name: '💔 විරහ', video: { textFx: 'typeword', particles: 'rain', particleColor: '#cfe0ff', motion: 'zoomout', hlFx: 'none' } },
  { id: 'night', name: '🌙 සඳ එළිය', video: { textFx: 'typeword', particles: 'stars', particleColor: '#ffffff', motion: 'zoomin', hlFx: 'glow' } },
  { id: 'dream', name: '💭 සිහින', video: { textFx: 'blurin', particles: 'bokeh', particleColor: '#ffe2b0', motion: 'panright', hlFx: 'glow' } },
  { id: 'heart', name: '💓 හද ගැස්ම', video: { textFx: 'pop', particles: 'hearts', particleColor: '#ff6f91', motion: 'zoomin', hlFx: 'beat' } },
  { id: 'calm', name: '🌿 සන්සුන්', video: { textFx: 'fadeline', particles: 'fireflies', particleColor: '#ffe680', motion: 'panleft', hlFx: 'none' } },
];

const clamp01 = (p) => (p < 0 ? 0 : p > 1 ? 1 : p);
const smooth = (p) => { p = clamp01(p); return p * p * (3 - 2 * p); };
const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3);
const easeOutBack = (p) => { p = clamp01(p); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

// Video එකට ඕනේ state එක: aspect එක video එකේම එකෙන්
export const videoState = (st) => ({ ...st, aspect: st.video.aspect, textBox: st.video.textBox });

// ---------- Text schedule ----------

// හැම unit (gi) එකක්ම පටන් ගන්න වෙලාව. char mode එකේදී වචනේ අකුරු පටන් ගන්න වෙලාවයි, අකුරක් අතර කාලයයි.
function buildSchedule(lay, fx, v) {
  const step = 1 / (fx.rate * v.speed);
  const starts = new Array(lay.units).fill(0);
  const chars = fx.unit === 'char' ? new Array(lay.units) : null;
  let t = v.delay;
  for (const l of lay.lines) {
    if (l.type === 'gap') { if (fx.unit !== 'all') t += step * (fx.unit === 'char' ? 4 : 0.6); continue; }
    if (fx.unit === 'line') {
      if (l.type === 'divider') starts[l.gi] = t;
      else for (const w of l.words) starts[w.gi] = t;
      t += step;
    } else if (fx.unit === 'all') {
      if (l.type === 'divider') starts[l.gi] = t;
      else for (const w of l.words) starts[w.gi] = t;
    } else if (fx.unit === 'word') {
      if (l.type === 'divider') { starts[l.gi] = t; t += step; continue; }
      for (const w of l.words) { starts[w.gi] = t; t += step; }
      t += step * 0.6; // පේළිය ඉවර වුණාම පොඩි නැවතීමක්
    } else {
      if (l.type === 'divider') { starts[l.gi] = t; t += step * 4; continue; }
      for (const w of l.words) {
        const n = graphemes(w.runs.map((r) => r.text).join('')).length;
        starts[w.gi] = t;
        chars[w.gi] = n;
        t += step * (n + 1);
      }
      t += step * 5;
    }
  }
  return { starts, chars, step, end: t + fx.dur };
}

function makeAnim(lay, st, t) {
  const v = st.video;
  const fx = FX[v.textFx] || FX.typeword;
  const sch = buildSchedule(lay, fx, v);
  const base = lay.base;
  const out = { a: 1, dy: 0, s: 1, blur: 0, chars: undefined };

  let hlGlow = 0, hlScale = 1;
  if (v.hlFx === 'glow') hlGlow = 0.35 + 0.3 * Math.sin(t * 2.6);
  else if (v.hlFx === 'beat') {
    const ph = t % 1.25;
    const b = Math.exp(-(((ph - 0.1) / 0.07) ** 2)) + 0.6 * Math.exp(-(((ph - 0.34) / 0.07) ** 2));
    hlScale = 1 + 0.07 * b;
    hlGlow = 0.45 * b;
  }

  return {
    hlGlow, hlScale,
    unit(gi) {
      if (fx.id === 'none') return null;
      const start = sch.starts[gi];
      out.a = 1; out.dy = 0; out.s = 1; out.blur = 0; out.chars = undefined;
      if (fx.unit === 'char') {
        if (t < start) { out.a = 0; return out; }
        if (sch.chars[gi] != null) {
          const n = Math.floor((t - start) / sch.step) + 1;
          if (n < sch.chars[gi]) out.chars = n;
        }
        return out;
      }
      const p = fx.dur > 0 ? (t - start) / fx.dur : t >= start ? 1 : 0;
      if (p >= 1) return out;
      if (p <= 0) { out.a = 0; return out; }
      switch (fx.id) {
        case 'typeword': out.a = p; break;
        case 'fadeword': { const e = easeOut(p); out.a = smooth(p); out.dy = (1 - e) * base * 0.35; break; }
        case 'fadeline': out.a = smooth(p); break;
        case 'slideup': out.a = smooth(p * 1.3); out.dy = (1 - easeOut(p)) * base * 1.2; break;
        case 'blurin': out.a = smooth(p * 1.2); out.blur = (1 - easeOut(p)) * base * 0.45; break;
        case 'pop': out.a = clamp01(p * 3); out.s = 0.35 + 0.65 * easeOutBack(p); break;
        case 'whole': out.a = smooth(p); out.s = 1.05 - 0.05 * easeOut(p); break;
        default: break;
      }
      return out;
    },
  };
}

// ---------- Timeline ----------

let scratch = null;
// revealEnd = වදන ඔක්කොම පේන්න ගන්න වෙලාව, D = video එකේ මුළු දිග
export function timeline(st, bg) {
  scratch ??= document.createElement('canvas').getContext('2d');
  const vst = videoState(st);
  const [W, H] = sceneSize(vst, bg);
  const lay = layoutText(scratch, vst, W, H);
  const fx = FX[st.video.textFx] || FX.typeword;
  const revealEnd = fx.id === 'none' ? 0 : buildSchedule(lay, fx, st.video).end;
  const auto = Math.max(5, Math.ceil((revealEnd + st.video.hold) * 2) / 2);
  return { revealEnd, auto, D: st.video.autoLen ? auto : st.video.duration };
}

// ---------- Frame ----------

function withMotion(st, t, D) {
  const vst = videoState(st);
  const m = st.video.motion;
  if (m === 'none') return vst;
  const e = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(D > 0 ? t / D : 0));
  const z0 = st.photo.zoom;
  const photo = { ...st.photo };
  if (m === 'zoomin') photo.zoom = z0 * (1 + 0.18 * e);
  else if (m === 'zoomout') photo.zoom = z0 * (1.18 - 0.18 * e);
  else {
    photo.zoom = Math.max(z0, 1.18);
    const dir = m === 'panleft' ? 1 : -1;
    photo.panX = Math.max(-1, Math.min(1, dir * (0.85 - 1.7 * e)));
  }
  return { ...vst, photo };
}

function fadeAt(t, D) {
  if (t < 0.6) return 1 - t / 0.6;
  if (t > D - 0.8) return clamp01((t - (D - 0.8)) / 0.8);
  return 0;
}

// o: { W, H, t, D, bg (img/video), editor }
export function renderVideoFrame(ctx, st, assets, o) {
  const v = st.video;
  const fst = withMotion(st, o.t, o.D);
  return renderScene(ctx, fst, { ...assets, photo: o.bg, photoId: 'video' }, {
    W: o.W, H: o.H, editor: o.editor, cache: false,
    afterBackground: v.particles !== 'none' ? (c, W, H) => drawParticles(c, v.particles, o.t, W, H, v.density, v.particleColor) : null,
    makeAnim: (lay) => makeAnim(lay, fst, o.t),
    // Edit කරද්දි (pause) කළු වෙන්න දෙන්නේ නෑ, එතකොට වදන පේනවා
    fade: v.fade && !o.editor ? fadeAt(o.t, o.D) : 0,
  });
}

// ---------- MP4 export ----------

export const canEncode = () => typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function';

async function pickConfig(W, H, fps) {
  const bitrate = Math.round(W * H * fps * 0.13); // 1080×1920 නම් ~8 Mbps
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033', 'avc1.42001f']) {
    for (const hardwareAcceleration of ['no-preference', 'prefer-software']) {
      const cfg = { codec, width: W, height: H, bitrate, framerate: fps, avc: { format: 'avc' }, hardwareAcceleration };
      try {
        const r = await VideoEncoder.isConfigSupported(cfg);
        if (r.supported) return r.config;
      } catch { /* ඊළඟ එක බලනවා */ }
    }
  }
  return null;
}

function seekVideo(vid, time) {
  return new Promise((resolve) => {
    if (Math.abs(vid.currentTime - time) < 0.0005 && vid.readyState >= 2) return resolve();
    let done = false;
    const finish = () => { if (done) return; done = true; vid.removeEventListener('seeked', finish); resolve(); };
    vid.addEventListener('seeked', finish);
    vid.currentTime = time;
    setTimeout(finish, 1500);
  });
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

// { st, assets, bg, quality: '720'|'1080', onProgress(0..1), signal } → MP4 Blob
export async function exportVideo({ st, assets, bg, quality, onProgress, signal }) {
  const vst = videoState(st);
  const [bw, bh] = sceneSize(vst, bg);
  const short = quality === '720' ? 720 : 1080;
  const s = short / Math.min(bw, bh);
  const W = even(bw * s), H = even(bh * s);
  const fps = 30;
  const { D } = timeline(st, bg);
  const total = Math.round(D * fps);

  const config = await pickConfig(W, H, fps);
  if (!config) throw new Error('nocodec');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H, frameRate: fps },
    fastStart: 'in-memory',
  });
  let encErr = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encErr = e; } });
  enc.configure(config);

  const isVideo = bg instanceof HTMLVideoElement;
  if (isVideo) bg.pause();
  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
      if (encErr) throw encErr;
      const t = i / fps;
      if (isVideo) await seekVideo(bg, t % bg.duration);
      renderVideoFrame(ctx, st, assets, { W, H, t, D, bg });
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      if (i % 3 === 0) {
        onProgress?.(i / total);
        await new Promise((r) => setTimeout(r)); // UI එක හිර නොවෙන්න
      }
    }
    await enc.flush();
    if (encErr) throw encErr;
  } finally {
    if (enc.state !== 'closed') enc.close();
  }
  muxer.finalize();
  onProgress?.(1);
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
