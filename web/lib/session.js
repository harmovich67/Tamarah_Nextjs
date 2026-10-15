import { safeStorage } from '@tamrna/shared/api';

/**
 * Session persistence for the storefront. Only the auth store and the API client touch these keys, so the
 * storage mechanism (token vs Sanctum cookie) can change without touching the UI.
 */
const TOKEN_KEY = 'tamrna.web.token';
const USER_KEY = 'tamrna.web.user';

export const getStoredToken = () => safeStorage.get(TOKEN_KEY);
export const setStoredToken = (token) => (token ? safeStorage.set(TOKEN_KEY, token) : safeStorage.remove(TOKEN_KEY));
export const getStoredUser = () => safeStorage.getJson(USER_KEY, null);
export const setStoredUser = (user) => (user ? safeStorage.setJson(USER_KEY, user) : safeStorage.remove(USER_KEY));
export const clearSession = () => {
  safeStorage.remove(TOKEN_KEY);
  safeStorage.remove(USER_KEY);
};

const listeners = new Set();
/** Subscribe to "the API said 401" events (the auth store clears itself and redirects to /login). */
export const onUnauthorized = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const notifyUnauthorized = (error) => listeners.forEach((fn) => fn(error));
