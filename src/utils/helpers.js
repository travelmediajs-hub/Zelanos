export const MONTHS = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];

export function genId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

export function parseDate(ds) {
  if (!ds) return null;
  const s = String(ds);
  const p = s.split('.');
  if (p.length === 3) return new Date(+p[2], +p[1] - 1, +p[0]);
  return null;
}

export function parseDateISO(s) {
  if (!s) return null;
  const p = s.split('-');
  if (p.length === 3) return new Date(+p[0], +p[1] - 1, +p[2]);
  return null;
}

export function fmtISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function fmtBG(d) {
  return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtISO(d);
}

export function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmtISO(d);
}

export function tourColor(n) {
  if (!n) return '';
  const l = n.toLowerCase();
  if (l.includes('night')) return 'night';
  if (l.includes('walking')) return 'walking';
  return '';
}

/** dd.mm.yyyy → yyyy-mm-dd (за <input type="date">) */
export function bgToISO(s) {
  if (!s) return '';
  return s.includes('.') ? s.split('.').reverse().join('-') : s;
}

/** yyyy-mm-dd → dd.mm.yyyy */
export function isoToBG(s) {
  if (!s) return '';
  const p = s.split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
}

/** Брой дни между две dd.mm.yyyy дати (минимум 1 при еднакви/обърнати дати) */
export function calcDays(from, to) {
  if (!from || !to) return 0;
  const a = parseDate(from), b = parseDate(to);
  if (!a || !b) return 0;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

/** Период за preset бутоните на справките: '7' | '30' | '90' | 'year' | 'all' → {from, to} (ISO) */
export function presetRange(p) {
  if (p === '7') return { from: daysAgo(3), to: daysAhead(4) };
  if (p === '30') return { from: daysAgo(15), to: daysAhead(15) };
  if (p === '90') return { from: daysAgo(45), to: daysAhead(45) };
  if (p === 'year') {
    const y = new Date().getFullYear();
    return { from: y + '-01-01', to: y + '-12-31' };
  }
  return { from: '', to: '' };
}
