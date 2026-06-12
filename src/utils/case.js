/**
 * camelCase ↔ snake_case конверсия на ключове.
 * Клиентът работи в camelCase, Supabase таблиците са в snake_case.
 * Единственото място с тази логика — ползва се от db.js и useRealtimeSync.js.
 */

/**
 * Convert camelCase to snake_case
 * @param {string} str
 * @returns {string}
 */
export function toSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert snake_case to camelCase
 * @param {string} str
 * @returns {string}
 */
export function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 * @param {Object} obj
 * @returns {Object}
 */
export function keysToSnake(obj) {
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
export function keysToCamel(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = v;
  }
  return out;
}
