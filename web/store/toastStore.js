'use client';

import { create } from 'zustand';

/**
 * Floating toast ("cart-feedback") exactly like window.showTumurnaToast(): a single message at a time,
 * re-triggered with a new `id` so the CSS animation restarts.
 */
export const useToastStore = create((set) => ({
  message: '',
  type: 'success',
  id: 0,
  show: (message, type = 'success') => set((s) => ({ message, type, id: s.id + 1 })),
}));

/** Imperative helper usable from services, hooks and event handlers. @param {'success'|'error'|'info'} [type] */
export const showToast = (message, type = 'success') => useToastStore.getState().show(message, type);
