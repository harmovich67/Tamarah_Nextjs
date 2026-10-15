import { API_MODES, AUTH_STRATEGIES } from '../constants/index.js';

/**
 * API_MODE=mock    -> in-browser mock adapters (default until the Laravel API exists)
 * API_MODE=laravel -> REST adapters talking to NEXT_PUBLIC_API_URL / VITE_API_URL
 * @param {string|undefined} raw
 */
export function resolveApiMode(raw) {
  return String(raw || '').toLowerCase() === API_MODES.LARAVEL ? API_MODES.LARAVEL : API_MODES.MOCK;
}

/**
 * AUTH_STRATEGY=token  -> Laravel API tokens / Sanctum personal access tokens (Bearer)
 * AUTH_STRATEGY=cookie -> Laravel Sanctum SPA cookie authentication
 * @param {string|undefined} raw
 */
export function resolveAuthStrategy(raw) {
  return String(raw || '').toLowerCase() === AUTH_STRATEGIES.COOKIE ? AUTH_STRATEGIES.COOKIE : AUTH_STRATEGIES.TOKEN;
}
