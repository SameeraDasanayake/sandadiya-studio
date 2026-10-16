// App state, presets සහ save/load

export const DEFAULT_TEXT = `---
*ආදරය* කියන්නේ...
හැම මොහොතකම
*"මම ඔයා එක්ක ඉන්නවා"*
කියලා වචනෙන් කියන
එක නෙවෙයි...
--
නිහඬව හරි...
අවශ්‍යම වෙලාවේ
*ළඟින් ඉන්න එකයි...* ❤️`;

// ස්ටයිල් එකක් කියන්නේ මේ keys ටික. Preset එකක් apply කරද්දි වදන, ෆොටෝ එක, text එකේ තැන වෙනස් වෙන්නේ නෑ.
export const STYLE_KEYS = ['font', 'colors', 'effects', 'adjust', 'divider', 'border', 'bg', 'watermark'];

export const PRESETS = [
  {
    id: 'sandadiya', name: 'සඳදිය ආදර',
    style: {
      font: { body: 'Abhaya Libre', bodyWeight: 700, title: 'Abhaya Libre', titleWeight: 800, titleOn: true, titleScale: 1.3 },
      colors: { text: '#24202b', title: '#15131f', highlight: '#8e2639', hlScale: 1.12 },
      effects: { shadowColor: '#ffffff', shadowOpacity: 0.55, shadowBlur: 0.6, strokeWidth: 0, strokeColor: '#ffffff', glowColor: '#ffffff', glow: 0 },
      adjust: { brightness: 104, saturate: 100, blur: 0, overlayColor: '#fff3ea', overlayOpacity: 0.14, vignette: 0 },
      divider: { style: 'heart', color: '#6b3a43' },
      border: { on: true, color: '#ffffff', opacity: 0.55 },
      bg: ['#f7dccb', '#c7897a'],
      watermark: { color: '#ffffff', shadow: 0.55 },
    },
  },
  {
    id: 'virahe', name: 'විරහ රාත්‍රිය',
    style: {
      font: { body: 'Noto Sans Sinhala', bodyWeight: 600, title: 'Noto Sans Sinhala', titleWeight: 700, titleOn: false, titleScale: 1.25 },
      colors: { text: '#ffffff', title: '#e9eef8', highlight: '#b9d3ff', hlScale: 1 },
      effects: { shadowColor: '#000000', shadowOpacity: 0.85, shadowBlur: 0.5, strokeWidth: 0, strokeColor: '#000000', glowColor: '#9cc0ff', glow: 0 },
      adjust: { brightness: 82, saturate: 80, blur: 0, overlayColor: '#050a18', overlayOpacity: 0.42, vignette: 0.55 },
      divider: { style: 'line', color: '#cfd9ea' },
      border: { on: false, color: '#ffffff', opacity: 0.4 },
      bg: ['#0b1220', '#1f2d47'],
      watermark: { color: '#ffffff', shadow: 0.6 },
    },
  },
  {
    id: 'rosa', name: 'රෝස සිහින',
    style: {
      font: { body: 'Gemunu Libre', bodyWeight: 600, title: 'Gemunu Libre', titleWeight: 800, titleOn: true, titleScale: 1.35 },
      colors: { text: '#ffffff', title: '#ffffff', highlight: '#ffd0de', hlScale: 1.12 },
      effects: { shadowColor: '#5c0f2e', shadowOpacity: 0.6, shadowBlur: 0.5, strokeWidth: 0, strokeColor: '#ffffff', glowColor: '#ff5f93', glow: 0.7 },
      adjust: { brightness: 96, saturate: 110, blur: 0, overlayColor: '#4a0c28', overlayOpacity: 0.25, vignette: 0.25 },
      divider: { style: 'dots', color: '#ffd0de' },
      border: { on: true, color: '#ffd0de', opacity: 0.5 },
      bg: ['#f39bb6', '#6d1d42'],
      watermark: { color: '#ffffff', shadow: 0.5 },
    },
  },
  {
    id: 'golden', name: 'රන් සැන්දෑව',
    style: {
      font: { body: 'Yaldevi', bodyWeight: 600, title: 'Yaldevi', titleWeight: 700, titleOn: true, titleScale: 1.3 },
      colors: { text: '#fff6e5', title: '#ffe7b8', highlight: '#ffc56b', hlScale: 1.1 },
      effects: { shadowColor: '#2a1404', shadowOpacity: 0.85, shadowBlur: 0.6, strokeWidth: 0, strokeColor: '#2a1404', glowColor: '#ffb347', glow: 0 },
      adjust: { brightness: 92, saturate: 105, blur: 0, overlayColor: '#2a1505', overlayOpacity: 0.3, vignette: 0.35 },
      divider: { style: 'leaf', color: '#ffd89a' },
      border: { on: true, color: '#ffd89a', opacity: 0.45 },
      bg: ['#f2a65a', '#4a2410'],
      watermark: { color: '#fff1d6', shadow: 0.6 },
    },
  },
  {
    id: 'ink', name: 'කළු තීන්ත',
    style: {
      font: { body: 'Noto Serif Sinhala', bodyWeight: 600, title: 'Noto Serif Sinhala', titleWeight: 800, titleOn: true, titleScale: 1.3 },
      colors: { text: '#15151c', title: '#0d0d14', highlight: '#7a1f2b', hlScale: 1.1 },
      effects: { shadowColor: '#ffffff', shadowOpacity: 0.9, shadowBlur: 0.9, strokeWidth: 0, strokeColor: '#ffffff', glowColor: '#ffffff', glow: 0.6 },
      adjust: { brightness: 108, saturate: 90, blur: 0, overlayColor: '#ffffff', overlayOpacity: 0.22, vignette: 0 },
      divider: { style: 'star', color: '#3b2a2e' },
      border: { on: true, color: '#ffffff', opacity: 0.6 },
      bg: ['#fbf3ea', '#e2cdbb'],
      watermark: { color: '#ffffff', shadow: 0.6 },
    },
  },
  {
    id: 'moon', name: 'සඳ එළිය',
    style: {
      font: { body: 'Abhaya Libre', bodyWeight: 700, title: 'Abhaya Libre', titleWeight: 800, titleOn: true, titleScale: 1.3 },
      colors: { text: '#f3f6fb', title: '#f6dfae', highlight: '#9ed0e0', hlScale: 1.1 },
      effects: { shadowColor: '#000814', shadowOpacity: 0.8, shadowBlur: 0.6, strokeWidth: 0, strokeColor: '#000000', glowColor: '#f6dfae', glow: 0.25 },
      adjust: { brightness: 85, saturate: 85, blur: 1.5, overlayColor: '#0c1a2b', overlayOpacity: 0.4, vignette: 0.45 },
      divider: { style: 'star', color: '#f6dfae' },
      border: { on: true, color: '#f6dfae', opacity: 0.4 },
      bg: ['#2a3f5c', '#0b1422'],
      watermark: { color: '#f6dfae', shadow: 0.5 },
    },
  },
];

export const DEFAULT_STATE = {
  version: 1,
  aspect: '1:1',
  export: { quality: '2k', format: 'jpg' },
  text: DEFAULT_TEXT,
  photo: { zoom: 1, panX: 0, panY: 0 },
  // x, y = text එකේ මැද (0..1). size = අකුරු ප්‍රමාණය (කෙටි පැත්තේ භාගයක් විදිහට)
  textBox: { x: 0.36, y: 0.47, maxWidth: 0.7, align: 'center', size: 0.046, lineHeight: 1.55 },
  ...structuredClone(PRESETS[0].style),
};
// Preset එකේ තියෙන්නේ පාට ටික විතරයි, ඉතුරු ටික මෙතනින්
DEFAULT_STATE.watermark = { mode: 'text', text: 'සඳදිය 🌙', pos: 'bc', size: 0.034, opacity: 0.95, ...PRESETS[0].style.watermark };
DEFAULT_STATE.border = { inset: 0.022, width: 0.0022, ...PRESETS[0].style.border };

export const clone = (o) => structuredClone(o);

export function deepMerge(target, src) {
  for (const k of Object.keys(src || {})) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], v);
    } else {
      target[k] = Array.isArray(v) ? [...v] : v;
    }
  }
  return target;
}

export function pickStyle(st) {
  const out = {};
  for (const k of STYLE_KEYS) out[k] = clone(st[k]);
  // watermark එකේ නම, තැන වගේ දේවල් ස්ටයිල් එකට අයිති නෑ
  out.watermark = { color: st.watermark.color, shadow: st.watermark.shadow };
  out.border = { on: st.border.on, color: st.border.color, opacity: st.border.opacity };
  return out;
}

export const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
export function setPath(o, p, v) {
  const ks = p.split('.');
  const last = ks.pop();
  const t = ks.reduce((a, k) => (a[k] ??= {}), o);
  t[last] = v;
}

const LS_STATE = 'sandadiya.state';
const LS_QUOTES = 'sandadiya.quotes';
const LS_MYPRESETS = 'sandadiya.mypresets';

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage නැත්නම් කමක් නෑ */ }
}

export function loadState() {
  const saved = lsGet(LS_STATE, null);
  return deepMerge(clone(DEFAULT_STATE), saved || {});
}
export const saveState = (st) => lsSet(LS_STATE, st);

export const loadQuotes = () => lsGet(LS_QUOTES, []);
export const saveQuotes = (q) => lsSet(LS_QUOTES, q);
export const loadMyPresets = () => lsGet(LS_MYPRESETS, []);
export const saveMyPresets = (p) => lsSet(LS_MYPRESETS, p);
