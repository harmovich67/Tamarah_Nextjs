import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE } from '@tamrna/shared/constants';
import { createTranslator } from '@tamrna/shared/i18n';

/** Server-side locale (cookie set by the /lang/[locale] route, same behaviour as the PHP session locale). */
export async function getLocale() {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

/** Translator for server components: `const t = await getT()`. */
export async function getT() {
  return createTranslator(await getLocale());
}
