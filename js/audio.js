// Video එකේ සද්දය: සින්දුව + app එකේම හදන සද්ද (piano, ambient, වැස්ස, මුහුද) + typewriter සද්දය.
// ඔක්කොම OfflineAudioContext එකකින් එක AudioBuffer එකකට mix කරනවා. Preview එකටයි export එකටයි
// යන්නේ එකම buffer එක, ඒ නිසා ඇහෙන දේමයි MP4 එකට යන්නෙත්.

export const SAMPLE_RATE = 48000;

export const SOUNDS = [
  { id: 'none', name: 'නෑ', icon: '🔇' },
  { id: 'file', name: 'මගේ සින්දුව', icon: '🎵' },
  { id: 'piano', name: 'මෘදු Piano', icon: '🎹' },
  { id: 'pad', name: 'Ambient', icon: '🌌' },
  { id: 'rain', name: 'වැස්ස', icon: '🌧️' },
  { id: 'waves', name: 'මුහුදු රළ', icon: '🌊' },
  { id: 'guitar', name: 'Guitar', icon: '🎸' },
  { id: 'musicbox', name: 'Music box', icon: '🎼' },
  { id: 'crickets', name: 'රෑ කෘමීන්', icon: '🦗' },
  { id: 'birds', name: 'කුරුල්ලෝ', icon: '🐦' },
  { id: 'wind', name: 'සුළඟ', icon: '🍃' },
  { id: 'heartbeat', name: 'හද ගැස්ම', icon: '💓' },
  { id: 'fire', name: 'ගිනි මැලය', icon: '🔥' },
];

// ඕනම format එකක (mp3, m4a, wav, ogg, mp4 video) සද්දය 48kHz AudioBuffer එකකට
export async function decodeAudio(blob) {
  const buf = await blob.arrayBuffer();
  return new OfflineAudioContext(2, 1, SAMPLE_RATE).decodeAudioData(buf);
}

// ---------- Generated sounds ----------

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// white / brown noise buffer (loop කරන්න)
function noise(ctx, seconds, seed, brown = false) {
  const rnd = seeded(seed);
  const b = ctx.createBuffer(2, Math.floor(seconds * ctx.sampleRate), ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = rnd() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
  }
  return b;
}

function reverb(ctx, seconds = 3.5, decay = 3) {
  const rnd = seeded(7);
  const len = Math.floor(seconds * ctx.sampleRate);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = ctx.createConvolver();
  conv.buffer = b;
  return conv;
}

const gainNode = (ctx, v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function loopNoise(ctx, buf, D) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(0);
  s.stop(D);
  return s;
}

// Am – F – C – G, හිමින් arpeggio එකක් + bass, reverb එක්ක
function piano(ctx, out, D) {
  const wet = gainNode(ctx, 0.45, out), dry = gainNode(ctx, 0.75, out);
  const rev = reverb(ctx);
  rev.connect(wet);
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const bar = (60 / 68) * 4;
  const note = (m, t, vel, len) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    g.connect(dry);
    g.connect(rev);
    for (const [type, mul, v] of [['sine', 1, 1], ['triangle', 2, 0.18], ['sine', 3, 0.06]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz(m) * mul;
      const og = gainNode(ctx, v, g);
      o.connect(og);
      o.start(t);
      o.stop(t + len + 0.05);
    }
  };
  for (let b = 0, t = 0.15; t < D; b++, t += bar) {
    const [r, m3, f5] = chords[b % 4];
    note(r - 12, t, 0.2, bar * 1.1);
    const arp = [r, m3, f5, m3 + 12, f5 + 12, m3 + 12, f5, m3];
    arp.forEach((m, i) => note(m + 12, t + (i * bar) / 8, i === 0 ? 0.13 : 0.085, 2.2));
  }
}

// මෘදු, දිගට ඇදෙන chords (synth pad)
function pad(ctx, out, D) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const rev = reverb(ctx, 4, 2.5);
  lp.connect(gainNode(ctx, 0.5, out));
  lp.connect(rev);
  rev.connect(gainNode(ctx, 0.6, out));
  const chords = [[57, 64, 72], [53, 60, 69], [48, 55, 64], [55, 62, 71]];
  const bar = 6;
  for (let b = 0, t = 0; t < D; b++, t += bar) {
    for (const m of chords[b % 4]) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 2);
      g.gain.setValueAtTime(0.05, t + bar - 0.5);
      g.gain.linearRampToValueAtTime(0, t + bar + 1.5);
      g.connect(lp);
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(m);
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        o.stop(t + bar + 1.6);
      }
    }
  }
}

function rain(ctx, out, D) {
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
  loopNoise(ctx, noise(ctx, 4, 11), D).connect(hp);
  hp.connect(lp);
  lp.connect(gainNode(ctx, 0.22, out));
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 250;
  loopNoise(ctx, noise(ctx, 5, 12, true), D).connect(low);
  low.connect(gainNode(ctx, 0.5, out));
}

function waves(ctx, out, D) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
  const swell = ctx.createGain();
  loopNoise(ctx, noise(ctx, 6, 21, true), D).connect(lp);
  lp.connect(swell);
  const hiss = ctx.createBiquadFilter(); hiss.type = 'highpass'; hiss.frequency.value = 2500;
  loopNoise(ctx, noise(ctx, 3, 22), D).connect(hiss);
  hiss.connect(gainNode(ctx, 0.05, swell));
  swell.connect(gainNode(ctx, 0.9, out));
  const rnd = seeded(5);
  swell.gain.setValueAtTime(0.08, 0);
  for (let t = 0; t < D + 8;) {
    const up = 2.5 + rnd() * 1.5, down = 3.5 + rnd() * 2;
    swell.gain.linearRampToValueAtTime(0.55 + rnd() * 0.3, t + up);
    swell.gain.linearRampToValueAtTime(0.08, t + up + down);
    t += up + down;
  }
}

// Karplus-Strong: ඇත්ත guitar තතක් වගේ ඇහෙන "pluck" සද්දය
const pluckCache = new Map();
function pluck(ctx, midi, seconds = 2.6) {
  const key = `${midi}:${ctx.sampleRate}`;
  if (pluckCache.has(key)) return pluckCache.get(key);
  const sr = ctx.sampleRate, n = Math.floor(seconds * sr);
  const N = Math.max(2, Math.round(sr / hz(midi)));
  const rnd = seeded(midi * 13 + 1);
  const d = new Float32Array(n);
  for (let i = 0; i < N; i++) d[i] = rnd() * 2 - 1;
  for (let i = N; i < n; i++) d[i] = 0.4985 * (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]);
  // මුලින්ම තියෙන ගොරෝසු noise එක මෘදු කරනවා
  let last = 0;
  for (let i = 0; i < n; i++) { last = last * 0.55 + d[i] * 0.45; d[i] = last; }
  const b = ctx.createBuffer(1, n, sr);
  b.copyToChannel(d, 0);
  pluckCache.set(key, b);
  return b;
}

function guitar(ctx, out, D) {
  const rev = reverb(ctx, 2.5, 3);
  rev.connect(gainNode(ctx, 0.3, out));
  const dry = gainNode(ctx, 0.9, out);
  const chords = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]];
  const bar = (60 / 76) * 4;
  const play = (m, t, v) => {
    const s = ctx.createBufferSource();
    s.buffer = pluck(ctx, m);
    const g = gainNode(ctx, v, dry);
    g.connect(rev);
    const pan = ctx.createStereoPanner();
    pan.pan.value = ((m % 7) - 3) / 8;
    s.connect(pan); pan.connect(g);
    s.start(t);
  };
  for (let b = 0, t = 0.1; t < D; b++, t += bar) {
    const [bass, a, c, e] = chords[b % 4];
    const pat = [bass, c, e, a + 12, e, c, a + 12, e];
    pat.forEach((m, i) => play(m, t + (i * bar) / 8, i === 0 ? 0.55 : 0.32));
  }
}

function musicbox(ctx, out, D) {
  const rev = reverb(ctx, 3, 2.5);
  rev.connect(gainNode(ctx, 0.5, out));
  const dry = gainNode(ctx, 0.7, out);
  // සරල නැළවිලි ගීයක් වගේ (pentatonic)
  const mel = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, 69, 72, 74];
  const step = 60 / 104;
  for (let i = 0, t = 0.1; t < D; i++, t += step) {
    const m = mel[i % mel.length];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 1.8);
    g.connect(dry); g.connect(rev);
    for (const [mul, v] of [[1, 1], [2.76, 0.25], [5.4, 0.08]]) {
      const o = ctx.createOscillator();
      o.frequency.value = hz(m) * mul;
      o.connect(gainNode(ctx, v, g));
      o.start(t); o.stop(t + 1.9);
    }
  }
}

function crickets(ctx, out, D) {
  const sr = ctx.sampleRate;
  const chirp = ctx.createBuffer(1, Math.floor(0.14 * sr), sr);
  const d = chirp.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const tt = i / sr, k = Math.floor(tt / 0.035), ph = tt - k * 0.035;
    d[i] = ph < 0.02 ? Math.sin(2 * Math.PI * 4700 * tt) * Math.sin((Math.PI * ph) / 0.02) : 0;
  }
  const rnd = seeded(31);
  for (const [pan, rate, vol] of [[-0.6, 1, 0.12], [0.5, 0.93, 0.09], [0.1, 1.06, 0.06]]) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(gainNode(ctx, 1, out));
    for (let t = rnd() * 0.6; t < D; t += 0.55 + rnd() * 0.5) {
      const s = ctx.createBufferSource();
      s.buffer = chirp;
      s.playbackRate.value = rate;
      s.connect(gainNode(ctx, vol * (0.7 + rnd() * 0.3), p));
      s.start(t);
    }
  }
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 300;
  loopNoise(ctx, noise(ctx, 5, 32, true), D).connect(low);
  low.connect(gainNode(ctx, 0.12, out));
}

function birds(ctx, out, D) {
  const rnd = seeded(41);
  const chirp = (t, f0, f1, len, v, pan) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + len * 0.2);
    g.gain.linearRampToValueAtTime(0, t + len);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    o.connect(g); g.connect(p); p.connect(out);
    o.start(t); o.stop(t + len + 0.02);
  };
  for (let t = 0.3; t < D; t += 1.2 + rnd() * 2.2) {
    const pan = rnd() * 1.6 - 0.8, base = 2600 + rnd() * 1800, notes = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < notes; k++) {
      const up = rnd() > 0.5;
      chirp(t + k * (0.09 + rnd() * 0.06), base * (up ? 0.8 : 1.25), base * (up ? 1.3 : 0.75), 0.06 + rnd() * 0.05, 0.05 + rnd() * 0.04, pan);
    }
  }
  wind(ctx, gainNode(ctx, 0.25, out), D);
}

function wind(ctx, out, D) {
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
  const g = ctx.createGain();
  loopNoise(ctx, noise(ctx, 6, 51, true), D).connect(bp);
  bp.connect(g); g.connect(gainNode(ctx, 1.2, out));
  const rnd = seeded(52);
  bp.frequency.setValueAtTime(400, 0);
  g.gain.setValueAtTime(0.25, 0);
  for (let t = 0; t < D + 4; t += 2 + rnd() * 2) {
    bp.frequency.linearRampToValueAtTime(250 + rnd() * 700, t + 2);
    g.gain.linearRampToValueAtTime(0.2 + rnd() * 0.55, t + 2);
  }
}

function heartbeat(ctx, out, D) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
  lp.connect(gainNode(ctx, 0.85, out));
  const thump = (t, v) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(lp);
    o.start(t); o.stop(t + 0.25);
  };
  for (let t = 0.2; t < D; t += 1.0) { thump(t, 0.9); thump(t + 0.28, 0.6); }
}

function fire(ctx, out, D) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  loopNoise(ctx, noise(ctx, 5, 61, true), D).connect(lp);
  lp.connect(gainNode(ctx, 0.55, out));
  const sr = ctx.sampleRate;
  const crack = ctx.createBuffer(1, Math.floor(0.02 * sr), sr);
  const d = crack.getChannelData(0);
  const r0 = seeded(62);
  for (let i = 0; i < d.length; i++) d[i] = (r0() * 2 - 1) * Math.exp(-i / (d.length * 0.15));
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  hp.connect(out);
  const rnd = seeded(63);
  for (let t = 0; t < D; t += -Math.log(1 - rnd() * 0.999) / 7) {
    const s = ctx.createBufferSource();
    s.buffer = crack;
    s.playbackRate.value = 0.5 + rnd();
    s.connect(gainNode(ctx, 0.1 + rnd() * 0.45, hp));
    s.start(t);
  }
}

const GEN = { piano, pad, rain, waves, guitar, musicbox, crickets, birds, wind, heartbeat, fire };

// Typewriter "ටක්" සද්දය
function clicks(ctx, out, times, vol) {
  if (!times.length) return;
  const buf = ctx.createBuffer(1, Math.floor(0.035 * ctx.sampleRate), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const rnd = seeded(3);
  for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.exp(-i / (d.length * 0.12));
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2600;
  bp.Q.value = 0.9;
  bp.connect(out);
  const r = seeded(9);
  for (const t of times) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = 0.85 + r() * 0.35;
    s.connect(gainNode(ctx, vol * (0.55 + r() * 0.45), bp));
    s.start(t);
  }
}

// ---------- Mix ----------

// a = state.audio, D = video එකේ දිග, music / clip = AudioBuffer (නැත්නම් null), typing = වෙලාවල් array එක
// සද්දයක්ම නැත්නම් null
export async function renderMix({ a, D, music, clip, typing }) {
  const hasMain = a.src !== 'none' && (a.src !== 'file' || music);
  const hasClip = a.clipAudio && clip;
  const hasTyping = a.typing && typing?.length;
  if (!hasMain && !hasClip && !hasTyping) return null;

  const ctx = new OfflineAudioContext(2, Math.ceil(D * SAMPLE_RATE), SAMPLE_RATE);
  const master = gainNode(ctx, 1, ctx.destination);

  if (hasMain) {
    // සින්දුව / generated සද්දය: volume + fade in/out
    const g = gainNode(ctx, 0, master);
    const fi = Math.min(a.fadeIn, D / 2), fo = Math.min(a.fadeOut, D / 2);
    g.gain.setValueAtTime(fi > 0 ? 0 : a.volume, 0);
    if (fi > 0) g.gain.linearRampToValueAtTime(a.volume, fi);
    g.gain.setValueAtTime(a.volume, Math.max(fi, D - fo));
    if (fo > 0) g.gain.linearRampToValueAtTime(0, D);
    if (a.src === 'file') {
      const s = ctx.createBufferSource();
      s.buffer = music;
      s.loop = music.duration - a.start < D; // සින්දුව කෙටි නම් loop කරනවා
      s.connect(g);
      s.start(0, Math.min(a.start, Math.max(0, music.duration - 0.1)));
    } else {
      // piano / pad වැස්සට වඩා හීනි නිසා එක ලෙවල් එකකට ගේනවා
      const level = { piano: 2, pad: 2.6, guitar: 1.6, musicbox: 1.8, birds: 3.5, crickets: 2.5, wind: 1.8 }[a.src] || 1;
      GEN[a.src]?.(ctx, gainNode(ctx, level, g), D);
    }
  }
  if (hasClip) {
    const s = ctx.createBufferSource();
    s.buffer = clip;
    s.loop = true; // video clip එකත් loop වෙන නිසා
    s.connect(gainNode(ctx, a.clipVolume, master));
    s.start(0);
  }
  if (hasTyping) clicks(ctx, master, typing.filter((t) => t < D), a.typingVolume);

  return ctx.startRendering();
}

// ---------- Preview playback ----------

let live = null, liveSrc = null;

export function playMix(buf, offset) {
  stopMix();
  if (!buf) return;
  live ??= new AudioContext();
  live.resume().catch(() => {});
  liveSrc = live.createBufferSource();
  liveSrc.buffer = buf;
  liveSrc.connect(live.destination);
  liveSrc.start(0, Math.max(0, Math.min(offset, buf.duration - 0.01)));
}

export function stopMix() {
  try { liveSrc?.stop(); } catch { /* දැනටමත් නැවතිලා */ }
  liveSrc = null;
}

// ---------- Waveform ----------

const peaksCache = new WeakMap();
function peaks(buf, n) {
  const key = `${n}`;
  const cached = peaksCache.get(buf);
  if (cached?.key === key) return cached.p;
  const d = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(d.length / n));
  const p = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * step, e = Math.min(d.length, j + step); j < e; j += 8) m = Math.max(m, Math.abs(d[j]));
    p[i] = m;
  }
  peaksCache.set(buf, { key, p });
  return p;
}

// තෝරපු කොටස (start → start + D) පාටින් පෙන්නනවා
export function drawWave(canvas, buf, start, D, colors) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
  if (!W || !H) return;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!buf) return;
  const bw = Math.max(2, Math.round(3 * dpr)), n = Math.floor(W / bw);
  const p = peaks(buf, n);
  const max = Math.max(...p) || 1;
  const s0 = (start / buf.duration) * W, s1 = ((start + D) / buf.duration) * W;
  ctx.fillStyle = colors.window;
  ctx.fillRect(s0, 0, Math.max(2, s1 - s0), H);
  for (let i = 0; i < n; i++) {
    const x = i * bw, h = Math.max(2, (p[i] / max) * H * 0.9);
    ctx.fillStyle = x >= s0 && x <= s1 ? colors.on : colors.off;
    ctx.fillRect(x, (H - h) / 2, bw - Math.max(1, dpr), h);
  }
}
