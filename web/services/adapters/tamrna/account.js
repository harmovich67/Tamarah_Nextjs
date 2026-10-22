import { safeStorage } from '@tamrna/shared/api';
import { getStoredUser } from '@/lib/session';
import { api, form, localPhone, notFound, num, PHONE_CODE, pick, requireUser, rowsOf, t, text, toOrder, toUser, unsupported, unwrap } from './http';

/**
 * Customer account against the Tamrna backend: profile (`/client/profile`), addresses (`/client/addresses`), orders
 * (`/client/orders`), favourites (`/client/favorites`), reviews (`/client/reviews`) and notifications
 * (`/general/notifications`). Every function returns the shape of adapters/mock/account.js. The collection has no response
 * examples, so fields are read through candidate lists (`pick`) — compare with the real JSON if a screen shows blanks.
 */

// -------------------------------------------------------------------------------------------------------- cities
let citiesPromise = null;
/** `GET /general/cities` is public. The backend lists some cities twice (different ids): keep the first of each name. */
export function loadCities() {
  if (!citiesPromise) {
    citiesPromise = api
      .get('/general/cities')
      .then((res) => {
        const seen = new Set();
        return rowsOf(res)
          .map((c) => ({ id: c.id, name: String(c.name ?? '').trim() }))
          .filter((c) => c.name && !seen.has(c.name) && seen.add(c.name));
      })
      .catch((error) => {
        citiesPromise = null;
        throw error;
      });
  }
  return citiesPromise;
}

const cityNames = (cities) => cities.map((c) => c.name);
export const zonesOf = (cities) =>
  cities.map((c) => ({ id: c.id, city_name_ar: c.name, city_name_en: c.name, shipping_fee: 0, estimated_delivery: '', is_cold_shipping: 1, is_active: 1 }));

async function cityId(name) {
  const cities = await loadCities();
  const wanted = String(name || '').trim();
  const found = cities.find((c) => c.name === wanted) ?? (cities.length === 1 ? cities[0] : null);
  if (!found) throw notFound(t('المدينة غير موجودة', 'City not found'));
  return found.id;
}

// ------------------------------------------------------------------------------------------------------- profile
const splitName = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
};

async function profile() {
  return toUser(unwrap(await api.get('/client/profile')), getStoredUser() || {});
}

export async function updateInfo({ name, email, phone }) {
  const stored = getStoredUser() || {};
  const body = form({
    ...splitName(name),
    email: String(email || '').trim() || undefined,
    phone: String(phone || '').trim() ? localPhone(phone) : undefined,
    phone_code: PHONE_CODE,
    _method: 'put',
  });
  const res = unwrap(await api.post('/client/profile', body));
  return toUser(res && typeof res === 'object' ? res : {}, { ...stored, name: String(name).trim(), email, phone });
}

export async function changePassword({ currentPassword, password }) {
  await api.post('/client/profile/update-password', form({ _method: 'put', current_password: currentPassword, password, password_confirmation: password }));
  return { success: true };
}

// ----------------------------------------------------------------------------------------------------- addresses
const cityOfAddress = (a) => text(pick(a, ['city', 'city_name'], ''));

/** Backend address -> the screens' address. The form's building / landmark are kept in `national_address` / `district`. */
function toAddress(a, user) {
  const street = a.street ?? '';
  return {
    id: a.id,
    title: t('المنزل', 'Home'),
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    city: cityOfAddress(a),
    governorate: cityOfAddress(a),
    district: a.district ?? '',
    street_address: street,
    building_floor: a.national_address ?? '',
    landmark: a.district ?? '',
    address: [street, a.district, a.national_address].filter(Boolean).join(' - '),
    is_default: a.is_default ? 1 : 0,
  };
}

async function addressRows() {
  const user = getStoredUser();
  const rows = rowsOf(await api.get('/client/addresses')).map((a) => toAddress(a, user));
  return rows.sort((a, b) => b.is_default - a.is_default || b.id - a.id);
}
export { addressRows as savedAddresses };

export async function listAddresses() {
  requireUser();
  const [addresses, cities] = await Promise.all([addressRows(), loadCities()]);
  return { addresses, cities: cityNames(cities), zones: zonesOf(cities), limits: { allowMultiple: true, max: 10 } };
}

/** @param {object} input id? city street_address building_floor landmark is_default */
export async function saveAddress(input) {
  requireUser();
  const street = String(input.street_address || '').trim();
  const body = form({
    city_id: await cityId(input.city),
    street,
    national_address: String(input.building_floor || '').trim() || street,
    district: String(input.landmark || '').trim() || undefined,
    is_default: !!input.is_default,
    _method: input.id ? 'put' : undefined,
  });
  const res = unwrap(await api.post(input.id ? `/client/addresses/${input.id}` : '/client/addresses', body));
  return toAddress(res && typeof res === 'object' ? res : { id: input.id }, getStoredUser());
}

export async function deleteAddress(id) {
  requireUser();
  await api.delete(`/client/addresses/${id}`);
  return { success: true };
}

export async function setDefaultAddress(id) {
  requireUser();
  await api.post(`/client/addresses/${id}/set-default`);
  return { success: true };
}

// -------------------------------------------------------------------------------------------------------- orders
/** All of the customer's orders (the list endpoint filters by `?status=`; without it every status comes back). */
async function orderRows() {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const res = await api.get('/client/orders', { page, per_page: 100 });
    const got = rowsOf(res);
    rows.push(...got);
    if (!got.length || page >= (res?.meta?.last_page ?? res?.data?.meta?.last_page ?? 1)) break;
  }
  return rows.map(toOrder).sort((a, b) => b.order.id - a.order.id);
}
export { orderRows as customerOrders };

export async function listOrders() {
  requireUser();
  const all = await orderRows();
  return { orders: all.map((o) => o.order), orderItems: Object.fromEntries(all.map((o) => [o.order.id, o.items])) };
}

export async function getOrder(orderNumber) {
  requireUser();
  const found = (await orderRows()).find((o) => o.order.order_number === String(orderNumber) || String(o.order.id) === String(orderNumber));
  if (!found) throw notFound(t('الطلب غير موجود', 'Order not found'));
  // The backend has no customer-side cancel endpoint.
  return { ...found, settings: { allow_customer_order_cancellation: false } };
}

export async function cancelOrder() {
  throw unsupported(t('إلغاء الطلب غير متاح حالياً. تواصل مع خدمة العملاء.', 'Cancelling an order is not available. Please contact customer care.'));
}

/** `POST /client/reviews { order_id, rate, comment }` (an order can be reviewed once it is completed). */
export async function submitReview({ orderId, rate, comment }) {
  requireUser();
  await api.post('/client/reviews', form({ order_id: orderId, rate, comment }));
  return { success: true };
}

// -------------------------------------------------------------------------------------------------- overview etc.
export async function getOverview() {
  requireUser();
  const [user, addresses, orders] = await Promise.all([profile().catch(() => getStoredUser()), addressRows(), orderRows()]);
  const recent = orders.slice(0, 3);
  return {
    user,
    ordersCount: orders.length,
    addressesCount: addresses.length,
    addresses,
    defaultAddress: addresses.find((a) => a.is_default) || null,
    recentOrders: recent.map((o) => o.order),
    recentOrderItems: Object.fromEntries(recent.map((o) => [o.order.id, o.items])),
  };
}

/** `GET /client/my-gift-cards` -> the screen's gift cards (code, amount, balance, status...). */
export async function listGiftCards() {
  requireUser();
  return rowsOf(await api.get('/client/my-gift-cards')).map((g) => ({
    id: g.id,
    code: String(pick(g, ['code', 'gift_card_code'], '')),
    card_type: pick(g, ['redemption_type', 'card_type', 'type'], 'digital') === 'printed' ? 'printed' : 'digital',
    amount: num(g, ['amount', 'gift_card.amount']),
    balance: num(g, ['balance', 'remaining_amount', 'amount']),
    status: String(pick(g, ['status'], 'active')).toLowerCase(),
    sender_name: text(pick(g, ['sender_name'], '')),
    recipient_name: text(pick(g, ['recipient_name'], '')),
    message: pick(g, ['message'], ''),
    created_at: String(pick(g, ['created_at'], '')),
  }));
}

// ---------------------------------------------------------------------------------------------------- notifications
const NOTIF_HEADERS = { headers: { 'user-type': 'client' } };

function toNotification(n) {
  const data = n.data && typeof n.data === 'object' ? n.data : {};
  return {
    id: n.id,
    title: text(pick(n, ['title', 'data.title'], '')),
    title_en: text(pick(n, ['title_en', 'data.title_en', 'title'], '')),
    body: text(pick(n, ['body', 'message', 'content', 'data.body', 'data.message'], '')),
    body_en: text(pick(n, ['body_en', 'message_en', 'data.body_en', 'body', 'message'], '')),
    created_at: String(pick(n, ['created_at'], '')).slice(0, 10),
    is_read: !!(n.read_at || n.is_read || data.is_read),
  };
}

export async function listNotifications() {
  requireUser();
  return rowsOf(await api.get('/general/notifications', undefined, NOTIF_HEADERS)).map(toNotification);
}

/** The collection only has "read all" (`PUT /general/notifications`): reading one marks them all. */
export async function markAllNotificationsRead() {
  await api.post('/general/notifications', form({ _method: 'put' }), NOTIF_HEADERS);
  return { success: true };
}
export const markNotificationRead = () => markAllNotificationsRead();

// ------------------------------------------------------------------------------------------------------ preferences
// No endpoint: kept in this browser, as in the mock.
const PREFS_KEY = 'tamrna.web.account_settings';
export async function getPreferences() {
  requireUser();
  return safeStorage.getJson(PREFS_KEY, { orders: true, gifts: true, marketing: false });
}
export async function savePreferences(prefs) {
  requireUser();
  safeStorage.setJson(PREFS_KEY, { orders: !!prefs.orders, gifts: !!prefs.gifts, marketing: !!prefs.marketing });
  return { success: true };
}

// ---------------------------------------------------------------------------------------------------------- wishlist
/** Favourite product ids (`GET /client/favorites`: a list of products, or of rows holding the product). */
export async function getWishlistIds() {
  if (!getStoredUser()) return [];
  try {
    return rowsOf(await api.get('/client/favorites')).map((r) => Number(r.product?.id ?? r.product_id ?? r.id)).filter(Number.isFinite);
  } catch {
    return [];
  }
}

export async function toggleWishlist(productId) {
  if (!getStoredUser()) {
    return {
      requires_login: true,
      message: t('يرجى تسجيل الدخول أو إنشاء حساب لإضافة المنتجات إلى المفضلة.', 'Please sign in or create an account to save dates to your wishlist.'),
    };
  }
  await api.post(`/client/favorites/${productId}/toggle`);
  const ids = await getWishlistIds();
  const inWishlist = ids.includes(Number(productId));
  return {
    in_wishlist: inWishlist,
    count: ids.length,
    message: inWishlist ? t('تمت إضافة المنتج إلى المفضلة', 'Item added to your wishlist') : t('تمت إزالة المنتج من المفضلة', 'Item removed from your wishlist'),
  };
}

