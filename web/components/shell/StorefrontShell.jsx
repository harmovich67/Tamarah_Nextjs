'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { deriveShell } from '@/lib/shellData';
import ToastHost from '@/components/ToastHost';
import ArabicDigits from '@/components/ArabicDigits';
import RevealOnScroll from '@/components/RevealOnScroll';
import Header from './Header';
import Footer from './Footer';
import Overlays from './Overlays';

/** Paths that use the minimal "auth" header and no footer (views flagged `$authLayout`). */
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-otp'];

/**
 * The whole storefront chrome: skip link, header, <main>, footer, drawers, toast. The header variant is derived
 * from the route (home with a CMS hero => immersive, auth screens => minimal) so it never flickers between pages.
 */
export default function StorefrontShell({ data, children }) {
  const { locale, isRtl, tr } = useLocale();
  const pathname = usePathname();
  const shell = useMemo(() => deriveShell(data.settings, data.menus, locale), [data, locale]);

  const authLayout = AUTH_PATHS.includes(pathname);
  const immersive = authLayout || (pathname === '/' && data.hasHero);
  const shellClass = immersive ? 'storefront-shell storefront-shell--immersive tamrna-home' : 'storefront-shell storefront-shell--standard';

  return (
    <>
      <div className={shellClass}>
        <a className="skip-link" href="#main-content">{tr('انتقل إلى المحتوى', 'Skip to content')}</a>
        <Header shell={shell} immersive={immersive} authLayout={authLayout} />
        <main id="main-content">{children}</main>
        {!authLayout && <Footer shell={shell} locale={locale} />}
        <ToastHost />
      </div>
      <Overlays nav={shell.nav} />
      {!isRtl ? null : <ArabicDigits />}
      <RevealOnScroll />
    </>
  );
}
