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

/**
 * Load all data from Supabase
 * @returns {Promise<Object>} all app data
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
 * Insert a row into a table
 * @param {string} stateKey - the app state key (e.g. 'tours')
 * @param {Object} row - the camelCase row data
 * @returns {Promise<Object|null>} inserted row in camelCase, or null
 */
export async function insertRow(stateKey, row) {
  if (!supabase) return null;
  const tableName = TABLE_MAP[stateKey];
  if (!tableName) return null;

  const snakeRow = keysToSnake(row);
  // Remove client-generated id — let Supabase auto-generate
  delete snakeRow.id;
  // Remove computed fields
  delete snakeRow.total_expenses;
  delete snakeRow.balance_eur;

  const { data, error } = await supabase
    .from(tableName)
    .insert(snakeRow)
    .select()
    .single();

  if (error) {
    console.error(`Insert error (${tableName}):`, error.message);
    return null;
  }
  return keysToCamel(data);
}

/**
 * Update a row in a table
 * @param {string} stateKey
 * @param {number} id
 * @param {Object} updates - camelCase partial object
 * @returns {Promise<Object|null>}
 */
export async function updateRow(stateKey, id, updates) {
  if (!supabase) return null;
  const tableName = TABLE_MAP[stateKey];
  if (!tableName) return null;

  const snakeUpdates = keysToSnake(updates);
  delete snakeUpdates.id;
  delete snakeUpdates.total_expenses;
  delete snakeUpdates.balance_eur;

  const { data, error } = await supabase
    .from(tableName)
    .update(snakeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Update error (${tableName}):`, error.message);
    return null;
  }
  return keysToCamel(data);
}

/**
 * Delete a row from a table
 * @param {string} stateKey
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function deleteRow(stateKey, id) {
  if (!supabase) return false;
  const tableName = TABLE_MAP[stateKey];
  if (!tableName) return false;

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Delete error (${tableName}):`, error.message);
    return false;
  }
  return true;
}

/**
 * Replace all languages
 * @param {string[]} langs
 * @returns {Promise<boolean>}
 */
export async function saveLanguages(langs) {
  if (!supabase) return false;

  // Delete all existing
  await supabase.from('tour_languages').delete().neq('id', 0);

  // Insert new ones
  const rows = langs.map(name => ({ name }));
  const { error } = await supabase.from('tour_languages').insert(rows);

  if (error) {
    console.error('Save languages error:', error.message);
    return false;
  }
  return true;
}
