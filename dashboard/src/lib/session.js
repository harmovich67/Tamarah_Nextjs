import { safeStorage } from '@tamrna/shared/api';

/** Session persistence for the dashboard (token + user). Only the auth store and API client touch these. */
const TOKEN_KEY = 'tamrna.admin.token';
const USER_KEY = 'tamrna.admin.user';

export const getStoredToken = () => safeStorage.get(TOKEN_KEY);
export const setStoredToken = (t) => (t ? safeStorage.set(TOKEN_KEY, t) : safeStorage.remove(TOKEN_KEY));
export const getStoredUser = () => safeStorage.getJson(USER_KEY, null);
export const setStoredUser = (u) => (u ? safeStorage.setJson(USER_KEY, u) : safeStorage.remove(USER_KEY));
export const clearSession = () => {
  safeStorage.remove(TOKEN_KEY);
  safeStorage.remove(USER_KEY);
};

const listeners = new Set();
export const onUnauthorized = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const notifyUnauthorized = (error) => listeners.forEach((fn) => fn(error));
