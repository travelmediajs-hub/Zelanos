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
