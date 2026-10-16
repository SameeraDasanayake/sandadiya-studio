// Scene renderer: ෆොටෝ එක + වදන් + ලාංඡනය canvas එකකට අඳිනවා.
// හැම ප්‍රමාණයක්ම canvas size එකට සාපේක්ෂයි, ඒ නිසා preview එකයි HD export එකයි එක වගේමයි.
// (Video mode එකටත් මේකම තමයි පාවිච්චි කරන්නේ.)

import { parse, DIVIDER_RE } from './markup.js';

export const FONTS = [
  { family: 'Abhaya Libre', label: 'අභය (Abhaya Libre)' },
  { family: 'Noto Sans Sinhala', label: 'නොටෝ සැන්ස් (Noto Sans)' },
  { family: 'Noto Serif Sinhala', label: 'නොටෝ සෙරිෆ් (Noto Serif)' },
  { family: 'Gemunu Libre', label: 'ගැමුණු (Gemunu Libre)' },
  { family: 'Yaldevi', label: 'යාල්දේවි (Yaldevi)' },
];

export const ASPECTS = {
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
};

export function sceneSize(st, photo) {
  if (st.aspect === 'photo' && photo) {
    const r = photo.height / photo.width;
    return r >= 1 ? [1080, Math.round(1080 * r)] : [Math.round(1080 / r), 1080];
  }
  return ASPECTS[st.aspect] || ASPECTS['1:1'];
}

const FALLBACK = '"Noto Sans Sinhala", "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif';
export const fontStr = (weight, px, family) => `${weight} ${px.toFixed(2)}px "${family}", ${FALLBACK}`;

function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- Background ----------

export function photoGeom(st, img, W, H) {
  const s = Math.max(W / img.width, H / img.height) * st.photo.zoom;
  const dw = img.width * s, dh = img.height * s;
  const ox = dw - W, oy = dh - H;
  return { x: -ox / 2 + st.photo.panX * ox / 2, y: -oy / 2 + st.photo.panY * oy / 2, dw, dh, ox, oy };
}

function paintBackground(ctx, st, assets, W, H) {
  const a = st.adjust;
  const img = assets.photo;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (img) {
    const g = photoGeom(st, img, W, H);
    const filt = [];
    if (a.brightness !== 100) filt.push(`brightness(${a.brightness}%)`);
    if (a.saturate !== 100) filt.push(`saturate(${a.saturate}%)`);
    ctx.filter = filt.join(' ') || 'none';
    ctx.drawImage(img, g.x, g.y, g.dw, g.dh);
    if (a.blur > 0) {
      ctx.filter = `${filt.join(' ')} blur(${(a.blur * Math.min(W, H)) / 400}px)`.trim();
      ctx.drawImage(img, g.x, g.y, g.dw, g.dh);
    }
    ctx.filter = 'none';
  } else {
    const gr = ctx.createLinearGradient(0, 0, W * 0.35, H);
    gr.addColorStop(0, st.bg[0]);
    gr.addColorStop(1, st.bg[1]);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }
  if (a.overlayOpacity > 0) {
    ctx.fillStyle = rgba(a.overlayColor, a.overlayOpacity);
    ctx.fillRect(0, 0, W, H);
  }
  if (a.vignette > 0) {
    const r = Math.hypot(W, H) / 2;
    const vg = ctx.createRadialGradient(W / 2, H / 2, r * 0.3, W / 2, H / 2, r);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${a.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

// Text එක drag කරද්දි හැම frame එකකම blur එක ආයේ හදන්නේ නැතුව cache කරනවා
const bgCache = { key: '', canvas: null };
function drawBackground(ctx, st, assets, W, H, useCache) {
  if (!useCache) return paintBackground(ctx, st, assets, W, H);
  const key = JSON.stringify([assets.photoId, W, H, st.photo, st.adjust, st.bg]);
  if (bgCache.key !== key) {
    const c = bgCache.canvas || document.createElement('canvas');
    c.width = W; c.height = H;
    paintBackground(c.getContext('2d'), st, assets, W, H);
    bgCache.canvas = c;
    bgCache.key = key;
  }
  ctx.drawImage(bgCache.canvas, 0, 0);
}

// ---------- Ornaments ----------

export function heartPath(ctx, cx, cy, s) {
  const w = s, h = s * 0.92, top = cy - h * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, top + h * 0.28);
  ctx.bezierCurveTo(cx, top + h * 0.02, cx - w * 0.5, top - h * 0.02, cx - w * 0.5, top + h * 0.32);
  ctx.bezierCurveTo(cx - w * 0.5, top + h * 0.6, cx - w * 0.12, top + h * 0.78, cx, top + h);
  ctx.bezierCurveTo(cx + w * 0.12, top + h * 0.78, cx + w * 0.5, top + h * 0.6, cx + w * 0.5, top + h * 0.32);
  ctx.bezierCurveTo(cx + w * 0.5, top - h * 0.02, cx, top + h * 0.02, cx, top + h * 0.28);
  ctx.closePath();
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function sparkle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r * 0.7, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r * 0.7, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

function drawDivider(ctx, style, cx, cy, w, u, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.lineCap = 'round';
  const L = cx - w / 2, R = cx + w / 2;
  const line = (x1, x2) => { ctx.beginPath(); ctx.moveTo(x1, cy); ctx.lineTo(x2, cy); ctx.stroke(); };
  if (style === 'heart') {
    const gap = u * 0.75;
    line(L + u * 0.5, cx - gap); line(cx + gap, R - u * 0.5);
    for (const x of [L + u * 0.12, L + u * 0.38, R - u * 0.12, R - u * 0.38]) dot(ctx, x, cy, u * 0.08);
    heartPath(ctx, cx, cy, u * 0.95);
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.stroke();
  } else if (style === 'dots') {
    const gap = u * 0.55;
    ctx.setLineDash([u * 0.1, u * 0.14]);
    line(L + u * 0.3, cx - gap); line(cx + gap, R - u * 0.3);
    ctx.setLineDash([]);
    dot(ctx, L + u * 0.12, cy, u * 0.09); dot(ctx, R - u * 0.12, cy, u * 0.09);
    heartPath(ctx, cx, cy, u * 0.62);
    ctx.fill();
  } else if (style === 'leaf') {
    const lw = w * 0.42;
    line(cx - lw, cx + lw);
    const n = 7;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i <= n; i++) {
        const x = cx + side * (i / (n + 1)) * lw;
        const up = i % 2 ? -1 : 1;
        ctx.beginPath();
        ctx.ellipse(x, cy + up * u * 0.13, u * 0.16, u * 0.06, side * up * -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    dot(ctx, cx, cy, u * 0.11);
  } else if (style === 'star') {
    const gap = u * 0.6;
    line(L + u * 0.3, cx - gap); line(cx + gap, R - u * 0.3);
    sparkle(ctx, cx, cy, u * 0.38);
    sparkle(ctx, L + u * 0.12, cy, u * 0.14); sparkle(ctx, R - u * 0.12, cy, u * 0.14);
  } else {
    line(L + u * 0.3, R - u * 0.3);
    dot(ctx, L + u * 0.12, cy, u * 0.07); dot(ctx, R - u * 0.12, cy, u * 0.07);
  }
  ctx.restore();
}

// ---------- Text layout ----------

// ආපහු එන්නේ { lines, bounds, words } — words තමයි tap කරලා highlight කරන්න පාවිච්චි කරන්නේ.
export function layoutText(ctx, st, W, H) {
  const { plain, mask } = parse(st.text);
  const f = st.font, c = st.colors, tb = st.textBox;
  const U = Math.min(W, H);
  const base = tb.size * U;
  const maxW = tb.maxWidth * W;
  const out = [];
  let titlePending = f.titleOn;
  let offset = 0;

  for (const raw of plain.split('\n')) {
    const start = offset;
    offset += raw.length + 1;
    const t = raw.trim();
    if (!t) { out.push({ type: 'gap', h: base * tb.lineHeight * 0.5, w: 0 }); continue; }
    if (DIVIDER_RE.test(t)) { out.push({ type: 'divider', h: base * 1.4, w: Math.min(maxW, base * 9) }); continue; }

    const isTitle = titlePending;
    titlePending = false;
    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(raw))) {
      const ws = start + m.index, we = ws + m[0].length;
      const runs = [];
      let j = ws;
      while (j < we) {
        const h = mask[j];
        let k = j;
        while (k < we && mask[k] === h) k++;
        const hl = !!h;
        let size, weight, family, color;
        if (isTitle) {
          size = base * f.titleScale * (hl ? 1.38 : 1);
          weight = f.titleWeight; family = f.title; color = c.title;
        } else {
          size = base * (hl ? c.hlScale : 1);
          weight = hl ? Math.max(f.bodyWeight, 700) : f.bodyWeight; family = f.body; color = hl ? c.highlight : c.text;
        }
        const font = fontStr(weight, size, family);
        ctx.font = font;
        const mt = ctx.measureText(plain.slice(j, k));
        runs.push({
          text: plain.slice(j, k), font, size, color, w: mt.width,
          asc: mt.fontBoundingBoxAscent ?? size * 0.9, desc: mt.fontBoundingBoxDescent ?? size * 0.3,
        });
        j = k;
      }
      words.push({ start: ws, end: we, runs, w: runs.reduce((s, r) => s + r.w, 0) });
    }
    ctx.font = fontStr(f.bodyWeight, isTitle ? base * f.titleScale : base, isTitle ? f.title : f.body);
    const space = ctx.measureText(' ').width;

    // Greedy wrap
    let cur = [], curW = 0;
    const flush = () => {
      if (!cur.length) return;
      const maxRun = cur.flatMap((w) => w.runs).reduce((a, r) => (r.size > a.size ? r : a));
      out.push({ type: 'text', words: cur, w: curW, h: maxRun.size * tb.lineHeight * (isTitle ? 0.92 : 1), space, asc: maxRun.asc, desc: maxRun.desc });
      cur = []; curW = 0;
    };
    for (const w of words) {
      const add = cur.length ? space + w.w : w.w;
      if (cur.length && curW + add > maxW) flush();
      curW += cur.length ? space + w.w : w.w;
      cur.push(w);
    }
    flush();
  }

  // අන්තිමට තියෙන හිස් පේළි ගණන් ගන්නේ නෑ
  while (out.length && out[out.length - 1].type === 'gap') out.pop();
  while (out.length && out[0].type === 'gap') out.shift();

  const totalH = out.reduce((s, l) => s + l.h, 0);
  const blockW = out.reduce((s, l) => Math.max(s, l.w), 0);
  const cx = tb.x * W, cy = tb.y * H;
  let y = cy - totalH / 2;
  const wordBoxes = [];
  for (const l of out) {
    l.top = y;
    l.cy = y + l.h / 2;
    if (tb.align === 'left') l.x = cx - blockW / 2;
    else if (tb.align === 'right') l.x = cx + blockW / 2 - l.w;
    else l.x = cx - l.w / 2;
    if (l.type === 'divider') l.x = cx - l.w / 2;
    if (l.type === 'text') {
      let x = l.x;
      for (const w of l.words) {
        w.x = x;
        wordBoxes.push({ x, y: l.top, w: w.w, h: l.h, start: w.start, end: w.end });
        x += w.w + l.space;
      }
    }
    y += l.h;
  }
  return { lines: out, base, bounds: { x: cx - blockW / 2, y: cy - totalH / 2, w: blockW, h: totalH }, words: wordBoxes };
}

function drawRun(ctx, st, r, x, y, U) {
  const e = st.effects;
  ctx.font = r.font;
  if (e.glow > 0) {
    ctx.shadowColor = rgba(e.glowColor, Math.min(1, e.glow));
    ctx.shadowBlur = r.size * 0.6 * (0.6 + e.glow);
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.fillStyle = r.color;
    ctx.fillText(r.text, x, y);
    ctx.fillText(r.text, x, y);
  }
  const hasShadow = e.shadowOpacity > 0;
  ctx.shadowColor = hasShadow ? rgba(e.shadowColor, e.shadowOpacity) : 'transparent';
  ctx.shadowBlur = hasShadow ? r.size * 0.35 * e.shadowBlur * 2 : 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = hasShadow ? U * 0.0015 : 0;
  if (e.strokeWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = r.size * e.strokeWidth * 0.12;
    ctx.strokeStyle = e.strokeColor;
    ctx.strokeText(r.text, x, y);
    ctx.shadowColor = 'transparent';
  }
  ctx.fillStyle = r.color;
  ctx.fillText(r.text, x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

export function drawText(ctx, st, lay, W, H) {
  const U = Math.min(W, H);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const l of lay.lines) {
    if (l.type === 'divider') {
      drawDivider(ctx, st.divider.style, l.x + l.w / 2, l.cy, l.w, lay.base, st.divider.color);
    } else if (l.type === 'text') {
      const baseline = l.cy + (l.asc - l.desc) / 2;
      for (const w of l.words) {
        let x = w.x;
        for (const r of w.runs) { drawRun(ctx, st, r, x, baseline, U); x += r.w; }
      }
    }
  }
  ctx.restore();
}

// ---------- Border & watermark ----------

function drawBorder(ctx, st, W, H) {
  const b = st.border;
  if (!b.on) return;
  const U = Math.min(W, H);
  const i = b.inset * U, lw = Math.max(1, b.width * U);
  ctx.save();
  ctx.strokeStyle = rgba(b.color, b.opacity);
  ctx.lineWidth = lw;
  ctx.strokeRect(i, i, W - 2 * i, H - 2 * i);
  ctx.restore();
}

function drawWatermark(ctx, st, assets, W, H) {
  const wm = st.watermark;
  if (wm.mode === 'none') return;
  const U = Math.min(W, H);
  const u = wm.size * U;
  const margin = U * 0.045 + (st.border.on ? st.border.inset * U : 0);
  const showText = wm.mode !== 'logo' && wm.text.trim();
  const showLogo = wm.mode !== 'text' && assets.logo;
  ctx.save();
  ctx.font = fontStr(600, u, st.font.body);
  const tw = showText ? ctx.measureText(wm.text).width : 0;
  const ls = u * 2.3;
  const gap = showText && showLogo ? u * 0.45 : 0;
  const totalW = tw + (showLogo ? ls : 0) + gap;
  const hgt = showLogo ? ls : u * 1.4;
  let x;
  if (wm.pos.endsWith('l')) x = margin;
  else if (wm.pos.endsWith('r')) x = W - margin - totalW;
  else x = (W - totalW) / 2;
  const cy = wm.pos.startsWith('t') ? margin + hgt / 2 : H - margin - hgt / 2;
  ctx.globalAlpha = wm.opacity;
  ctx.shadowColor = `rgba(0,0,0,${wm.shadow})`;
  ctx.shadowBlur = u * 0.5;
  if (showLogo) {
    ctx.drawImage(assets.logo, x, cy - ls / 2, ls, ls);
    x += ls + gap;
  }
  if (showText) {
    ctx.fillStyle = wm.color;
    ctx.textBaseline = 'middle';
    ctx.fillText(wm.text, x, cy);
  }
  ctx.restore();
}

// ---------- Scene ----------

// opts: { W, H, editor, cache }
export function renderScene(ctx, st, assets, opts) {
  const { W, H } = opts;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, st, assets, W, H, opts.cache);
  drawBorder(ctx, st, W, H);
  const lay = layoutText(ctx, st, W, H);
  drawText(ctx, st, lay, W, H);
  drawWatermark(ctx, st, assets, W, H);
  if (opts.editor && lay.lines.length) {
    const p = lay.base * 0.5, b = lay.bounds;
    ctx.setLineDash([Math.max(4, W * 0.008), Math.max(4, W * 0.006)]);
    ctx.lineWidth = Math.max(1, W * 0.0025);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.strokeRect(b.x - p, b.y - p, b.w + 2 * p, b.h + 2 * p);
    ctx.lineDashOffset = Math.max(4, W * 0.007);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeRect(b.x - p, b.y - p, b.w + 2 * p, b.h + 2 * p);
  }
  ctx.restore();
  return lay;
}
