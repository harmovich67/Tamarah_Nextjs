/**
 * Translation dictionaries migrated from resources/lang/{ar,en}.php (≈1000 keys each).
 * Keys are identical to the PHP application so a Laravel backend can serve/override them
 * (the "Live translations" editor in the dashboard edits these overrides).
 */
import ar from './ar.json';
import en from './en.json';

export const dictionaries = { ar, en };

/**
 * Create a translator equivalent to the PHP `__($key, $replace, $default)` helper.
 * Placeholders use the Laravel/PHP `:name` syntax.
 *
 * @param {'ar'|'en'} locale
 * @param {Record<string, string>} [overrides] runtime overrides (translations table)
 * @returns {(key: string, replace?: Record<string, string|number>, fallback?: string) => string}
 */
export function createTranslator(locale, overrides = {}) {
  const dict = dictionaries[locale] || dictionaries.ar;
  return function t(key, replace = {}, fallback = '') {
    let text = overrides[key] ?? dict[key] ?? (fallback || key);
    for (const [name, value] of Object.entries(replace)) {
      text = text.split(`:${name}`).join(String(value));
    }
    return text;
  };
}

/** @param {string} key */
export const hasKey = (key) => key in ar || key in en;
