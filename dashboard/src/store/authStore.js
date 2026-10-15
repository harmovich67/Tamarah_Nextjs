import { create } from 'zustand';
import { clearSession, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '@/lib/session';

/** Dashboard session. Server data lives in TanStack Query; this store only holds the signed-in user. */
export const useAuthStore = create((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  setSession: ({ token = null, user }) => {
    setStoredToken(token);
    setStoredUser(user);
    set({ user, token });
  },
  setUser: (user) => {
    setStoredUser(user);
    set({ user });
  },
  clear: () => {
    clearSession();
    set({ user: null, token: null });
  },
}));
