import { DEFAULT_LOCALE, LOCALE_COOKIE } from '@tamrna/shared/constants';

/** Active storefront locale in the browser (the <html lang> attribute is set on the server from the cookie). */
export function getClientLocale() {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const attr = document.documentElement.lang;
  if (attr === 'ar' || attr === 'en') return attr;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return m && (m[1] === 'en' || m[1] === 'ar') ? m[1] : DEFAULT_LOCALE;
}
