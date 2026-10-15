'use client';

import { useCallback, useState } from 'react';

export function useDisclosure(initial = false) {
  const [isOpen, setOpen] = useState(initial);
  return {
    isOpen,
    open: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
    toggle: useCallback(() => setOpen((v) => !v), []),
  };
}
