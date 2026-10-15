'use client';

import { create } from 'zustand';

/** Which overlay (menu drawer / cart drawer / search dialog) is open: at most one at a time. */
export const useUiStore = create((set) => ({
  overlay: null,
  open: (name) => set({ overlay: name }),
  close: () => set({ overlay: null }),
}));
