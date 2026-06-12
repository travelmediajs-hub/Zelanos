import { supabase } from './supabase';

/**
 * Convert camelCase to snake_case
 * @param {string} str
 * @returns {string}
 */
function toSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert snake_case to camelCase
 * @param {string} str
 * @returns {string}
 */
function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 * @param {Object} obj
 * @returns {Object}
 */
function keysToSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

/**
 * Convert object keys from snake_case to camelCase
 * @param {Object} obj
 * @returns {Object}
 */
function keysToCamel(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = v;
  }
  return out;
}

/** Table name mapping: state key → Supabase table */
const TABLE_MAP = {
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
 * Load all data from Supabase
 * @returns {Promise<Object|null>} all app data
 */
export async function loadAllData() {
  if (!supabase) return null;

  const result = {};
  for (const [stateKey, tableName] of Object.entries(TABLE_MAP)) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error(`Error loading ${tableName}:`, error.message);
      result[stateKey] = [];
    } else {
      result[stateKey] = (data || []).map(keysToCamel);
    }
  }

  // Load languages separately
  const { data: langs } = await supabase
    .from('tour_languages')
    .select('name')
    .order('id');
  result.tourLanguages = langs ? langs.map(l => l.name) : [];

  return result;
}

/**
 * Sync diff between old and new arrays to Supabase.
 * Detects inserts, updates, and deletes automatically.
 * @param {string} stateKey
 * @param {Array} prev - previous array
 * @param {Array} next - new array
 */
export async function syncDiff(stateKey, prev, next) {
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
      // New item — insert
      const cleaned = cleanRow(row);
      supabase.from(tableName).insert(cleaned).select().single().then(({ data, error }) => {
        if (error) reportSyncError('Запис', tableName, error.message);
        // Note: we don't update local state with DB id here because
        // the local genId is used. On next full reload, DB ids will be used.
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
    console.error('Save languages error:', error.message);
    return false;
  }
  return true;
}
