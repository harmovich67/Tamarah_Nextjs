import { useMemo } from 'react';
import { createTranslator } from '@tamrna/shared/i18n';
import { dirOf, isRtl as rtlOf } from '@tamrna/shared/constants';
import { currency, formatMoney, numberFormat } from '@tamrna/shared/utils';
import { useLocaleStore } from '@/store/localeStore';

/**
 * Translation + formatting helpers for the dashboard.
 *  - t(key): `__('key')` (resources/lang dictionaries, migrated)
 *  - tr(ar, en): inline ar/en pair (`$isRtl ? '...' : '...'`)
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => {
    const t = createTranslator(locale);
    return {
      locale,
      dir: dirOf(locale),
      isRtl: rtlOf(locale),
      isEn: locale === 'en',
      t,
      tr: (ar, en) => (locale === 'en' ? en : ar),
      currency: currency(locale),
      money: (n) => formatMoney(n, locale),
      money2: (n) => `${numberFormat(n, 2)} ${currency(locale)}`,
    };
  }, [locale]);
}
