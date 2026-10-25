import { ApiError, ERROR_CODES, safeStorage } from '@tamrna/shared/api';
import { cleanSaudiPhone, randomToken } from '@tamrna/shared/utils';
import { apiClient as api } from '@/lib/apiClient';
import { getClientLocale } from '@/lib/locale-client';
import { getStoredUser } from '@/lib/session';

/** Helpers shared by the Tamrna backend adapters (auth, account, checkout). */

export { api };
export const unwrap = (res) => (res && typeof res === 'object' && !Array.isArray(res) && 'data' in res ? res.data : res);
export const t = (ar, en) => (getClientLocale() === 'en' ? en : ar);
export const inLang = (lang) => ({ headers: { 'Accept-Language': lang } });

export const unsupported = (message) => new ApiError({ status: 400, code: ERROR_CODES.HTTP, message, data: { success: false, message } });
export const notFound = (message) => new ApiError({ status: 404, code: ERROR_CODES.NOT_FOUND, message, data: { success: false, message } });
export const needsLogin = () =>
  new ApiError({ status: 401, code: ERROR_CODES.SESSION_EXPIRED, message: t('يرجى تسجيل الدخول لإتمام العملية', 'Please sign in to continue'), data: { success: false } });

/** First defined, non-empty value among the dotted `keys` of `obj`. */
export function pick(obj, keys, fallback = undefined) {
  for (const k of keys) {
    const v = k.split('.').reduce((o, part) => (o === null || o === undefined ? undefined : o[part]), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}
export const num = (obj, keys) => Number(pick(obj, keys, 0)) || 0;
export const text = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.name ?? v.title ?? '' : v == null ? '' : String(v));

export const rowsOf = (res) => {
  const d = unwrap(res);
  if (Array.isArray(d)) return d;
  return d?.data ?? d?.items ?? d?.results ?? [];
};

/** `0555123456` / `+966555123456` -> `555123456` (the backend takes the number without the leading 0 + `phone_code`). */
export const localPhone = (phone) => cleanSaudiPhone(phone).replace(/^0/, '');
export const PHONE_CODE = '966';

const GUEST_KEY = 'tamrna.web.guest_token';
/** Same token the cart adapter uses, so a guest cart can be merged into the account on login. */
export function guestToken() {
  let token = safeStorage.get(GUEST_KEY);
  if (!token) {
    token = randomToken(16);
    safeStorage.set(GUEST_KEY, token);
  }
  return token;
}

export const currentUserId = () => getStoredUser()?.id ?? null;

/** A multipart body from a plain object (nulls skipped, booleans as 1 / 0). */
export function form(values) {
  const body = new FormData();
  Object.entries(values || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    body.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  });
  return body;
}

/** The storefront user the screens expect, from whatever the backend returns for a client. */
export function toUser(raw, fallback = {}) {
  const r = raw?.user ?? raw?.client ?? raw?.profile ?? raw ?? {};
  const first = r.first_name ?? '';
  const last = r.last_name ?? '';
  const name = r.full_name || r.name || [first, last].filter(Boolean).join(' ') || fallback.name || '';
  const phone = r.phone ? `0${String(r.phone).replace(/^0/, '')}` : fallback.phone || '';
  return {
    id: r.id ?? fallback.id ?? 0,
    name,
    first_name: first,
    last_name: last,
    email: r.email ?? fallback.email ?? '',
    phone,
    status: 'active',
    phone_verified: r.phone_verified_at || r.is_verified ? 1 : 0,
    role_name: 'customer',
  };
}

/** The backend answers 401 for an expired token; a stale mock-mode user must not survive that. */
export const requireUser = () => {
  if (!getStoredUser()) throw needsLogin();
};

/**
 * Backend order status -> the five shipping statuses of the storefront screens. Seen on the live server: pending ->
 * processing (process) -> ready (branch pickup only) / deleveried (sic, "deliver") -> completed; cancelled.
 */
export const ORDER_STATUSES = ['pending', 'processing', 'ready', 'deleveried', 'delivered', 'completed', 'cancelled'];
const STATUS_IN = {
  pending: 'pending',
  new: 'pending',
  processing: 'processing',
  preparing: 'processing',
  ready: 'shipped',
  delivering: 'shipped',
  shipped: 'shipped',
  out_for_delivery: 'shipped',
  deleveried: 'shipped',
  delivered: 'shipped',
  completed: 'delivered',
  complete: 'delivered',
  canceled: 'cancelled',
  cancelled: 'cancelled',
};
export const shippingStatusOf = (o) => STATUS_IN[String(pick(o, ['status', 'order_status'], 'pending')).toLowerCase()] ?? 'pending';

/** Product thumbnail from a media object, a path or an id-less placeholder. */
export const imageOf = (m) => {
  const p = typeof m === 'string' ? m : m?.path || m?.url || '';
  return !p || /\/assets\/images\/[\w-]+\.png$/.test(p) ? '' : p;
};

const weightLabel = (v) => (v?.weight === undefined || v?.weight === null ? '' : `${Number(v.weight)} ${{ g: 'جرام', kg: 'كجم', t: 'طن' }[v.weight_unit] ?? v.weight_unit ?? ''}`.trim());

export function toOrderItem(i, idx) {
  const product = i.product ?? {};
  const variant = i.variant ?? i.product_variant ?? {};
  const qty = num(i, ['quantity', 'qty']);
  const unit = num(i, ['price', 'unit_price']) || num(variant, ['effective_price', 'base_price']);
  const img = imageOf(product.gallery?.length ? product.gallery[0] : product.image);
  return {
    id: i.id ?? idx,
    product_id: product.id ?? i.product_id ?? null,
    product_name: text(product.name ?? i.product_name ?? i.name),
    size_name: weightLabel(variant) || i.size_name || '',
    unit_price: unit,
    price: unit,
    quantity: qty,
    subtotal: num(i, ['total_amount', 'total', 'subtotal']) || unit * qty,
    featured_image: img,
    product_image: img,
    slug: product.id ? String(product.id) : undefined,
  };
}

export function toOrder(o) {
  const items = pick(o, ['items', 'order_items', 'products'], []).map(toOrderItem);
  const addr = pick(o, ['address', 'shipping_address'], {});
  const delivery = String(pick(o, ['delivery_type', 'shipping_type'], 'delivery'));
  const city = text(pick(addr, ['city', 'city_name'], '') || pick(o, ['city'], ''));
  const line = typeof addr === 'string' ? addr : [addr.street, addr.district, addr.national_address].filter(Boolean).join('، ');
  const order = {
    id: o.id,
    order_number: String(pick(o, ['order_number', 'number', 'code', 'id'], '')),
    created_at: String(pick(o, ['created_at', 'date'], '')),
    customer_name: text(pick(o, ['client.full_name', 'client.name', 'customer_name'], '')),
    customer_phone: String(pick(o, ['client.phone', 'customer_phone'], '')),
    customer_email: pick(o, ['client.email', 'customer_email'], ''),
    shipping_address: line,
    city,
    governorate: city,
    district: typeof addr === 'object' ? addr.district || '' : '',
    shipping_type: delivery === 'branch' ? 'branch_pickup' : 'home_delivery',
    subtotal: num(o, ['total_items_price', 'subtotal', 'sub_total', 'items_total']),
    shipping_fee: num(o, ['shipping_fee', 'delivery_fee', 'shipping_cost', 'delivery_price']),
    discount: num(o, ['discount', 'discount_amount', 'gift_card_discount']),
    total: num(o, ['total', 'grand_total', 'total_price', 'amount']),
    payment_method: String(pick(o, ['payment_method', 'payment.method'], 'cod')),
    payment_status: String(pick(o, ['payment_status'], 'pending')).toLowerCase(),
    shipping_status: shippingStatusOf(o),
    notes: pick(o, ['notes', 'note'], ''),
    items_count: items.length || num(o, ['items_count']),
    products_snippet: items.map((i) => i.product_name).filter(Boolean).join(' • '),
  };
  return { order, items };
}
