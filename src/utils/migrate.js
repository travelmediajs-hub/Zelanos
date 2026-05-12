import { supabase } from './supabase';

/**
 * Convert camelCase to snake_case
 */
function toSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function keysToSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

const EXCLUDE_FIELDS = new Set([
  'id', 'created_at', 'total_expenses', 'balance_eur',
  'totalExpenses', 'balanceEur'
]);

function cleanRow(row) {
  const snake = keysToSnake(row);
  for (const f of EXCLUDE_FIELDS) {
    delete snake[f];
    delete snake[toSnake(f)];
  }
  return snake;
}

/** Fields that must be numeric — non-numeric values get replaced with 0 */
const NUMERIC_FIELDS = {
  fuel: ['km_start', 'km_end', 'total_km', 'price_per_liter', 'total_fuel_cost', 'liters'],
  fines: ['amount'],
  tours: ['adults', 'children', 'price_adult', 'price_child', 'collected', 'expenses'],
};

function sanitizeNumericFields(row, tableName) {
  const fields = NUMERIC_FIELDS[tableName];
  if (!fields) return row;
  const out = { ...row };
  for (const f of fields) {
    if (f in out && (out[f] === '' || out[f] === null || out[f] === undefined || isNaN(Number(out[f])))) {
      out[f] = 0;
    }
  }
  return out;
}

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
 * Migrate all localStorage data to Supabase (one-time).
 * Inserts in batches of 50 to avoid timeouts.
 * @param {Object} appData - the current app state object
 * @param {Function} onProgress - callback(stateKey, inserted, total)
 * @returns {Promise<Object>} results per table
 */
export async function migrateToSupabase(appData, onProgress) {
  if (!supabase) throw new Error('Supabase not configured');

  const results = {};

  for (const [stateKey, tableName] of Object.entries(TABLE_MAP)) {
    const items = appData[stateKey];
    if (!items || !Array.isArray(items) || items.length === 0) {
      results[stateKey] = { skipped: true };
      continue;
    }

    // Check if table already has data
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (count > 0) {
      results[stateKey] = { skipped: true, existing: count };
      continue;
    }

    // Insert in batches
    const cleaned = items.map(r => sanitizeNumericFields(cleanRow(r), tableName));
    let inserted = 0;
    const batchSize = 50;

    for (let i = 0; i < cleaned.length; i += batchSize) {
      const batch = cleaned.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);
      if (error) {
        console.error(`Migration error (${tableName}):`, error.message);
        results[stateKey] = { error: error.message, inserted };
        break;
      }
      inserted += batch.length;
      if (onProgress) onProgress(stateKey, inserted, items.length);
    }

    if (!results[stateKey]) {
      results[stateKey] = { success: true, inserted };
    }
  }

  return results;
}
