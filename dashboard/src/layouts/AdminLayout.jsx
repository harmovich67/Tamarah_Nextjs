import { Suspense, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, Icon } from '@/components/ui';
import { PageLoading, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useLocaleStore } from '@/store/localeStore';
import { authService, systemService } from '@/services';
import { config } from '@/lib/config';
import { NAV } from './navigation';

/** Screens the real backend feeds (and therefore the storefront). Everything else still runs on browser-only demo data. */
const BACKED_PREFIXES = ['/products', '/categories'];

/** Warns on screens that do not reach the backend, so nobody expects their changes to appear on the storefront. */
function DemoDataNotice({ pathname }) {
  const { tr } = useT();
  if (config.apiMode !== 'laravel' || !config.mockFallback) return null;
  if (BACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const home = pathname.startsWith('/home-sections');
  return (
    <Alert type="warning" className="mb-5">
      {home
        ? tr(
            'الشرائح (البانرات) متصلة بالخادم، أما باقي أقسام الصفحة الرئيسية فبيانات تجريبية محفوظة في هذا المتصفح فقط ولا تؤثر على الموقع حاليًا.',
            'Slides (banners) are connected to the server; the other homepage sections are demo data kept in this browser only and do not change the storefront yet.',
          )
        : tr(
            'هذه الشاشة تعمل ببيانات تجريبية محفوظة في هذا المتصفح فقط، ولا تؤثر على الموقع (الخادم لا يوفّر لها واجهة API بعد).',
            'This screen runs on demo data kept in this browser only and does not change the storefront (the server has no API for it yet).',
          )}
    </Alert>
  );
}

const LINK_BASE = 'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 select-none';
const LINK_ACTIVE = 'bg-gradient-to-r from-[#143d2b] to-[#0f2c1f] text-white shadow-xs border border-[#1e5c41]/50 font-semibold relative before:absolute before:inset-y-1.5 before:start-0 before:w-1 before:bg-[#22c55e] before:rounded-e-full';
const LINK_IDLE = 'text-slate-300 hover:text-white hover:bg-white/5';

/** Modern Sidebar + Header Shell for Tamrna Administration */
export default function AdminLayout() {
  const { t, tr, isRtl, locale } = useT();
  const { user, can } = usePermissions();
  const clear = useAuthStore((s) => s.clear);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { sidebarOpen, closeSidebar, toggleSidebar } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();

  // The drawer closes on navigation (mobile) and with Escape.
  useEffect(() => closeSidebar(), [location.pathname, closeSidebar]);
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeSidebar();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen, closeSidebar]);

  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clear();
      navigate('/login', { replace: true });
    },
  });

  const clearCache = useMutation({
    mutationFn: () => systemService.clearCache(),
    onSuccess: () => toast.success(tr('تم تفريغ الذاكرة المؤقتة', 'Cache cleared')),
    onError: () => toast.error(tr('تعذر تفريغ الذاكرة المؤقتة', 'Could not clear the cache')),
  });

  const roleLabel = isRtl ? user?.role_ar : user?.role_en;
  const initial = (user?.name || 'م').slice(0, 1);

  return (
    <div className="bg-[#f8fafc] text-slate-900 font-sans antialiased flex h-screen overflow-hidden selection:bg-[#0f764a]/20 selection:text-[#0f764a]" dir={isRtl ? 'rtl' : 'ltr'}>
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:ring-2 focus:ring-[#0f764a]">
        {tr('انتقل إلى المحتوى', 'Skip to content')}
      </a>

      {/* Mobile sidebar backdrop */}
      <div
        onClick={closeSidebar}
        aria-hidden="true"
        className={cx(
          'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sidebar */}
      <aside
        id="adminSidebar"
        aria-label={tr('القائمة الرئيسية', 'Main navigation')}
        className={cx(
          'fixed inset-y-0 ltr:left-0 rtl:right-0 md:relative w-72 bg-[#0a1510] text-slate-100 flex flex-col flex-shrink-0 z-50 md:z-30 shadow-2xl transition-transform duration-300 ease-in-out border-e border-[#152a20]',
          sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full md:ltr:translate-x-0 md:rtl:translate-x-0',
        )}
      >
        {/* Brand header */}
        <div className="h-18 flex items-center justify-between px-5 border-b border-[#152a20] bg-[#07100b]">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 group-hover:border-amber-400/40 transition-colors">
              <img src="/assets/images/logo.png" alt="تمرنا" className="w-8 h-8 object-contain brightness-110" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide leading-none">{t('admin_brand_title')}</p>
              <span className="text-[10px] text-amber-400 font-medium mt-1 block tracking-wider opacity-90">{t('admin_brand_subtitle')}</span>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={toggleSidebar}
            className="md:hidden w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition"
            aria-label={tr('إغلاق القائمة', 'Close menu')}
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* User preview card */}
        <div className="p-3 mx-3.5 mt-3.5 rounded-xl bg-[#12241b] border border-[#1d3d2c]/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0f764a] to-[#22c55e] text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-[#07100b] px-2 py-0.5 rounded-md mt-0.5 border border-[#1b3827]">
                <Icon name="crown" className="w-2.5 h-2.5 text-amber-400" />
                <span>{roleLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-1.5 sidebar-scroll">
          {NAV.map((group, gi) => {
            const items = group.items.filter((i) => !i.permission || can(i.permission));
            if (!items.length) return null;
            return (
              <div key={gi} className="space-y-1">
                {group.titleKey ? (
                  <div className="pt-3 pb-1">
                    <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">{t(group.titleKey)}</p>
                  </div>
                ) : null}
                {items.map((item) => {
                  const label = item.labelKey ? t(item.labelKey) : tr(item.label[0], item.label[1]);
                  const inner = (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon name={item.icon} className="w-4 h-4 text-amber-400/90 shrink-0" />
                        <span>{label}</span>
                      </div>
                      {item.external ? <Icon name="external-link" className="w-3 h-3 text-slate-500 shrink-0" /> : null}
                    </>
                  );
                  return item.external ? (
                    <a
                      key={item.href}
                      href={`${config.storefrontUrl}${item.href}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cx(LINK_BASE, LINK_IDLE)}
                    >
                      {inner}
                    </a>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => cx(LINK_BASE, isActive ? LINK_ACTIVE : LINK_IDLE)}
                    >
                      {inner}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3.5 border-t border-[#152a20] bg-[#07100b] flex items-center justify-between">
          <a
            href={config.storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1.5 transition-colors"
          >
            <Icon name="external-link" className="w-3.5 h-3.5" />
            <span>{t('admin_visit_store')}</span>
          </a>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="log-out" className="w-3.5 h-3.5" />
            <span>{t('admin_logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-18 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between z-10 sticky top-0 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              aria-label={tr('فتح القائمة', 'Open menu')}
              aria-expanded={sidebarOpen}
              aria-controls="adminSidebar"
            >
              <Icon name="menu" className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">{t('admin_store_status_active')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              title={locale === 'ar' ? 'Switch Dashboard to English' : 'تحويل الداشبورد إلى العربية'}
            >
              <Icon name="globe" className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{locale === 'ar' ? 'English (EN)' : 'عربي (AR)'}</span>
            </button>

            <a
              href={config.storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200/80 shadow-2xs flex items-center gap-1.5 hover:border-[#0f764a] hover:text-[#0f764a]"
            >
              <Icon name="store" className="w-3.5 h-3.5 text-[#0f764a]" />
              <span className="hidden sm:inline">{t('admin_visit_store')}</span>
            </a>

            {can('cache.manage') && (
              <button
                type="button"
                onClick={() => clearCache.mutate()}
                disabled={clearCache.isPending}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs transition-colors disabled:opacity-50"
                title={t('admin_clear_cache')}
                aria-label={t('admin_clear_cache')}
              >
                <Icon name="refresh-cw" className={cx('w-4 h-4', clearCache.isPending && 'animate-spin')} />
              </button>
            )}

            <div className="flex items-center gap-2.5 ps-3 border-s border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0f764a] to-[#16a34a] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {initial}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden md:inline">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main id="admin-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <DemoDataNotice pathname={location.pathname} />
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
