/**
 * Sidebar structure (resources/views/layouts/admin.php). `permission` hides entries the user cannot open (UX
 * only); `external: 'storefront'` links to the public site. Entries marked `extra` exist in the PHP routes but
 * were not linked from the legacy sidebar; they are listed so every migrated screen stays reachable.
 */
export const NAV = [
  { items: [{ to: '/', icon: 'layout-dashboard', labelKey: 'admin_dashboard', permission: 'dashboard.view', end: true }] },
  {
    titleKey: 'admin_nav_store_mgmt',
    items: [
      { to: '/products', icon: 'box', labelKey: 'admin_nav_products', permission: 'products.view' },
      { to: '/categories', icon: 'tags', labelKey: 'admin_nav_categories', permission: 'categories.view' },
      { to: '/warehouses', icon: 'snowflake', label: ['المستودعات المبردة', 'Cold storages'], permission: 'warehouses.view', extra: true },
      { to: '/orders', icon: 'truck', labelKey: 'admin_nav_orders', permission: 'orders.view' },
      { to: '/coupons', icon: 'ticket', labelKey: 'admin_nav_coupons', permission: 'coupons.view' },
      { to: '/shipping-zones', icon: 'map-pin', labelKey: 'admin_nav_shipping', permission: 'shipping.view' },
      { to: '/settings', icon: 'credit-card', labelKey: 'admin_nav_payments', permission: 'payments.view' },
      { external: 'storefront', href: '/gift-cards', icon: 'gift', labelKey: 'admin_nav_gift_cards' },
    ],
  },
  {
    titleKey: 'admin_nav_branding',
    items: [
      { to: '/home-sections', icon: 'layout-panel-top', labelKey: 'admin_nav_home_sections', permission: 'home_sections.view' },
      { to: '/menus', icon: 'list', label: ['القوائم', 'Menus'], permission: 'menus.view', extra: true },
      { to: '/site-settings', icon: 'settings', labelKey: 'admin_nav_site_settings', permission: 'site_settings.view' },
      { to: '/pages', icon: 'file-text', labelKey: 'admin_nav_pages', permission: 'pages.view' },
      { to: '/posts', icon: 'newspaper', label: ['المنشورات', 'Posts'], permission: 'posts.view', extra: true },
      { to: '/custom-fields', icon: 'folder-code', label: ['الحقول المخصصة', 'Custom fields'], permission: 'custom_fields.view', extra: true },
    ],
  },
  {
    titleKey: 'admin_nav_users_section',
    items: [
      { to: '/users', icon: 'users', labelKey: 'admin_nav_users', permission: 'users.view' },
      { to: '/translations', icon: 'languages', labelKey: 'admin_nav_translations', permission: 'translations.view' },
      { to: '/cache', icon: 'zap', labelKey: 'admin_nav_cache', permission: 'cache.manage' },
      { to: '/logs', icon: 'history', labelKey: 'admin_nav_logs', permission: 'logs.view', extra: true },
      { to: '/security', icon: 'shield', labelKey: 'admin_nav_security', permission: 'security.view' },
      { to: '/backup', icon: 'database', labelKey: 'admin_nav_backup', permission: 'backup.view' },
    ],
  },
];
