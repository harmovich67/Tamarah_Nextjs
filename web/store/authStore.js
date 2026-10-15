'use client';

import { create } from 'zustand';
import { clearSession, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '@/lib/session';

/**
 * Client-side authentication state (the only global client state besides toasts and open overlays).
 * Server data (cart, orders, wishlist...) lives in TanStack Query, not here.
 *
 * `hydrated` stays false until the persisted session has been read in the browser, so protected screens never
 * flash the "please sign in" gate while the session is still loading.
 */
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: () => set({ user: getStoredUser(), token: getStoredToken(), hydrated: true }),

  /** @param {{ token?: string|null, user: object }} session */
  setSession: ({ token = null, user }) => {
    setStoredToken(token);
    setStoredUser(user);
    set({ user, token, hydrated: true });
  },

  setUser: (user) => {
    setStoredUser(user);
    set({ user });
  },

  clear: () => {
    clearSession();
    set({ user: null, token: null, hydrated: true });
  },
}));

export const selectIsAuthenticated = (s) => !!s.user;
