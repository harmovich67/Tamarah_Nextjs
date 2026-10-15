import { createMockDb, mockLatency, SETTINGS_OVERRIDE_KEY } from '@tamrna/shared/mocks';
import { ApiError, ERROR_CODES, safeStorage } from '@tamrna/shared/api';

/**
 * The storefront's mock "database". Persists to localStorage (browser) and falls back to the seed in memory
 * during server rendering. Shared tables mirror the legacy PHP schema (see shared/mocks/seed.js).
 */
export const db = createMockDb({ namespace: 'tamrna-web' });
export const latency = mockLatency;

// Settings saved in the dashboard reach this origin through /mock-bridge (see shared/mocks/settingsBridge.js) and win over the seed.
const seededGetSettings = db.getSettings;
db.getSettings = () => ({ ...seededGetSettings(), ...(safeStorage.getJson(SETTINGS_OVERRIDE_KEY, null) || {}) });

/** Throw a Laravel-shaped business error (`{ success: false, message }`). */
export function fail(message, status = 400, errors = {}) {
  const code = status === 404 ? ERROR_CODES.NOT_FOUND : status === 422 ? ERROR_CODES.VALIDATION : ERROR_CODES.HTTP;
  throw new ApiError({ status, code, message, errors, data: { success: false, message } });
}

export const isActive = (row) => row && (row.status === 'active' || row.status === 'published' || row.is_active === 1 || row.is_active === true);

/** Parse the JSON `settings_json` column of a home section. */
export function withSettings(section) {
  let settings = {};
  try {
    settings = section.settings_json ? JSON.parse(section.settings_json) : {};
  } catch {
    settings = {};
  }
  return { ...section, settings };
}
