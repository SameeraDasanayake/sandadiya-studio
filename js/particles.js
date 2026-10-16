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
];

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

const DRAW = { petals, hearts, rain, snow, bokeh, fireflies, stars };
const COUNT = { petals: 28, hearts: 16, rain: 120, snow: 80, bokeh: 18, fireflies: 22, stars: 70 };

export function drawParticles(ctx, type, t, W, H, density = 1, color = '#ffffff') {
  const fn = DRAW[type];
  if (!fn) return;
  ctx.save();
  fn(ctx, t, W, H, Math.min(W, H), Math.max(1, Math.round(COUNT[type] * density)), rgb(color));
  ctx.restore();
}
