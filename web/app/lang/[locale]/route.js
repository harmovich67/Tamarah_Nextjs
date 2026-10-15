import { NextResponse } from 'next/server';
import { LOCALES, LOCALE_COOKIE } from '@tamrna/shared/constants';

/**
 * GET /lang/{locale} — same URL and behaviour as the PHP route: store the language, then go back to the page the
 * visitor came from (dropping any ?lang= query parameter).
 */
export async function GET(request, { params }) {
  const { locale: raw } = await params;
  const locale = String(raw || '').toLowerCase().trim();

  const referer = request.headers.get('referer');
  let target = new URL('/', request.url);
  if (referer) {
    try {
      const ref = new URL(referer);
      // Only bounce back to our own origin (avoid an open redirect through a forged Referer).
      if (ref.origin === new URL(request.url).origin) {
        ref.searchParams.delete('lang');
        target = ref;
      }
    } catch {
      /* fall back to / */
    }
  }

  const response = NextResponse.redirect(target);
  if (LOCALES.includes(locale)) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  return response;
}
