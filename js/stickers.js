// Emoji, vector stickers සහ text stickers. හැම එකක්ම ෆොටෝ එක උඩ ඇදලා, ලොකු කරලා, කරකවන්න පුළුවන්.
// Sticker එකක්: { id, kind: 'emoji'|'vec'|'text', value, x, y, size, rot, opacity, color, font, anim }
//   x, y = canvas එකේ මැද (0..1), size = කෙටි පැත්තේ භාගයක්

import { heartPath, fontStr } from './render.js';
import { emojiSprite } from './particles.js';

export const EMOJI_SETS = [
  { id: 'love', name: '💕 ආදර', list: '❤️ 🧡 💛 💚 💙 💜 🤍 🖤 💕 💞 💓 💗 💖 💘 💝 💟 ❣️ 💌 💋 😍 🥰 😘 💑 💏 💍 🌹 💐 🫶' },
  { id: 'sad', name: '💔 විරහ', list: '💔 ❤️‍🩹 😢 😭 🥺 😔 😞 😟 🥀 🌧️ ☔ 🌫️ 🍂 🕯️ 💭 🫂 🙏 😶‍🌫️' },
  { id: 'nature', name: '🌸 සොබාදහම', list: '🌸 🌺 🌷 🌹 🌼 🌻 💮 🪷 🍃 🌿 🍀 🌱 🦋 🐝 🕊️ 🌈 ☀️ 🌤️ 🌊 🍁 🌾 🪻' },
  { id: 'night', name: '🌙 රාත්‍රිය', list: '🌙 🌛 🌜 🌝 🌕 ⭐ 🌟 ✨ 💫 🌠 🌌 ☁️ 🪐 🔥 🕯️ 💡' },
  { id: 'faces', name: '😊 මුහුණු', list: '😊 🙂 😇 🥹 😌 😉 🤗 🤭 😅 😂 🤔 😴 😎 🤩 🥳 😏' },
  { id: 'deco', name: '🎀 අලංකාර', list: '🎀 🎁 🎈 🎉 🎊 💎 👑 🎶 🎵 ☕ 🍫 📷 🔐 🗝️ ♾️ 📖' },
].map((s) => ({ ...s, list: s.list.split(' ') }));

// App එක ඇතුලෙම අඳින stickers (පාට වෙනස් කරන්න පුළුවන්)
export const VEC_STICKERS = [
  { id: 'heart', name: 'හදවත', color: '#ff4f7b' },
  { id: 'heartLine', name: 'හදවත් ඉර', color: '#ffd1dc' },
  { id: 'hearts3', name: 'හදවත් 3', color: '#ff6f91' },
  { id: 'broken', name: 'බිඳුණු හදවත', color: '#d33a55' },
  { id: 'arrow', name: 'Cupid ඊතලය', color: '#ff6f91' },
  { id: 'sparkles', name: 'දිලිසීම', color: '#ffe2a6' },
  { id: 'moon', name: 'සඳ සහ තරු', color: '#f6dfae' },
  { id: 'flower', name: 'මලක්', color: '#ff9ec0' },
  { id: 'butterfly', name: 'සමනලයා', color: '#8fd3ff' },
  { id: 'branch', name: 'කොළ අත්ත', color: '#8fbf7a' },
  { id: 'corner', name: 'කොන් අලංකාරය', color: '#f3d49b' },
  { id: 'wreath', name: 'මල් වළල්ල', color: '#9cc98a' },
  { id: 'ribbon', name: 'රිබන්', color: '#ff7aa2' },
  { id: 'bubble', name: 'කතා බුබුළ', color: '#ffffff' },
  { id: 'tape', name: 'Tape', color: '#f7c6d4' },
  { id: 'lock', name: 'ආදර අගුල', color: '#f3c86b' },
];

// ලේසියෙන් දාන්න text stickers
export const TEXT_PRESETS = [
  { value: 'Love', font: 'Great Vibes', color: '#ffffff' },
  { value: 'Forever', font: 'Great Vibes', color: '#f3d49b' },
  { value: 'Miss you', font: 'Dancing Script', color: '#ffd1dc' },
  { value: 'ආදරෙයි ❤️', font: 'Atlas Chirani', color: '#ffffff' },
  { value: 'මතකයි...', font: 'Atlas Chirani', color: '#e8eef8' },
  { value: 'සදාකාලිකයි', font: 'Maname', color: '#f3d49b' },
];

export const STICKER_ANIMS = [
  { id: 'none', name: 'නෑ' },
  { id: 'pulse', name: '💓 ගැහෙනවා' },
  { id: 'float', name: '☁️ පාවෙනවා' },
  { id: 'swing', name: '🎐 පැද්දෙනවා' },
  { id: 'spin', name: '🌀 කැරකෙනවා' },
  { id: 'twinkle', name: '✨ දිලිසෙනවා' },
  { id: 'pop', name: '💥 Pop වෙලා එනවා' },
];


function rgbArr(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function tint(hex, k) {
  const [r, g, b] = rgbArr(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function sparkleAt(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * 0.62, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.62, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function shinyHeart(ctx, x, y, s, c) {
  const gr = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
  gr.addColorStop(0, tint(c, 0.35));
  gr.addColorStop(1, tint(c, -0.3));
  ctx.fillStyle = gr;
  heartPath(ctx, x, y, s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.22, y - s * 0.2, s * 0.1, s * 0.06, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

function leafAt(ctx, x, y, len, ang, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fill();
  ctx.restore();
}

// හැම vector sticker එකක්ම (0,0) මැදට, S ප්‍රමාණයට අඳිනවා
const VEC = {
  heart(ctx, S, c) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = S * 0.08; shinyHeart(ctx, 0, 0, S * 0.95, c); },
  heartLine(ctx, S, c) {
    ctx.strokeStyle = c; ctx.lineWidth = S * 0.045; ctx.shadowColor = c; ctx.shadowBlur = S * 0.15;
    heartPath(ctx, 0, 0, S * 0.9); ctx.stroke();
  },
  hearts3(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = S * 0.06;
    shinyHeart(ctx, -S * 0.2, S * 0.08, S * 0.55, c);
    shinyHeart(ctx, S * 0.24, -S * 0.12, S * 0.42, tint(c, 0.25));
    shinyHeart(ctx, S * 0.18, S * 0.3, S * 0.26, tint(c, -0.15));
  },
  broken(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = S * 0.08;
    const zig = [[0, -0.32], [-0.08, -0.12], [0.06, 0.02], [-0.06, 0.18], [0, 0.46]];
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * S * 0.06, side * S * 0.02);
      ctx.rotate(side * 0.12);
      ctx.beginPath();
      ctx.rect(side < 0 ? -S : 0, -S, S, 2 * S);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(zig[0][0] * S, zig[0][1] * S);
      for (const [x, y] of zig) ctx.lineTo(x * S, y * S);
      ctx.lineTo(side * S, S); ctx.lineTo(side * S, -S); ctx.closePath();
      ctx.clip();
      shinyHeart(ctx, 0, 0, S * 0.95, c);
      ctx.restore();
    }
  },
  arrow(ctx, S, c) {
    ctx.save(); ctx.rotate(-0.5);
    ctx.strokeStyle = '#f3d49b'; ctx.lineWidth = S * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-S * 0.5, 0); ctx.lineTo(S * 0.45, 0); ctx.stroke();
    ctx.fillStyle = '#f3d49b';
    ctx.beginPath(); ctx.moveTo(S * 0.52, 0); ctx.lineTo(S * 0.38, -S * 0.06); ctx.lineTo(S * 0.38, S * 0.06); ctx.fill();
    for (const k of [0, 1]) {
      ctx.beginPath(); ctx.moveTo(-S * (0.48 - k * 0.08), 0);
      ctx.lineTo(-S * (0.56 - k * 0.08), -S * 0.07); ctx.lineTo(-S * (0.44 - k * 0.08), -S * 0.07); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-S * (0.48 - k * 0.08), 0);
      ctx.lineTo(-S * (0.56 - k * 0.08), S * 0.07); ctx.lineTo(-S * (0.44 - k * 0.08), S * 0.07); ctx.fill();
    }
    ctx.restore();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = S * 0.06;
    shinyHeart(ctx, 0, 0, S * 0.55, c);
  },
  sparkles(ctx, S, c) {
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = S * 0.12;
    sparkleAt(ctx, -S * 0.08, -S * 0.05, S * 0.36);
    sparkleAt(ctx, S * 0.3, S * 0.26, S * 0.16);
    sparkleAt(ctx, S * 0.28, -S * 0.32, S * 0.1);
  },
  moon(ctx, S, c) {
    ctx.shadowColor = c; ctx.shadowBlur = S * 0.18;
    ctx.fillStyle = c;
    // අඩ සඳ: ලොකු රවුමෙන් පොඩි රවුම "clip" කරලා අයින් කරනවා (යට ෆොටෝ එකට හානියක් නෑ)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-S, -S, 2 * S, 2 * S);
    ctx.arc(S * 0.1, -S * 0.1, S * 0.3, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.beginPath(); ctx.arc(-S * 0.05, 0, S * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.shadowBlur = S * 0.1;
    sparkleAt(ctx, S * 0.3, S * 0.05, S * 0.12);
    sparkleAt(ctx, S * 0.18, S * 0.32, S * 0.07);
  },
  flower(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = S * 0.06;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const gr = ctx.createRadialGradient(0, 0, S * 0.05, Math.cos(a) * S * 0.24, Math.sin(a) * S * 0.24, S * 0.26);
      gr.addColorStop(0, tint(c, -0.2)); gr.addColorStop(1, tint(c, 0.4));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * S * 0.24, Math.sin(a) * S * 0.24, S * 0.22, S * 0.15, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(0, 0, S * 0.1, 0, Math.PI * 2); ctx.fill();
  },
  butterfly(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = S * 0.06;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side, 1);
      const gr = ctx.createLinearGradient(0, -S * 0.4, S * 0.45, S * 0.4);
      gr.addColorStop(0, tint(c, 0.45)); gr.addColorStop(1, tint(c, -0.25));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(S * 0.22, -S * 0.14, S * 0.24, S * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(S * 0.17, S * 0.16, S * 0.16, S * 0.13, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.arc(S * 0.28, -S * 0.18, S * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2a1d1a';
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.03, S * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1d1a'; ctx.lineWidth = S * 0.012;
    ctx.beginPath(); ctx.moveTo(0, -S * 0.22); ctx.quadraticCurveTo(-S * 0.05, -S * 0.36, -S * 0.12, -S * 0.38);
    ctx.moveTo(0, -S * 0.22); ctx.quadraticCurveTo(S * 0.05, -S * 0.36, S * 0.12, -S * 0.38); ctx.stroke();
  },
  branch(ctx, S, c) {
    ctx.strokeStyle = tint(c, -0.4); ctx.lineWidth = S * 0.02; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-S * 0.45, S * 0.2); ctx.quadraticCurveTo(0, -S * 0.15, S * 0.45, -S * 0.05); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const p = i / 6, x = -S * 0.42 + p * S * 0.85, y = S * 0.18 - Math.sin(p * Math.PI * 0.9) * S * 0.2 - p * S * 0.05;
      leafAt(ctx, x, y, S * (0.2 - p * 0.06), (i % 2 ? -1 : 1) * 0.9 - 0.4, tint(c, (i % 3) * 0.12 - 0.1));
    }
  },
  corner(ctx, S, c) {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = S * 0.025; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = S * 0.04;
    const o = -S * 0.45;
    ctx.beginPath(); ctx.moveTo(o, S * 0.45); ctx.lineTo(o, o); ctx.lineTo(S * 0.45, o); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o + S * 0.1, S * 0.3);
    ctx.bezierCurveTo(o + S * 0.1, o + S * 0.2, o + S * 0.2, o + S * 0.1, S * 0.3, o + S * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(o + S * 0.22, o + S * 0.22, S * 0.08, 0, Math.PI * 1.6); ctx.stroke();
    for (const [x, y] of [[S * 0.45, o], [o, S * 0.45], [S * 0.3, o + S * 0.1], [o + S * 0.1, S * 0.3]]) {
      ctx.beginPath(); ctx.arc(x, y, S * 0.03, 0, Math.PI * 2); ctx.fill();
    }
    heartPath(ctx, o + S * 0.22, o + S * 0.22, S * 0.1); ctx.fill();
  },
  wreath(ctx, S, c) {
    const R = S * 0.38;
    ctx.strokeStyle = tint(c, -0.45); ctx.lineWidth = S * 0.012;
    ctx.beginPath(); ctx.arc(0, 0, R, Math.PI * 0.62, Math.PI * 2.38); ctx.stroke();
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.65 + (i / 21) * Math.PI * 1.7;
      leafAt(ctx, Math.cos(a) * R, Math.sin(a) * R, S * 0.11, a + (i % 2 ? 2.2 : 1.0), tint(c, (i % 3) * 0.15 - 0.1));
    }
    for (const a of [Math.PI * 0.55, Math.PI * 0.45]) shinyHeart(ctx, Math.cos(a) * R, Math.sin(a) * R, S * 0.12, '#ff7aa2');
  },
  ribbon(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = S * 0.06;
    ctx.fillStyle = tint(c, -0.15);
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * S * 0.18, S * 0.42); ctx.lineTo(side * S * 0.06, S * 0.36); ctx.lineTo(side * S * 0.02, S * 0.44); ctx.closePath(); ctx.fill();
    }
    for (const side of [-1, 1]) {
      const gr = ctx.createLinearGradient(0, 0, side * S * 0.45, 0);
      gr.addColorStop(0, tint(c, -0.2)); gr.addColorStop(1, tint(c, 0.3));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * S * 0.2, -S * 0.32, side * S * 0.5, -S * 0.22, side * S * 0.42, 0);
      ctx.bezierCurveTo(side * S * 0.5, S * 0.2, side * S * 0.2, S * 0.24, 0, 0); ctx.fill();
    }
    ctx.fillStyle = tint(c, -0.3); ctx.beginPath(); ctx.ellipse(0, 0, S * 0.07, S * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  },
  bubble(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = S * 0.08;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, -S * 0.05, S * 0.45, S * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-S * 0.15, S * 0.2); ctx.lineTo(-S * 0.3, S * 0.45); ctx.lineTo(0, S * 0.24); ctx.fill();
    ctx.shadowBlur = 0;
    shinyHeart(ctx, 0, -S * 0.05, S * 0.3, '#ff4f7b');
  },
  tape(ctx, S, c) {
    ctx.save(); ctx.rotate(-0.12);
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = c;
    ctx.beginPath();
    const w = S * 0.5, h = S * 0.14;
    ctx.moveTo(-w, -h);
    for (let i = 0; i <= 6; i++) ctx.lineTo(w + (i % 2 ? S * 0.025 : 0), -h + (i / 6) * 2 * h);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-w - (i % 2 ? S * 0.025 : 0), h - (i / 6) * 2 * h);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let x = -w + S * 0.04; x < w; x += S * 0.1) ctx.fillRect(x, -h, S * 0.04, 2 * h);
    ctx.restore();
  },
  lock(ctx, S, c) {
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = S * 0.06;
    ctx.strokeStyle = tint(c, -0.15); ctx.lineWidth = S * 0.07;
    ctx.beginPath(); ctx.arc(0, -S * 0.12, S * 0.2, Math.PI, 0); ctx.stroke();
    const gr = ctx.createLinearGradient(-S * 0.3, -S * 0.1, S * 0.3, S * 0.4);
    gr.addColorStop(0, tint(c, 0.35)); gr.addColorStop(1, tint(c, -0.3));
    ctx.fillStyle = gr;
    heartPath(ctx, 0, S * 0.14, S * 0.62); ctx.fill();
    ctx.fillStyle = tint(c, -0.6);
    ctx.beginPath(); ctx.arc(0, S * 0.1, S * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-S * 0.018, S * 0.1, S * 0.036, S * 0.12);
  },
};

// Sticker එකේ animation එක (video එකේ විතරයි, ෆොටෝ එකේදී t = null)
function animState(s, t, i) {
  const o = { dx: 0, dy: 0, s: 1, r: 0, a: 1 };
  if (t == null || s.anim === 'none' || !s.anim) return o;
  const ph = i * 0.7;
  switch (s.anim) {
    case 'pulse': o.s = 1 + 0.08 * Math.max(0, Math.sin(t * 4 + ph)) ** 2; break;
    case 'float': o.dy = Math.sin(t * 1.4 + ph) * 0.06; break;
    case 'swing': o.r = Math.sin(t * 2.2 + ph) * 0.22; break;
    case 'spin': o.r = t * 0.9; break;
    case 'twinkle': o.a = 0.55 + 0.45 * Math.sin(t * 3 + ph); o.s = 0.95 + 0.05 * Math.sin(t * 3 + ph); break;
    case 'pop': {
      const p = Math.max(0, Math.min(1, (t - 0.6 - i * 0.25) / 0.45));
      const c = 1.9;
      o.s = p <= 0 ? 0 : 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2;
      o.a = Math.min(1, p * 3);
      break;
    }
    default: break;
  }
  return o;
}

export function drawStickerShape(ctx, s, S) {
  if (s.kind === 'emoji') {
    // Sprite එකක් විදිහට (කරකවද්දි / animate වෙද්දි ඉක්මන් වෙන්න)
    const img = emojiSprite(s.value, 256);
    const d = S * 0.82 * 1.25;
    ctx.shadowColor = 'rgba(0,0,0,.3)';
    ctx.shadowBlur = S * 0.06;
    ctx.drawImage(img, -d / 2, -d / 2 + S * 0.04, d, d);
  } else if (s.kind === 'text') {
    ctx.font = fontStr(700, S * 0.42, s.font || 'Great Vibes');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = s.color;
    ctx.shadowBlur = S * 0.12;
    ctx.fillStyle = s.color;
    ctx.fillText(s.value, 0, 0);
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = S * 0.05;
    ctx.fillText(s.value, 0, 0);
  } else {
    VEC[s.value]?.(ctx, S, s.color);
  }
}

// Text sticker එකක පළල (hit test එකටයි selection box එකටයි)
export function stickerBox(ctx, s, U) {
  const S = s.size * U;
  if (s.kind !== 'text') return { w: S, h: S };
  ctx.save();
  ctx.font = fontStr(700, S * 0.42, s.font || 'Great Vibes');
  const w = Math.max(S * 0.6, ctx.measureText(s.value).width + S * 0.2);
  ctx.restore();
  return { w, h: S * 0.62 };
}

// t = video එකේ වෙලාව (ෆොටෝ එකේදී null). selectedId දුන්නොත් ඒක වටේ edit handles අඳිනවා.
export function drawStickers(ctx, list, W, H, t = null, selectedId = null) {
  if (!list?.length) return [];
  const U = Math.min(W, H);
  const boxes = [];
  list.forEach((s, i) => {
    const S = s.size * U;
    const an = animState(s, t, i);
    const cx = s.x * W + an.dx * U, cy = s.y * H + an.dy * U;
    const rot = s.rot + an.r;
    const box = stickerBox(ctx, s, U);
    boxes.push({ id: s.id, cx: s.x * W, cy: s.y * H, rot: s.rot, w: box.w, h: box.h });
    if (an.s <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (s.opacity ?? 1) * an.a));
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(an.s, an.s);
    drawStickerShape(ctx, s, S);
    ctx.restore();
  });
  const sel = boxes.find((b) => b.id === selectedId);
  if (sel) drawHandles(ctx, sel, U);
  return boxes;
}

export const handleSize = (U) => Math.max(14, U * 0.032);

// තෝරපු sticker එක වටේ: dashed කොටුව, ✕ (මකන්න), ↻ (ලොකු කරන්න / කරකවන්න)
export function handlePoints(b, U) {
  const pad = U * 0.02;
  const hw = b.w / 2 + pad, hh = b.h / 2 + pad;
  const c = Math.cos(b.rot), s = Math.sin(b.rot);
  const pt = (x, y) => ({ x: b.cx + x * c - y * s, y: b.cy + x * s + y * c });
  return { hw, hh, del: pt(hw, -hh), rot: pt(hw, hh) };
}

function drawHandles(ctx, b, U) {
  const { hw, hh, del, rot } = handlePoints(b, U);
  const hs = handleSize(U);
  ctx.save();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(b.rot);
  ctx.setLineDash([U * 0.012, U * 0.008]);
  ctx.lineWidth = Math.max(1.5, U * 0.003);
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.lineDashOffset = U * 0.01;
  ctx.strokeStyle = 'rgba(243,212,155,.95)';
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.restore();
  // Icons font එකක් නැතුවම අඳිනවා, එතකොට හැම device එකකම එක වගේ පේනවා
  const knob = (p, fill, icon) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = hs * 0.5;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(p.x, p.y, hs, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = Math.max(2, hs * 0.18);
    ctx.lineCap = 'round';
    const r = hs * 0.42;
    ctx.beginPath();
    if (icon === 'x') {
      ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y + r);
      ctx.moveTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r);
      ctx.stroke();
    } else {
      ctx.arc(p.x, p.y, r * 1.05, -Math.PI * 0.35, Math.PI * 1.25);
      ctx.stroke();
      const a = -Math.PI * 0.35, ax = p.x + Math.cos(a) * r * 1.05, ay = p.y + Math.sin(a) * r * 1.05;
      ctx.beginPath();
      ctx.moveTo(ax + r * 0.55, ay - r * 0.05);
      ctx.lineTo(ax - r * 0.1, ay - r * 0.55);
      ctx.lineTo(ax - r * 0.15, ay + r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  knob(del, '#e5484d', 'x');
  knob(rot, '#d9a24f', 'rot');
}

// Rotated කොටුවක් ඇතුලේද කියලා බලනවා
export function hitSticker(b, x, y, U) {
  const dx = x - b.cx, dy = y - b.cy;
  const c = Math.cos(-b.rot), s = Math.sin(-b.rot);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  const pad = U * 0.02;
  return Math.abs(lx) <= b.w / 2 + pad && Math.abs(ly) <= b.h / 2 + pad;
}
