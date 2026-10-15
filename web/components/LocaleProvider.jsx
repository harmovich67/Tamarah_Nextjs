'use client';

import { createContext, useContext, useMemo } from 'react';
import { createTranslator } from '@tamrna/shared/i18n';
import { isRtl as rtlOf } from '@tamrna/shared/constants';
import { currency, formatMoney } from '@tamrna/shared/utils';

const LocaleContext = createContext({ locale: 'ar', isRtl: true, isEn: false });

/**
 * Makes the server-resolved locale available to client components.
 * `tr(ar, en)` is the equivalent of the PHP views' `$isRtl ? 'عربي' : 'English'` pairs and `t(key)` the
 * equivalent of `__('key')` (the migrated resources/lang dictionaries).
 */
export function LocaleProvider({ locale, children }) {
  const value = useMemo(() => {
    const t = createTranslator(locale);
    return {
      locale,
      isRtl: rtlOf(locale),
      isEn: locale === 'en',
      t,
      tr: (ar, en) => (locale === 'en' ? en : ar),
      currency: currency(locale),
      money: (amount) => formatMoney(amount, locale),
    };
  }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
