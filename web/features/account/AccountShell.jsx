'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { LoadingState } from '@/components/ui/States';
import { useRequireAuth } from '@/hooks/useAuth';
import { accountService } from '@/services';
import { asset } from '@/lib/asset';

export const overviewKey = ['account', 'overview'];

/**
 * Account hub frame (components/account_shell_open.php): breadcrumb, welcome heading, sidebar navigation and the
 * summary card. Unauthenticated visitors are redirected to /login (ProfileController::requireAuth()).
 */
export default function AccountShell({ active, heading, headerExtra, children }) {
  const { isRtl, tr } = useLocale();
  const pathname = usePathname();
  const { user, hydrated } = useRequireAuth();
  const { data: overview } = useQuery({ queryKey: overviewKey, queryFn: () => accountService.getOverview(), enabled: !!user });

  if (!hydrated || !user) return <LoadingState rows={2} />;

  const nameParts = String(user.name || '').trim().split(/\s+/).filter(Boolean);
  const first = nameParts[0] || '';
  const initials = nameParts.slice(0, 2).map((w) => w.slice(0, 1)).join('') || String(user.name || 'U').slice(0, 1);
  const chevron = isRtl ? 'chevron-left' : 'chevron-right';

  const nav = [
    ['profile', '/profile', tr('الملف الشخصي', 'Profile'), 'user-round', null],
    ['orders', '/profile/orders', tr('طلباتي', 'My Orders'), 'package', overview?.ordersCount],
    ['addresses', '/profile/addresses', tr('عناويني', 'My addresses'), 'map-pin', overview?.addressesCount],
    ['gift-cards', '/profile/gift-cards', tr('بطاقات الهدايا', 'Gift cards'), 'gift', null],
    ['wishlist', '/wishlist', tr('المفضلة', 'Wishlist'), 'heart', null],
    ['notifications', '/profile/notifications', tr('الإشعارات', 'Notifications'), 'bell', null],
    ['settings', '/profile/settings', tr('الإعدادات', 'Settings'), 'settings', null],
  ];

  return (
    <section className="account-hub" data-path={pathname}>
      <div className="account-ornament" />
      <div className="container">
        <nav className="account-breadcrumb" aria-label={tr('مسار الصفحة', 'Breadcrumb')}>
          <Link href="/">{tr('الرئيسية', 'Home')}</Link>
          <Icon name={chevron} size={24} />
          <Link href="/profile">{tr('حسابي', 'My Account')}</Link>
          <Icon name={chevron} size={24} />
          <span>{heading}</span>
        </nav>

        <header className="account-welcome">
          <span>{tr('حساب تمرنا', 'Tamrna account')}</span>
          <h1>{tr('مرحبًا ', 'Welcome, ')}{first}</h1>
          <p>{tr('يسعدنا وجودك معنا. راجع بياناتك وعناوينك وطلباتك من مكان واحد.', 'We are glad you are here. Manage your details, addresses and orders in one place.')}</p>
        </header>

        <div className="account-shell">
          <aside className="account-sidebar">
            <nav aria-label={tr('قائمة الحساب', 'Account menu')}>
              {nav.map(([key, href, label, icon, count]) => (
                <Link key={key} href={href} className={active === key ? 'is-active' : ''}>
                  <Icon name={icon} size={20} stroke={1.6} />
                  {label}
                  {count > 0 ? <b style={{ marginInlineStart: 'auto', fontSize: 11, background: '#e6d5bb', color: '#3c5749', padding: '1px 7px', borderRadius: 999 }}>{count}</b> : null}
                </Link>
              ))}
            </nav>
            <Link className="button button--outline account-logout" href="/logout">
              <Icon name="log-out" size={18} />
              {tr('تسجيل الخروج', 'Sign out')}
            </Link>
            <Link className="account-gift-promo" href="/gift-cards">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('assets/images/home/gifting.webp')} alt="" loading="lazy" />
              <span><Icon name="gift" size={22} />{tr('أهدِ من تحب أصالة تمرنا', 'Share Tamrna gifting')}</span>
              <b>{tr('تصفح بطاقات الهدايا', 'Browse gift cards')}</b>
            </Link>
          </aside>

          <div className="account-content">
            <section className="account-summary-card">
              <div className="account-avatar" aria-hidden="true">{initials}</div>
              <div>
                <h2>{user.name}</h2>
                {user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : null}
                {user.phone ? <a dir="ltr" href={`tel:${user.phone}`}>{user.phone}</a> : null}
                <small><Icon name="shield-check" size={14} />{tr('حساب موثق', 'Verified account')}</small>
              </div>
              {headerExtra}
            </section>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
