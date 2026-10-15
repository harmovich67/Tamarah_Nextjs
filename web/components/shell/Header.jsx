'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useWishlistIds } from '@/hooks/useWishlist';
import { useUiStore } from '@/store/uiStore';
import { config } from '@/lib/config';
import { asset } from '@/lib/asset';
import { isMenuActive } from '@/lib/shellData';

const LangLink = ({ locale }) => (
  // A plain anchor on purpose: /lang/[locale] is a route handler (sets the cookie, then redirects back).
  <a className="language-link" lang={locale === 'ar' ? 'en' : 'ar'} hrefLang={locale === 'ar' ? 'en' : 'ar'} href={`/lang/${locale === 'ar' ? 'en' : 'ar'}`}>
    {locale === 'ar' ? 'English' : 'العربية'}
  </a>
);

function NavLinks({ items, className, ariaLabel }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <nav className={className} aria-label={ariaLabel}>
      {items.map((item) => {
        const active = isMenuActive(item.href, pathname, searchParams);
        const external = /^(https?:)?\/\//.test(item.href);
        const props = { 'aria-current': active ? 'page' : undefined, ...(item.newTab ? { target: '_blank', rel: 'noopener' } : {}) };
        return external || item.newTab ? (
          <a key={`${item.href}-${item.label}`} href={item.href} {...props}>{item.label}</a>
        ) : (
          <Link key={`${item.href}-${item.label}`} href={item.href} {...props}>{item.label}</Link>
        );
      })}
    </nav>
  );
}

/** Static (non-highlighting) fallback while search params resolve. */
function NavFallback({ items, className, ariaLabel }) {
  return (
    <nav className={className} aria-label={ariaLabel}>
      {items.map((item) => (
        <Link key={`${item.href}-${item.label}`} href={item.href}>{item.label}</Link>
      ))}
    </nav>
  );
}

export function SiteNav(props) {
  return (
    <Suspense fallback={<NavFallback {...props} />}>
      <NavLinks {...props} />
    </Suspense>
  );
}

/**
 * Site header (layouts/app.php). Variants: standard, immersive (transparent over the home hero) and the minimal
 * auth header (logo + back link + language switch).
 */
export default function Header({ shell, immersive, authLayout }) {
  const { locale, isEn, tr } = useLocale();
  const { user, isStaff } = useAuth();
  const { data: cart } = useCart();
  const { data: wishlist = [] } = useWishlistIds();
  const openOverlay = useUiStore((s) => s.open);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!immersive) {
      setScrolled(false);
      return undefined;
    }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [immersive]);

  const cartCount = Number(cart?.count || 0);
  const wishlistCount = user ? wishlist.length : 0;
  const mode = immersive ? 'immersive' : 'standard';
  const accountHref = user ? (isStaff ? config.dashboardUrl : '/profile') : '/login';

  return (
    <div className={`header-system header-system--${mode}${immersive && scrolled ? ' is-scrolled' : ''}`} id="header-system">
      {shell.announcement && !authLayout ? (
        <div className="announcement-bar">
          <span>{shell.announcement}</span>
        </div>
      ) : null}
      <header className={`site-header site-header--${mode}`}>
        <div className="container header-inner">
          <Link className="logo-link" href="/" aria-label={tr('تمرنا - الرئيسية', 'Tamrna - Home')}>
            <span className="brand-wordmark" role="img" aria-label="تمرنا Tamrna">
              {shell.customLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={shell.siteName} src={shell.customLogo} />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="brand-logo-dark" alt="" width="174" height="246" src={asset('assets/brand/tamrna-logo.svg')} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="brand-logo-light" alt="" width="174" height="246" src={asset('assets/brand/tamrna-logo-light.svg')} />
                </>
              )}
            </span>
          </Link>

          {authLayout ? (
            <div className="header-actions">
              <Link className="button button--ghost header-back-link" href="/">
                {tr('العودة للرئيسية', 'Back to home')}
                <Icon name="arrow-left" size={18} className="directional-arrow" />
              </Link>
              <LangLink locale={locale} />
            </div>
          ) : (
            <>
              <SiteNav items={shell.nav} className="desktop-nav" ariaLabel={tr('القائمة', 'Main menu')} />

              <div className="header-actions">
                <button type="button" className="button button--icon mobile-menu-button" onClick={() => openOverlay('menu-drawer')} aria-label={tr('القائمة', 'Menu')}>
                  <Icon name="menu" size={21} />
                </button>
                <button type="button" className="button button--ghost header-search-trigger" onClick={() => openOverlay('search-dialog')} aria-label={tr('بحث', 'Search')}>
                  <Icon name="search" size={19} />
                  <span>{tr('ابحث عن منتج', 'Search products')}</span>
                </button>
                <Link className="button button--icon account-button" href={accountHref} aria-label={user ? tr('حسابي', 'My account') : tr('تسجيل الدخول', 'Sign in')} title={user?.name || undefined}>
                  <Icon name="user-round" size={21} />
                </Link>
                <Link className="button button--icon" href="/wishlist" aria-label={tr('المفضلة', 'Wishlist')}>
                  <Icon name="heart" size={21} />
                  <span id="headerWishlistBadge" className={`count-badge tumurna-wishlist-count${wishlistCount === 0 ? ' hidden' : ''}`}>{wishlistCount}</span>
                </Link>
                <button type="button" className="button button--icon" onClick={() => openOverlay('cart-drawer')} aria-haspopup="dialog" aria-label={`${tr('سلة التسوق', 'Shopping cart')} (${cartCount})`}>
                  <Icon name="shopping-bag" size={21} />
                  <span id="headerCartBadge" className={`count-badge tumurna-cart-badge${cartCount === 0 ? ' hidden' : ''}`}>{cartCount}</span>
                </button>
                <LangLink locale={locale} />
              </div>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
