/**
 * Constants shared by the storefront and the dashboard.
 * Everything here mirrors a value that already existed in the legacy PHP application.
 */

export const LOCALES = ['ar', 'en'];
export const DEFAULT_LOCALE = 'ar';
export const LOCALE_COOKIE = 'tamrna_locale';
export const ADMIN_LOCALE_STORAGE_KEY = 'tamrna_admin_locale';

/** @param {string} locale */
export const isRtl = (locale) => locale === 'ar';
/** @param {string} locale */
export const dirOf = (locale) => (isRtl(locale) ? 'rtl' : 'ltr');

/** API adapter selection. Frontends read API_MODE (NEXT_PUBLIC_API_MODE / VITE_API_MODE). */
export const API_MODES = Object.freeze({ MOCK: 'mock', LARAVEL: 'laravel' });

/**
 * How the Laravel backend authenticates the SPA.
 *  - "token":  Laravel API tokens / Sanctum personal access tokens (Authorization: Bearer)
 *  - "cookie": Laravel Sanctum SPA cookie session (CSRF cookie + credentials: include)
 */
export const AUTH_STRATEGIES = Object.freeze({ TOKEN: 'token', COOKIE: 'cookie' });

/** Role names and ids, as seeded by the legacy `roles` table. */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  STORE_MANAGER: 'store_manager',
  CUSTOMER: 'customer',
});
export const ROLE_IDS = Object.freeze({ super_admin: 1, store_manager: 2, customer: 3 });
/** Higher number = more access (legacy middleware: store_manager routes also allow super_admin). */
export const ROLE_LEVEL = Object.freeze({ customer: 0, store_manager: 1, super_admin: 2 });

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

export const ORDER_STATUS_LABELS = Object.freeze({
  pending: { ar: 'بانتظار التأكيد', en: 'Awaiting confirmation' },
  processing: { ar: 'قيد التجهيز', en: 'Preparing' },
  shipped: { ar: 'تم الشحن وجاري التوصيل', en: 'Shipped' },
  delivered: { ar: 'مكتمل / تم التوصيل', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
});

export const PAYMENT_STATUS = Object.freeze({ PENDING: 'pending', PAID: 'paid', FAILED: 'failed', REFUNDED: 'refunded' });

export const PAYMENT_METHODS = Object.freeze([
  'mada',
  'apple_pay',
  'credit_card',
  'paymob',
  'tabby',
  'tamara',
  'cod',
  'bank_transfer',
]);

export const GIFT_CARD = Object.freeze({
  MIN_AMOUNT: 50,
  MAX_AMOUNT: 5000,
  PRESET_AMOUNTS: [100, 200, 300, 500, 1000],
  TYPES: ['digital', 'printed'],
});

export const CATALOG_SORTS = Object.freeze(['featured', 'bestseller', 'rating', 'price_desc', 'price_asc']);
export const AVAILABILITY_FILTERS = Object.freeze(['available', 'preorder', 'out_of_stock']);

export const OTP = Object.freeze({ LENGTH: 6, TTL_MINUTES: 5, RESEND_SECONDS: 60, DEMO_CODE: '123456' });

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 300;
export const DEFAULT_STANDARD_SHIPPING_FEE = 25;
export const VAT_RATE = 0.15;

export { PERMISSIONS, can, canAny, canAll, permissionsForRole } from './permissions.js';
