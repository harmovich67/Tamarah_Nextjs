/**
 * Sidebar structure (resources/views/layouts/admin.php). `permission` hides entries the user cannot open (UX
 * only); `external: 'storefront'` links to the public site. Entries marked `extra` exist in the PHP routes but
 * were not linked from the legacy sidebar; they are listed so every migrated screen stays reachable.
 *
 * Production (laravel mode) rules, applied by AdminLayout:
 *   backend    the entry keeps its place but opens the screen that holds the real backend data: { to, label, icon?, permission? }
 *   localOnly  the backend has no API for this screen, so it only works on browser demo data: hidden in laravel mode
 *   backendOnly (group)  screens that exist only in the Tamrna backend: shown in laravel mode only
 */
const BACKEND = 'resources.view';

/** Screens of the Tamrna backend that have no counterpart in the mock database: shown in laravel mode only. */
const BACKEND_NAV = {
  title: ['بيانات المتجر (الباك اند)', 'Store data (backend)'],
  backendOnly: true,
  items: [
    { to: '/clients', icon: 'users', label: ['العملاء', 'Clients'], permission: BACKEND },
    { to: '/reviews', icon: 'star', label: ['التقييمات', 'Reviews'], permission: BACKEND },
    { to: '/gift-cards', icon: 'gift', label: ['بطاقات الهدايا', 'Gift cards'], permission: BACKEND },
    { to: '/branches', icon: 'store', label: ['الفروع', 'Branches'], permission: BACKEND },
    { to: '/features', icon: 'sparkles', label: ['المميزات', 'Features'], permission: BACKEND },
    { to: '/system-numbers', icon: 'hash', label: ['أرقام النظام', 'System numbers'], permission: BACKEND },
    { to: '/notifications', icon: 'bell', label: ['إرسال الإشعارات', 'Send notifications'], permission: BACKEND },
    { to: '/contacts', icon: 'mail', label: ['رسائل التواصل', 'Contact messages'], permission: BACKEND },
    { to: '/roles', icon: 'shield-check', label: ['الأدوار والصلاحيات', 'Roles & permissions'], permission: BACKEND },
  ],
};

export const NAV = [
  { items: [{ to: '/', icon: 'layout-dashboard', labelKey: 'admin_dashboard', permission: 'dashboard.view', end: true }] },
  {
    titleKey: 'admin_nav_store_mgmt',
    items: [
      { to: '/products', icon: 'box', labelKey: 'admin_nav_products', permission: 'products.view' },
      { to: '/categories', icon: 'tags', labelKey: 'admin_nav_categories', permission: 'categories.view' },
      { to: '/warehouses', icon: 'snowflake', label: ['المستودعات المبردة', 'Cold storages'], permission: 'warehouses.view', extra: true, localOnly: true },
      { to: '/orders', icon: 'truck', labelKey: 'admin_nav_orders', permission: 'orders.view' },
      { to: '/coupons', icon: 'ticket', labelKey: 'admin_nav_coupons', permission: 'coupons.view', localOnly: true },
      // Shipping areas = the cities the backend delivers to (with the private delivery switch).
      { to: '/shipping-zones', icon: 'map-pin', labelKey: 'admin_nav_shipping', permission: 'shipping.view', backend: { to: '/cities', label: ['مناطق الشحن (المدن)', 'Shipping areas (cities)'], permission: BACKEND } },
      { to: '/settings', icon: 'credit-card', labelKey: 'admin_nav_payments', permission: 'payments.view', localOnly: true },
      { external: 'storefront', href: '/gift-cards', icon: 'gift', labelKey: 'admin_nav_gift_cards', mockOnly: true },
    ],
  },
  {
    titleKey: 'admin_nav_branding',
    items: [
      // In production this screen manages the hero banners (the only homepage block the backend serves as editable slides).
      { to: '/home-sections', icon: 'layout-panel-top', labelKey: 'admin_nav_home_sections', permission: 'home_sections.view' },
      { to: '/menus', icon: 'list', label: ['القوائم', 'Menus'], permission: 'menus.view', extra: true, localOnly: true },
      // Store settings = contact details and switches of the backend (`/admin/settings`).
      { to: '/site-settings', icon: 'settings', labelKey: 'admin_nav_site_settings', permission: 'site_settings.view', backend: { to: '/store-settings', label: ['إعدادات الموقع', 'Site settings'], permission: BACKEND } },
      // The About page is built from the backend content sections (story, future, commitment).
      { to: '/pages', icon: 'file-text', labelKey: 'admin_nav_pages', permission: 'pages.view', backend: { to: '/sections', label: ['محتوى من نحن', 'About page content'], permission: BACKEND } },
      { to: '/posts', icon: 'newspaper', label: ['المنشورات', 'Posts'], permission: 'posts.view', extra: true, localOnly: true },
      { to: '/custom-fields', icon: 'folder-code', label: ['الحقول المخصصة', 'Custom fields'], permission: 'custom_fields.view', extra: true, localOnly: true },
    ],
  },
  {
    titleKey: 'admin_nav_users_section',
    items: [
      { to: '/users', icon: 'users', labelKey: 'admin_nav_users', permission: 'users.view' },
      { to: '/translations', icon: 'languages', labelKey: 'admin_nav_translations', permission: 'translations.view', localOnly: true },
      { to: '/cache', icon: 'zap', labelKey: 'admin_nav_cache', permission: 'cache.manage', localOnly: true },
      { to: '/logs', icon: 'history', labelKey: 'admin_nav_logs', permission: 'logs.view', extra: true, localOnly: true },
      { to: '/security', icon: 'shield', labelKey: 'admin_nav_security', permission: 'security.view', localOnly: true },
      { to: '/backup', icon: 'database', labelKey: 'admin_nav_backup', permission: 'backup.view', localOnly: true },
    ],
  },
  BACKEND_NAV,
];

/** Legacy demo routes whose data now lives on a backend screen (production mode redirects them). */
export const BACKEND_REDIRECTS = Object.fromEntries(
  NAV.flatMap((g) => g.items).filter((i) => i.backend).map((i) => [i.to.replace(/^\//, ''), i.backend.to]),
);

/** The entries of a group as the sidebar shows them for the current mode. */
export function visibleItems(group, { laravel, can }) {
  if (group.backendOnly && !laravel) return [];
  return group.items
    .filter((i) => !(laravel && (i.mockOnly || i.localOnly)))
    .map((i) => (laravel && i.backend ? { ...i, ...i.backend, labelKey: undefined, backend: undefined } : i))
    .filter((i) => !i.permission || can(i.permission));
}
