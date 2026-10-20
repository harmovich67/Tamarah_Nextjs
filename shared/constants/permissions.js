/**
 * Frontend permission map (UX only — the Laravel backend is authoritative).
 *
 * Each permission lists the minimum role required, derived from the legacy PHP route middleware:
 *   ['store_manager']  -> store managers and super admins
 *   ['super_admin']    -> super admins only
 */

/** @type {Record<string, 'store_manager' | 'super_admin'>} */
export const PERMISSIONS = Object.freeze({
  'dashboard.view': 'store_manager',

  'warehouses.view': 'store_manager',
  'warehouses.create': 'store_manager',
  'warehouses.edit': 'store_manager',
  'warehouses.delete': 'super_admin',

  'categories.view': 'store_manager',
  'categories.create': 'store_manager',
  'categories.edit': 'store_manager',
  'categories.delete': 'super_admin',

  'products.view': 'store_manager',
  'products.create': 'store_manager',
  'products.edit': 'store_manager',
  'products.delete': 'store_manager',
  'stock.update': 'store_manager',

  // Tamrna backend resources (gift cards, features, branches, cities, clients, reviews...): laravel mode only.
  'resources.view': 'store_manager',
  'resources.manage': 'store_manager',

  'orders.view': 'store_manager',
  'orders.update': 'store_manager',
  'orders.waybill': 'store_manager',

  'users.view': 'super_admin',
  'users.create': 'super_admin',
  'users.edit': 'super_admin',
  'users.delete': 'super_admin',

  'payments.view': 'super_admin',
  'payments.edit': 'super_admin',

  'coupons.view': 'super_admin',
  'coupons.create': 'super_admin',
  'coupons.edit': 'super_admin',
  'coupons.delete': 'super_admin',

  'shipping.view': 'super_admin',
  'shipping.create': 'super_admin',
  'shipping.edit': 'super_admin',
  'shipping.delete': 'super_admin',

  'site_settings.view': 'super_admin',
  'site_settings.edit': 'super_admin',

  'translations.view': 'super_admin',
  'translations.edit': 'super_admin',

  'pages.view': 'super_admin',
  'pages.create': 'super_admin',
  'pages.edit': 'super_admin',
  'pages.delete': 'super_admin',

  'custom_fields.view': 'super_admin',
  'custom_fields.create': 'super_admin',
  'custom_fields.edit': 'super_admin',
  'custom_fields.delete': 'super_admin',

  'posts.view': 'super_admin',
  'posts.create': 'super_admin',
  'posts.edit': 'super_admin',
  'posts.delete': 'super_admin',

  'cache.manage': 'super_admin',
  'logs.view': 'super_admin',
  'logs.manage': 'super_admin',
  'security.view': 'super_admin',
  'security.manage': 'super_admin',

  'menus.view': 'super_admin',
  'menus.manage': 'super_admin',
  'banners.view': 'super_admin',
  'banners.manage': 'super_admin',
  'home_sections.view': 'super_admin',
  'home_sections.manage': 'super_admin',

  'backup.view': 'super_admin',
  'backup.manage': 'super_admin',
});

const LEVEL = { customer: 0, store_manager: 1, super_admin: 2 };

/**
 * @param {{ role_name?: string, role?: string } | null | undefined} user
 * @param {string} permission
 * @returns {boolean}
 */
export function can(user, permission) {
  if (!user) return false;
  const role = user.role_name || user.role;
  if (user.status && user.status !== 'active') return false;
  const required = PERMISSIONS[permission];
  if (!required) return false;
  return (LEVEL[role] ?? -1) >= LEVEL[required];
}

/** @param {object|null} user @param {string[]} permissions */
export const canAny = (user, permissions) => permissions.some((p) => can(user, p));
/** @param {object|null} user @param {string[]} permissions */
export const canAll = (user, permissions) => permissions.every((p) => can(user, p));

/** @param {string} role */
export function permissionsForRole(role) {
  return Object.keys(PERMISSIONS).filter((p) => can({ role_name: role }, p));
}
