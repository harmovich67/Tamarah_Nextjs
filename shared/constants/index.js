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
  READY: 'ready',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

/** Delivery flow (home delivery): pending -> processing -> delivered -> completed */
export const DELIVERY_FLOW = Object.freeze(['pending', 'processing', 'delivered', 'completed']);

/** Branch pickup flow (in case of branch pickup, delivery status is omitted): pending -> processing -> ready -> completed */
export const BRANCH_PICKUP_FLOW = Object.freeze(['pending', 'processing', 'ready', 'completed']);

/** Legacy flow alias for backward compatibility */
export const ORDER_STATUS_FLOW = Object.freeze(['pending', 'processing', 'delivered', 'completed']);

/**
 * Returns the exact NEXT status in turn for an order, based on whether it is branch pickup or delivery.
 * Returns null if the order is already in a final state (completed or cancelled).
 */
export function getNextOrderStatus(current = 'pending', shippingType = 'delivery') {
  if (current === 'completed' || current === 'cancelled') return null;
  const isBranch = shippingType === 'branch_pickup' || shippingType === 'branch';
  const flow = isBranch ? BRANCH_PICKUP_FLOW : DELIVERY_FLOW;
  const idx = flow.indexOf(current);
  if (idx === -1 || idx >= flow.length - 1) return null;
  return flow[idx + 1];
}

/**
 * Returns whether an order can be cancelled:
 * - Allowed in: pending, processing, ready (before it is completed or delivered)
 * - Disallowed in: completed (final, API returns 400), cancelled (already cancelled)
 */
export function canCancelOrder(current = 'pending') {
  return current === 'pending' || current === 'processing' || current === 'ready';
}

/**
 * Allowed statuses for transitions:
 * Only returns the CURRENT status, the single NEXT status on turn, and 'cancelled' (if cancellable).
 */
export function allowedOrderStatuses(current = 'pending', shippingType = 'delivery') {
  if (current === 'completed' || current === 'cancelled') return [current];
  const next = getNextOrderStatus(current, shippingType);
  const result = [current];
  if (next) result.push(next);
  if (canCancelOrder(current)) result.push('cancelled');
  return result;
}

export const ORDER_STATUS_LABELS = Object.freeze({
  pending: { ar: 'بانتظار التأكيد', en: 'Awaiting confirmation' },
  processing: { ar: 'قيد التجهيز', en: 'Preparing' },
  ready: { ar: 'جاهز للاستلام من الفرع', en: 'Ready for pickup' },
  delivered: { ar: 'تم التوصيل للعميل', en: 'Delivered' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  shipped: { ar: 'تم التوصيل للعميل', en: 'Delivered' },
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
