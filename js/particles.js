// Video එකේ mood effects. හැම particle එකකම තැන ගණන් හදන්නේ වෙලාව (t) අනුව විතරයි,
// ඒ නිසා preview එකේ පේන දේම export එකේ frame එකෙන් frame එක හරියටම එනවා.

import { heartPath } from './render.js';

export const PARTICLES = [
  { id: 'none', name: 'නෑ', icon: '🚫', color: '#ffffff' },
  { id: 'petals', name: 'මල් පෙති', icon: '🌸', color: '#ffb3c6' },
  { id: 'hearts', name: 'හදවත්', icon: '💕', color: '#ff6f91' },
  { id: 'rain', name: 'වැස්ස', icon: '🌧️', color: '#cfe0ff' },
  { id: 'snow', name: 'හිම', icon: '❄️', color: '#ffffff' },
  { id: 'bokeh', name: 'ආලෝක', icon: '✨', color: '#ffe2b0' },
  { id: 'fireflies', name: 'කදෝපැණි', icon: '🌟', color: '#ffe680' },
  { id: 'stars', name: 'තරු', icon: '⭐', color: '#ffffff' },
  { id: 'butterflies', name: 'සමනලයෝ', icon: '🦋', color: '#8fd3ff' },
  { id: 'leaves', name: 'කොළ', icon: '🍂', color: '#e08a3c' },
  { id: 'bubbles', name: 'බුබුළු', icon: '🫧', color: '#cfefff' },
  { id: 'confetti', name: 'Confetti', icon: '🎊', color: '#f3d49b' },
  { id: 'lightleak', name: 'Light leak', icon: '🌅', color: '#ffb36b' },
  { id: 'shooting', name: 'වැටෙන තරු', icon: '🌠', color: '#ffffff' },
  { id: 'glitter', name: 'Glitter', icon: '💎', color: '#ffe6a8' },
  { id: 'emoji', name: 'Emoji වැස්ස', icon: '😍', color: '#ffffff' },
];

// Emoji වැස්සට තෝරන්න පුළුවන් ඒවා
export const PARTICLE_EMOJI = ['💕', '❤️', '💖', '🌸', '🌹', '🦋', '✨', '⭐', '🌙', '🍃', '💔', '😍', '🥰', '🎈'];

const rand = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const wrap = (v, m) => ((v % m) + m) % m;

function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function petals(ctx, t, W, H, U, n, [r, g, b]) {
  const m = U * 0.06;
  for (let i = 0; i < n; i++) {
    const s = U * (0.011 + 0.012 * rand(i, 1));
    const vy = H * (0.045 + 0.05 * rand(i, 2));
    const y = wrap(rand(i, 4) * (H + 2 * m) + t * vy, H + 2 * m) - m;
    const x = wrap(rand(i, 3) * W + Math.sin(t * (0.5 + rand(i, 5) * 0.8) + i) * U * 0.05 + t * U * 0.012, W + 2 * m) - m;
    const rot = t * (0.6 + rand(i, 6)) * (rand(i, 7) > 0.5 ? 1 : -1) + i;
    const flip = Math.cos(t * (1.2 + rand(i, 8)) + i * 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(0.35 + 0.65 * Math.abs(flip), 1);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.75 + 0.2 * rand(i, 9)})`;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.95, -s * 0.35, 0, s);
    ctx.quadraticCurveTo(-s * 0.95, -s * 0.35, 0, -s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.15, -s * 0.2, s * 0.18, s * 0.45, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function hearts(ctx, t, W, H, U, n, [r, g, b]) {
  const m = U * 0.08;
  for (let i = 0; i < n; i++) {
    const s = U * (0.016 + 0.022 * rand(i, 1));
    const vy = H * (0.05 + 0.05 * rand(i, 2));
    const y = H + m - wrap(rand(i, 4) * (H + 2 * m) + t * vy, H + 2 * m);
    const x = rand(i, 3) * W + Math.sin(t * (0.7 + rand(i, 5)) + i) * U * 0.035;
    const a = Math.max(0, Math.min(1, (y / H) * 1.4)) * (0.45 + 0.4 * rand(i, 6));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t + i) * 0.25);
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    heartPath(ctx, 0, 0, s);
    ctx.fill();
    ctx.restore();
  }
}

function rain(ctx, t, W, H, U, n, [r, g, b]) {
  ctx.lineCap = 'round';
  for (let layer = 0; layer < 2; layer++) {
    ctx.strokeStyle = `rgba(${r},${g},${b},${layer ? 0.45 : 0.22})`;
    ctx.lineWidth = Math.max(1, U * (layer ? 0.0022 : 0.0014));
    ctx.beginPath();
    for (let i = layer; i < n; i += 2) {
      const len = U * (0.03 + 0.04 * rand(i, 1)) * (layer ? 1.3 : 1);
      const vy = H * (1.1 + 0.7 * rand(i, 2)) * (layer ? 1.25 : 1);
      const dx = vy * 0.12;
      const y = wrap(rand(i, 4) * (H + len) + t * vy, H + len) - len;
      const x = wrap(rand(i, 3) * W + t * dx, W);
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.12, y + len);
    }
    ctx.stroke();
  }
}

function snow(ctx, t, W, H, U, n, [r, g, b]) {
  for (let i = 0; i < n; i++) {
    const rad = U * (0.002 + 0.005 * rand(i, 1));
    const vy = H * (0.025 + 0.05 * rand(i, 2));
    const y = wrap(rand(i, 4) * H + t * vy, H + 4 * rad) - 2 * rad;
    const x = wrap(rand(i, 3) * W + Math.sin(t * (0.4 + rand(i, 5)) + i) * U * 0.03, W);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.45 + 0.45 * rand(i, 6)})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

function glowDot(ctx, x, y, rad, [r, g, b], a) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  gr.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.55})`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gr;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

function bokeh(ctx, t, W, H, U, n, c) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const rad = U * (0.025 + 0.05 * rand(i, 1));
    const x = wrap(rand(i, 3) * W + t * U * 0.012 * (rand(i, 2) - 0.5) * 2, W);
    const y = rand(i, 4) * H + Math.sin(t * 0.35 + i) * U * 0.02;
    const a = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * (0.8 + rand(i, 5)) + i * 1.7));
    glowDot(ctx, x, y, rad, c, a);
  }
}

function fireflies(ctx, t, W, H, U, n, c) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = rand(i, 3) * W + Math.sin(t * 0.45 * (1 + rand(i, 1)) + i) * U * 0.09;
    const y = (0.25 + 0.75 * rand(i, 4)) * H + Math.cos(t * 0.38 * (1 + rand(i, 2)) + i * 2) * U * 0.06;
    const a = 0.15 + 0.85 * Math.max(0, Math.sin(t * (1.4 + rand(i, 5)) + i * 3));
    glowDot(ctx, x, y, U * 0.035, c, a * 0.55);
    glowDot(ctx, x, y, U * 0.007, [255, 255, 240], a);
  }
}

function stars(ctx, t, W, H, U, n, c) {
  ctx.globalCompositeOperation = 'lighter';
  const [r, g, b] = c;
  for (let i = 0; i < n; i++) {
    const x = rand(i, 3) * W, y = rand(i, 4) * H * 0.75;
    const a = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * (0.8 + 2.2 * rand(i, 5)) + i * 2.3));
    const big = rand(i, 6) > 0.85;
    const rad = U * (big ? 0.004 : 0.0018 + 0.0018 * rand(i, 1));
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    if (big) {
      ctx.strokeStyle = `rgba(${r},${g},${b},${a * 0.6})`;
      ctx.lineWidth = Math.max(1, U * 0.0012);
      const l = U * 0.018 * a;
      ctx.beginPath();
      ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
      ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
      ctx.stroke();
    }
  }
}

function shade([r, g, b], k) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function butterflies(ctx, t, W, H, U, n, c) {
  const m = U * 0.1;
  for (let i = 0; i < n; i++) {
    const s = U * (0.025 + 0.02 * rand(i, 1));
    const dir = rand(i, 2) > 0.5 ? 1 : -1;
    const vx = U * (0.05 + 0.05 * rand(i, 3)) * dir;
    const x = wrap(rand(i, 4) * (W + 2 * m) + t * vx, W + 2 * m) - m;
    const y = rand(i, 5) * H * 0.85 + Math.sin(t * (1.1 + rand(i, 6)) + i) * U * 0.06;
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * (7 + 3 * rand(i, 7)) + i));
    const col = rand(i, 8) > 0.5 ? c : [c[2], c[0], c[1]];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir * 0.25 + Math.sin(t * 2 + i) * 0.15);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * flap, 1);
      const gr = ctx.createLinearGradient(0, -s, s, s);
      gr.addColorStop(0, shade(col, 0.45));
      gr.addColorStop(1, shade(col, -0.2));
      ctx.fillStyle = gr;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(s * 0.5, -s * 0.3, s * 0.55, s * 0.42, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.38, s * 0.32, s * 0.36, s * 0.28, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#2a1d1a';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.07, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function leaves(ctx, t, W, H, U, n, c) {
  const m = U * 0.08;
  const tones = [0, 0.25, -0.25, 0.4];
  for (let i = 0; i < n; i++) {
    const s = U * (0.018 + 0.016 * rand(i, 1));
    const vy = H * (0.05 + 0.05 * rand(i, 2));
    const y = wrap(rand(i, 4) * (H + 2 * m) + t * vy, H + 2 * m) - m;
    const x = wrap(rand(i, 3) * W + Math.sin(t * (0.6 + rand(i, 5)) + i) * U * 0.08 + t * U * 0.02, W + 2 * m) - m;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (0.8 + rand(i, 6)) * (rand(i, 7) > 0.5 ? 1 : -1) + i);
    ctx.scale(0.3 + 0.7 * Math.abs(Math.cos(t * 1.5 + i)), 1);
    ctx.fillStyle = shade(c, tones[i % 4]);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.75, 0, 0, s);
    ctx.quadraticCurveTo(-s * 0.75, 0, 0, -s);
    ctx.fill();
    ctx.strokeStyle = shade(c, -0.45);
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.lineTo(0, s * 1.25);
    ctx.stroke();
    ctx.restore();
  }
}

function bubbles(ctx, t, W, H, U, n, [r, g, b]) {
  const m = U * 0.08;
  for (let i = 0; i < n; i++) {
    const rad = U * (0.012 + 0.03 * rand(i, 1));
    const vy = H * (0.04 + 0.05 * rand(i, 2));
    const y = H + m - wrap(rand(i, 4) * (H + 2 * m) + t * vy, H + 2 * m);
    const x = rand(i, 3) * W + Math.sin(t * (1 + rand(i, 5)) + i) * U * 0.03;
    const gr = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
    gr.addColorStop(0, `rgba(${r},${g},${b},0.05)`);
    gr.addColorStop(0.85, `rgba(${r},${g},${b},0.12)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0.45)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x - rad * 0.38, y - rad * 0.42, rad * 0.22, rad * 0.12, -0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

const CONFETTI = [[243, 212, 155], [255, 111, 145], [124, 196, 216], [157, 140, 255], [255, 255, 255], [140, 220, 160]];
function confetti(ctx, t, W, H, U, n, c) {
  const m = U * 0.05;
  for (let i = 0; i < n; i++) {
    const s = U * (0.008 + 0.008 * rand(i, 1));
    const vy = H * (0.08 + 0.08 * rand(i, 2));
    const y = wrap(rand(i, 4) * (H + 2 * m) + t * vy, H + 2 * m) - m;
    const x = wrap(rand(i, 3) * W + Math.sin(t * (1.5 + rand(i, 5)) + i) * U * 0.03, W);
    const col = i % 5 === 0 ? c : CONFETTI[i % CONFETTI.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (2 + 3 * rand(i, 6)) + i);
    ctx.scale(1, Math.cos(t * (4 + 3 * rand(i, 7)) + i));
    ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    if (i % 3) ctx.fillRect(-s, -s * 0.5, s * 2, s);
    else { ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}

function lightleak(ctx, t, W, H, U, n, c) {
  ctx.globalCompositeOperation = 'screen';
  const blobs = Math.max(2, Math.min(5, Math.round(n)));
  for (let i = 0; i < blobs; i++) {
    const x = (0.5 + 0.55 * Math.sin(t * 0.13 * (1 + rand(i, 1)) + i * 2.1)) * W;
    const y = (0.5 + 0.55 * Math.cos(t * 0.11 * (1 + rand(i, 2)) + i * 1.3)) * H;
    const rad = U * (0.45 + 0.35 * rand(i, 3));
    const a = 0.22 + 0.12 * Math.sin(t * 0.5 + i);
    const col = i % 2 ? c : [Math.min(255, c[0] + 40), Math.max(0, c[1] - 60), Math.max(0, c[2] - 20)];
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
    gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }
}

function shooting(ctx, t, W, H, U, n, c) {
  stars(ctx, t, W, H, U, Math.round(n * 4), c);
  ctx.globalCompositeOperation = 'lighter';
  const [r, g, b] = c;
  for (let i = 0; i < n; i++) {
    const period = 3 + 4 * rand(i, 1);
    const ph = wrap(t + rand(i, 2) * period, period);
    const life = 0.9;
    if (ph > life) continue;
    const k = Math.floor((t + rand(i, 2) * period) / period); // හැම පාරම වෙනස් තැනකින්
    const x0 = rand(i * 31 + k, 3) * W * 1.1, y0 = rand(i * 17 + k, 4) * H * 0.45;
    const len = U * (0.25 + 0.15 * rand(i, 5));
    const p = ph / life;
    const hx = x0 - p * U * 0.5, hy = y0 + p * U * 0.3;
    const a = Math.sin(Math.PI * p);
    const gr = ctx.createLinearGradient(hx, hy, hx + len * 0.86, hy - len * 0.5);
    gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.strokeStyle = gr;
    ctx.lineWidth = Math.max(1.5, U * 0.004);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + len * 0.86, hy - len * 0.5);
    ctx.stroke();
    glowDot(ctx, hx, hy, U * 0.015, c, a);
  }
}

function glitter(ctx, t, W, H, U, n, c) {
  ctx.globalCompositeOperation = 'lighter';
  const [r, g, b] = c;
  for (let i = 0; i < n; i++) {
    const x = rand(i, 3) * W, y = rand(i, 4) * H;
    const a = Math.pow(Math.max(0, Math.sin(t * (2 + 3 * rand(i, 5)) + i * 2.7)), 3);
    if (a < 0.05) continue;
    const l = U * (0.006 + 0.014 * rand(i, 1)) * a;
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y - l);
    ctx.quadraticCurveTo(x, y, x + l * 0.6, y);
    ctx.quadraticCurveTo(x, y, x, y + l);
    ctx.quadraticCurveTo(x, y, x - l * 0.6, y);
    ctx.quadraticCurveTo(x, y, x, y - l);
    ctx.fill();
  }
}

// Color emoji කරකවලා හැම frame එකකම fillText කරන එක ගොඩක් හෙමින් (GPU එකට බරයි).
// ඒ නිසා හැම emoji එකක්ම එක පාරක් canvas එකකට අඳිලා ඒ රූපය නැවත නැවත පාවිච්චි කරනවා.
const sprites = new Map();
export function emojiSprite(emoji, px = 160) {
  const key = `${emoji}|${px}`;
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(px * 1.25);
    const x = c.getContext('2d');
    x.font = `${px}px "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(emoji, c.width / 2, c.height / 2 + px * 0.05);
    sprites.set(key, c);
  }
  return c;
}

function emojiRain(ctx, t, W, H, U, n, c, emoji) {
  const m = U * 0.08;
  const img = emojiSprite(emoji);
  for (let i = 0; i < n; i++) {
    const s = U * (0.035 + 0.03 * rand(i, 1));
    const vy = H * (0.05 + 0.05 * rand(i, 2));
    const up = rand(i, 8) > 0.5; // සමහර ඒවා උඩට පාවෙනවා, සමහර ඒවා වැටෙනවා
    const yy = wrap(rand(i, 4) * (H + 2 * m) + t * vy, H + 2 * m) - m;
    const y = up ? H - yy : yy;
    const x = rand(i, 3) * W + Math.sin(t * (0.8 + rand(i, 5)) + i) * U * 0.04;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.3 + i) * 0.35);
    ctx.globalAlpha = 0.9;
    const d = s * 1.25;
    ctx.drawImage(img, -d / 2, -d / 2, d, d);
    ctx.restore();
  }
}

const DRAW = { petals, hearts, rain, snow, bokeh, fireflies, stars, butterflies, leaves, bubbles, confetti, lightleak, shooting, glitter, emoji: emojiRain };
const COUNT = {
  petals: 28, hearts: 16, rain: 120, snow: 80, bokeh: 18, fireflies: 22, stars: 70,
  butterflies: 7, leaves: 18, bubbles: 22, confetti: 60, lightleak: 3, shooting: 3, glitter: 90, emoji: 14,
};

export function drawParticles(ctx, type, t, W, H, density = 1, color = '#ffffff', emoji = '💕') {
  const fn = DRAW[type];
  if (!fn) return;
  ctx.save();
  fn(ctx, t, W, H, Math.min(W, H), Math.max(1, Math.round(COUNT[type] * density)), rgb(color), emoji);
  ctx.restore();
}
