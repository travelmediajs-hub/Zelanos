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

// ── Сервиз на коли ──────────────────────────────────────────────

/**
 * Покрива ли сервизен запис даден ден?
 * Запис с дата на влизане, без дата на излизане = още в сервиз → блокира безсрочно.
 * @param {Object} rec - {date, dateOut}
 * @param {Date} day
 * @returns {boolean}
 */
export function serviceCoversDay(rec, day) {
  if (!rec || !day) return false;
  const start = parseDate(rec.date);
  if (!start) return false;
  if (day < start) return false;
  const end = parseDate(rec.dateOut); // null = още в сервиз
  if (!end) return true;              // отворен запис → блокира всичко след влизането
  return day <= end;
}

/**
 * Имена на коли, които са в сервиз през период [from, to] (Date или null = неограничено).
 * @param {Array} records - всички сервизни записи
 * @param {Date|null} from
 * @param {Date|null} to
 * @returns {Set<string>}
 */
export function carsInServiceRange(records, from, to) {
  const blocked = new Set();
  (records || []).forEach(r => {
    const start = parseDate(r.date);
    if (!start) return;
    const end = parseDate(r.dateOut); // null = отворен
    // Припокрива ли [start, end||∞] с [from||-∞, to||+∞]?
    if (to && start > to) return;
    if (from && end && end < from) return;
    if (r.carName) blocked.add(r.carName);
  });
  return blocked;
}

/**
 * Колко дни е стояла колата в сервиз през периода (включително),
 * ограничено до днес за отворени записи (не броим бъдещи дни).
 * @param {Array} records
 * @param {string} carName
 * @param {Date|null} periodFrom
 * @param {Date|null} periodTo
 * @returns {number}
 */
export function serviceDaysInPeriod(records, carName, periodFrom, periodTo) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DAY = 1000 * 60 * 60 * 24;
  let total = 0;
  (records || []).filter(r => r.carName === carName).forEach(r => {
    const start = parseDate(r.date);
    if (!start) return;
    let end = parseDate(r.dateOut) || today; // отворен → до днес
    if (end > today) end = today;            // не броим бъдеще
    // ограничи до периода
    const lo = periodFrom && periodFrom > start ? periodFrom : start;
    const hi = periodTo && periodTo < end ? periodTo : end;
    if (hi < lo) return;
    total += Math.round((hi - lo) / DAY) + 1; // включително
  });
  return total;
}

/**
 * Статус на документ по дата на валидност: '' | 'valid' | 'soon' (<30 дни) | 'expired'.
 * @param {string} validUntil - dd.mm.yyyy
 * @returns {string}
 */
export function docStatus(validUntil) {
  const d = parseDate(validUntil);
  if (!d) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'valid';
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
