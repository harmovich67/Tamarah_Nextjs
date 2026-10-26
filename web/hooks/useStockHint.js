'use client';

import { useEffect, useState } from 'react';
import { STOCK_HINTS_EVENT, stockHint } from '@/lib/stockHints';

/** The limit learned for a pack (null when unknown), kept up to date when the cart learns a new one. */
export function useStockHint(variantId) {
  const [hint, setHint] = useState(null);
  useEffect(() => {
    const read = () => setHint(variantId ? stockHint(variantId) : null);
    read();
    window.addEventListener(STOCK_HINTS_EVENT, read);
    return () => window.removeEventListener(STOCK_HINTS_EVENT, read);
  }, [variantId]);
  return hint;
}
