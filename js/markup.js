// වදන් markup:
//   *වචනය*      → highlight (පාට + ප්‍රමාණය)
//   ---  / --   → අලංකාර ඉරක් (divider)
//   පළමු පේළිය  → මාතෘකාව (title)

export const DIVIDER_RE = /^(-{2,}|—+|~{2,}|_{2,})$/;
const isSpace = (c) => c === ' ' || c === '\t' || c === ' ';

// markup → { plain, mask, toPlain }
// mask[i] = 1 නම් plain[i] highlight වෙලා. toPlain = markup index → plain index.
export function parse(src) {
  let plain = '';
  const mask = [];
  const toPlain = new Array(src.length + 1);
  let hl = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    toPlain[i] = plain.length;
    if (c === '*') { hl = !hl; continue; }
    if (c === '\n') hl = false;
    plain += c;
    mask.push(hl && c !== '\n' ? 1 : 0);
  }
  toPlain[src.length] = plain.length;
  return { plain, mask, toPlain };
}

// plain + mask → markup. වචන දෙකක් අතර space එකත් highlight run එකට අයිති වෙන්නේ
// දෙපැත්තම highlight නම් විතරයි, එතකොට "*මම ඔයා*" වගේ ලස්සනට එනවා.
export function serialize(plain, mask) {
  let out = '';
  let idx = 0;
  const lines = plain.split('\n');
  lines.forEach((line, li) => {
    const eff = [];
    for (let j = 0; j < line.length; j++) eff.push(!!mask[idx + j] && !isSpace(line[j]));
    for (let j = 0; j < line.length; j++) {
      if (!isSpace(line[j])) continue;
      let a = j - 1; while (a >= 0 && isSpace(line[a])) a--;
      let b = j + 1; while (b < line.length && isSpace(line[b])) b++;
      eff[j] = a >= 0 && b < line.length && eff[a] && eff[b];
    }
    let open = false;
    for (let j = 0; j < line.length; j++) {
      if (eff[j] !== open) { out += '*'; open = eff[j]; }
      out += line[j];
    }
    if (open) out += '*';
    if (li < lines.length - 1) out += '\n';
    idx += line.length + 1;
  });
  return out;
}

function applyPlainRange(plain, mask, ps, pe, value) {
  if (value === 'toggle') {
    let all = true, any = false;
    for (let i = ps; i < pe; i++) {
      if (plain[i] === '\n' || isSpace(plain[i])) continue;
      any = true;
      if (!mask[i]) all = false;
    }
    value = !(any && all);
  }
  for (let i = ps; i < pe; i++) if (plain[i] !== '\n') mask[i] = value ? 1 : 0;
}

// plain text එකේ තියෙන වචනයක් (canvas එකේ tap කරපු එක) toggle කරන්න
export function togglePlainRange(src, ps, pe) {
  const { plain, mask } = parse(src);
  applyPlainRange(plain, mask, ps, pe, 'toggle');
  return serialize(plain, mask);
}

// textarea එකේ select කරපු කොටස toggle කරන්න. Select කරලා නැත්නම් cursor එක ළඟ වචනය.
// ආපහු එන්නේ { text, start, end } (අලුත් markup එකේ select කරන්න ඕනේ තැන)
export function toggleMarkupSelection(src, s, e) {
  const { plain, mask, toPlain } = parse(src);
  let ps = toPlain[s], pe = toPlain[e];
  if (ps === pe) {
    while (ps > 0 && !isSpace(plain[ps - 1]) && plain[ps - 1] !== '\n') ps--;
    while (pe < plain.length && !isSpace(plain[pe]) && plain[pe] !== '\n') pe++;
  }
  if (ps === pe) return { text: src, start: s, end: e };
  applyPlainRange(plain, mask, ps, pe, 'toggle');
  const text = serialize(plain, mask);
  // plain index → අලුත් markup index
  const back = parse(text).toPlain;
  let start = 0, end = text.length;
  for (let i = 0; i <= text.length; i++) if (back[i] === ps && text[i] !== '*') { start = i; break; }
  for (let i = text.length; i >= 0; i--) if (back[i] === pe) { end = i; if (i === 0 || text[i - 1] !== '*') break; }
  return { text, start, end };
}
