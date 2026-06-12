import { supabase } from './supabase';
import { toSnake, keysToSnake, keysToCamel } from './case';

/** Table name mapping: state key → Supabase table */
export const TABLE_MAP = {
  guides: 'guides',
  fuel: 'fuel',
  stopsCarBus: 'stops_car',
  fines: 'fines',
  carTasks: 'car_tasks',
  stopsGuide: 'stops_guide',
  tours: 'tours',
  vehicles: 'vehicles',
  roundTrips: 'round_trips',
  catalog: 'catalog',
  carRentals: 'car_rentals',
  serviceRecords: 'service_records',
};

/** Fields to exclude from Supabase writes (computed client-side) */
const EXCLUDE_FIELDS = new Set(['totalExpenses', 'balanceEur', 'total_expenses', 'balance_eur']);

/**
 * Report a failed Supabase write — logs AND notifies the UI.
 * Silent failures here previously meant records looked saved on screen
 * but never reached the database (and vanished on reload).
 * @param {string} op - insert/update/delete
 * @param {string} tableName
 * @param {string} message
 */
function reportSyncError(op, tableName, message) {
  console.error(`${op} ${tableName}:`, message);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zelanos-sync-error', {
      detail: { op, table: tableName, message },
    }));
  }
}

/**
 * Clean row for Supabase insert/update
 * @param {Object} row
 * @returns {Object}
 */
function cleanRow(row) {
  const snake = keysToSnake(row);
  delete snake.id;
  delete snake.created_at;
  for (const f of EXCLUDE_FIELDS) {
    delete snake[f];
    delete snake[toSnake(f)];
  }
  return snake;
}

/**
 * Load all data from Supabase (всички таблици паралелно).
 * При грешка за дадена таблица връща null за нея — НЕ празен масив,
 * за да не презапишем локалните данни и бекъпа с празно при мрежов проблем.
 * @returns {Promise<Object|null>} all app data
 */
export async function loadAllData() {
  if (!supabase) return null;

  const entries = Object.entries(TABLE_MAP);
  const results = await Promise.all(entries.map(async ([stateKey, tableName]) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      reportSyncError('Зареждане', tableName, error.message);
      return [stateKey, null];
    }
    return [stateKey, (data || []).map(keysToCamel)];
  }));

  const result = Object.fromEntries(results);

  // Load languages separately
  const { data: langs, error: langsError } = await supabase
    .from('tour_languages')
    .select('name')
    .order('id');
  result.tourLanguages = langsError || !langs ? null : langs.map(l => l.name);

  return result;
}

/**
 * Sync diff between old and new arrays to Supabase.
 * Detects inserts, updates, and deletes automatically.
 * @param {string} stateKey
 * @param {Array} prev - previous array
 * @param {Array} next - new array
 * @param {Function} [onInserted] - callback(localId, dbRowCamel) след успешен insert,
 *   за да се смени локалното genId с истинското id от базата
 */
export async function syncDiff(stateKey, prev, next, onInserted) {
  if (!supabase) return;
  const tableName = TABLE_MAP[stateKey];
  if (!tableName) return;

  const prevMap = new Map(prev.map(r => [r.id, r]));
  const nextMap = new Map(next.map(r => [r.id, r]));

  // Deleted items
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) {
      supabase.from(tableName).delete().eq('id', id).then(({ error }) => {
        if (error) reportSyncError('Изтриване', tableName, error.message);
      });
    }
  }

  // New or updated items
  for (const [id, row] of nextMap) {
    const old = prevMap.get(id);
    if (!old) {
      // New item — insert; после сменяме локалното id с id-то от базата,
      // иначе следваща редакция/изтриване не уцелва реда в DB,
      // а realtime echo-то създава дубликат на екрана.
      const cleaned = cleanRow(row);
      supabase.from(tableName).insert(cleaned).select().single().then(({ data, error }) => {
        if (error) {
          reportSyncError('Запис', tableName, error.message);
        } else if (data && onInserted) {
          onInserted(id, keysToCamel(data));
        }
      });
    } else if (JSON.stringify(old) !== JSON.stringify(row)) {
      // Updated item
      const cleaned = cleanRow(row);
      supabase.from(tableName).update(cleaned).eq('id', id).then(({ error }) => {
        if (error) reportSyncError('Промяна', tableName, error.message);
      });
    }
  }
}

/**
 * Replace all languages in Supabase
 * @param {string[]} langs
 * @returns {Promise<boolean>}
 */
export async function saveLanguagesDB(langs) {
  if (!supabase) return false;

  await supabase.from('tour_languages').delete().neq('id', 0);
  const rows = langs.map(name => ({ name }));
  const { error } = await supabase.from('tour_languages').insert(rows);

  if (error) {
    reportSyncError('Запис', 'tour_languages', error.message);
    return false;
  }
  return true;
}
