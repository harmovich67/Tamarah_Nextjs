import { createTranslator } from '@tamrna/shared/i18n';
import { dirOf } from '@tamrna/shared/constants';
import { formatMoney } from '@tamrna/shared/utils';

/**
 * Locale helpers for SERVER components (client components use useLocale()). `tr(ar, en)` mirrors the PHP
 * `$isRtl ? 'عربي' : 'English'` pairs.
 * @param {'ar'|'en'} locale
 */
export function makeText(locale) {
  return {
    locale,
    dir: dirOf(locale),
    isRtl: locale === 'ar',
    isEn: locale === 'en',
    tr: (ar, en) => (locale === 'en' ? en : ar),
    t: createTranslator(locale),
    money: (amount) => formatMoney(amount, locale),
  };
}

/** Escape-free line breaks: "a\nb" -> ["a", "b"] (white-space: pre-line headings in the Foundation CSS). */
export const lines = (text) => String(text ?? '');
