import { safeStorage } from '@tamrna/shared/api';
import { cleanSaudiPhone } from '@tamrna/shared/utils';
import { getClientLocale } from '@/lib/locale-client';
import { getStoredUser } from '@/lib/session';
import { db, latency, fail } from './db';
import { publicUser } from './auth';

/**
 * Mock account adapter: profile, orders, addresses, gift cards, notifications, preferences and the wishlist.
 * Ports ProfileController + the wishlist endpoints of PageController.
 */

const t = (ar, en) => (getClientLocale() === 'en' ? en : ar);

function requireUser() {
  const user = getStoredUser();
  if (!user) fail(t('انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد.', 'Your session has expired. Please sign in again.'), 401);
  return db.find('users', user.id) || fail(t('الحساب غير موجود', 'Account not found'), 401);
}

const ownsOrder = (o, u) => o.user_id === u.id || o.customer_phone === u.phone || (o.customer_email && o.customer_email === u.email);

function userOrders(u) {
  return db.all('orders').filter((o) => ownsOrder(o, u)).sort((a, b) => b.id - a.id);
}

const itemsOf = (orderId) =>
  db.where('order_items', (i) => i.order_id === orderId).map((i) => {
    const p = i.product_id ? db.find('products', i.product_id) : null;
    return { ...i, price: i.price ?? i.unit_price, featured_image: p?.featured_image, product_image: p?.featured_image, slug: p?.slug };
  });

export async function getOverview() {
  await latency(120);
  const u = requireUser();
  const orders = userOrders(u);
  const addresses = db.where('user_addresses', (a) => a.user_id === u.id).sort((a, b) => b.is_default - a.is_default || b.id - a.id);
  return {
    user: publicUser(u),
    ordersCount: orders.length,
    addressesCount: addresses.length,
    addresses,
    defaultAddress: addresses.find((a) => a.is_default) || null,
    recentOrders: orders.slice(0, 3).map((o) => ({ ...o, items_count: itemsOf(o.id).length })),
    recentOrderItems: Object.fromEntries(orders.slice(0, 3).map((o) => [o.id, itemsOf(o.id)])),
  };
}

export async function updateInfo({ name, email, phone }) {
  await latency(250);
  const u = requireUser();
  if (!String(name || '').trim()) fail(t('الاسم مطلوب', 'Name is required'), 422, { name: [t('الاسم مطلوب', 'Name is required')] });
  const mail = String(email || '').trim();
  if (mail && mail !== u.email && db.all('users').find((x) => x.id !== u.id && x.email?.toLowerCase() === mail.toLowerCase())) {
    const m = t('البريد الإلكتروني مسجل بالفعل لمستخدم آخر.', 'This email is already registered to another user.');
    fail(m, 422, { email: [m] });
  }
  const patch = { name: String(name).trim(), email: mail };
  if (String(phone || '').trim()) patch.phone = cleanSaudiPhone(phone);
  return publicUser(db.update('users', u.id, patch));
}

export async function changePassword({ currentPassword, password }) {
  await latency(250);
  const u = requireUser();
  const { MOCK_PASSWORDS } = await import('@tamrna/shared/mocks');
  const current = u.password ?? MOCK_PASSWORDS[u.email];
  if (current !== currentPassword) {
    const m = t('كلمة المرور الحالية غير صحيحة.', 'The current password is incorrect.');
    fail(m, 422, { currentPassword: [m] });
  }
  if (String(password || '').length < 8) {
    const m = t('استخدم كلمة مرور من 8 أحرف على الأقل تشمل حرفًا ورقمًا.', 'Use at least 8 characters including a letter and a number.');
    fail(m, 422, { password: [m] });
  }
  db.update('users', u.id, { password });
  return { success: true };
}

// ---- Addresses ------------------------------------------------------------------------------------------

export async function listAddresses() {
  await latency(100);
  const u = requireUser();
  const addresses = db.where('user_addresses', (a) => a.user_id === u.id).sort((a, b) => b.is_default - a.is_default || b.id - a.id);
  const zones = db.where('shipping_zones', (z) => z.is_active).sort((a, b) => a.city_name_ar.localeCompare(b.city_name_ar, 'ar'));
  const s = db.getSettings();
  return {
    addresses,
    cities: zones.map((z) => z.city_name_ar),
    zones,
    limits: { allowMultiple: String(s.allow_multiple_addresses ?? '1') === '1', max: Number(s.max_addresses_per_user || 10) },
  };
}

export async function saveAddress(input) {
  await latency(250);
  const u = requireUser();
  const phone = cleanSaudiPhone(input.phone || u.phone);
  const city = String(input.city || 'الرياض').trim();
  const street = String(input.street_address || '').trim();
  const recipient = String(input.recipient_name || u.name).trim();
  if (!recipient || !phone || !street || !city) fail(t('يرجى تعبئة الحقول المطلوبة', 'Please fill in the required fields'), 422);
  if (phone.length < 9 || !phone.startsWith('05')) fail(t('رقم الجوال غير صحيح', 'Invalid mobile number'), 422, { phone: [t('رقم الجوال غير صحيح', 'Invalid mobile number')] });

  const mine = db.where('user_addresses', (a) => a.user_id === u.id);
  const s = db.getSettings();
  const allowMultiple = String(s.allow_multiple_addresses ?? '1') === '1';
  const max = Number(s.max_addresses_per_user || 10);
  const editing = input.id ? mine.find((a) => String(a.id) === String(input.id)) : null;
  if (!editing) {
    if (!allowMultiple && mine.length >= 1) fail(t('لا يمكن إضافة أكثر من عنوان واحد.', 'Multiple addresses are not allowed.'));
    if (mine.length >= max) fail(t('وصلت إلى الحد الأقصى للعناوين المسموح بها.', 'You reached the maximum number of addresses.'));
  }
  const isDefault = mine.length === 0 ? true : !!input.is_default;
  if (isDefault) mine.forEach((a) => db.update('user_addresses', a.id, { is_default: 0 }));
  const building = String(input.building_floor || '').trim();
  const landmark = String(input.landmark || '').trim();
  const record = {
    user_id: u.id,
    title: input.title || t('المنزل', 'Home'),
    recipient_name: recipient,
    phone,
    governorate: city,
    city,
    address: `${street}${building ? ` - ${building}` : ''}${landmark ? ` (${landmark})` : ''}`,
    street_address: street,
    building_floor: building,
    landmark,
    is_default: isDefault ? 1 : 0,
  };
  return editing ? db.update('user_addresses', editing.id, record) : db.insert('user_addresses', record);
}

export async function deleteAddress(id) {
  await latency(150);
  const u = requireUser();
  const row = db.all('user_addresses').find((a) => String(a.id) === String(id) && a.user_id === u.id);
  if (row) {
    db.remove('user_addresses', row.id);
    if (row.is_default) {
      const next = db.where('user_addresses', (a) => a.user_id === u.id).sort((a, b) => b.id - a.id)[0];
      if (next) db.update('user_addresses', next.id, { is_default: 1 });
    }
  }
  return { success: true };
}

export async function setDefaultAddress(id) {
  await latency(150);
  const u = requireUser();
  db.where('user_addresses', (a) => a.user_id === u.id).forEach((a) => db.update('user_addresses', a.id, { is_default: String(a.id) === String(id) ? 1 : 0 }));
  return { success: true };
}

// ---- Orders ---------------------------------------------------------------------------------------------

export async function listOrders() {
  await latency(120);
  const u = requireUser();
  const orders = userOrders(u).map((o) => {
    const items = itemsOf(o.id);
    return { ...o, items_count: items.length, products_snippet: items.map((i) => i.product_name).join(' • ') };
  });
  return { orders, orderItems: Object.fromEntries(orders.map((o) => [o.id, itemsOf(o.id)])) };
}

export async function getOrder(orderNumber) {
  await latency(100);
  const u = requireUser();
  const order = db.all('orders').find((o) => o.order_number === orderNumber && ownsOrder(o, u));
  if (!order) fail(t('الطلب غير موجود', 'Order not found'), 404);
  return {
    order,
    items: itemsOf(order.id),
    settings: { allow_customer_order_cancellation: String(db.getSetting('allow_customer_order_cancellation', '1')) === '1', ...db.getSettings() },
  };
}

export async function cancelOrder(orderNumber) {
  await latency(250);
  const u = requireUser();
  if (String(db.getSetting('allow_customer_order_cancellation', '1')) !== '1') {
    fail(t('لا يمكن إلغاء الطلب في الوقت الحالي', 'Orders cannot be cancelled right now'), 409);
  }
  const order = db.all('orders').find((o) => o.order_number === orderNumber && ownsOrder(o, u));
  if (!order) fail(t('الطلب غير موجود', 'Order not found'), 404);
  if (['pending', 'قيد المراجعة', ''].includes(String(order.shipping_status).toLowerCase()) && order.payment_status !== 'paid') {
    return db.update('orders', order.id, { shipping_status: 'cancelled' });
  }
  return fail(t('لا يمكن إلغاء هذا الطلب بعد بدء معالجته', 'This order can no longer be cancelled'), 409);
}

// ---- Gift cards / notifications / preferences -----------------------------------------------------------

export async function listGiftCards() {
  await latency(100);
  const u = requireUser();
  const cards = db
    .all('gift_cards')
    .filter((g) => g.recipient_email === u.email || g.recipient_phone === u.phone || g.sender_name === u.name)
    .sort((a, b) => b.id - a.id);
  return cards;
}

const NOTIF_KEY = 'tamrna.web.notifications_read';
const day = 86400000;
const iso = (offsetDays) => new Date(Date.now() - offsetDays * day).toISOString().slice(0, 10);

export async function listNotifications() {
  await latency(100);
  requireUser();
  const read = safeStorage.getJson(NOTIF_KEY, null);
  const readIds = read || ['notif-2', 'notif-3'];
  const base = [
    {
      id: 'notif-1',
      title: 'تم تأكيد طلبك #1024 بنجاح',
      title_en: 'Your order #1024 is confirmed',
      body: 'بدأ تجهيز عبوات التمور الفاخرة بعناية فائقة تمهيداً للشحن المبرد.',
      body_en: 'Preparation of your royal dates shipment with temperature control has started.',
      created_at: iso(1),
    },
    {
      id: 'notif-2',
      title: 'وصلت بطاقة إهداء جديدة إلى بريدك',
      title_en: 'A new gift card has arrived',
      body: 'أهدى إليك فهد الناصر بطاقة إهداء فاخرة بقيمة 500 ر.س.',
      body_en: 'Fahad Al-Nasser sent you a luxury gift card of 500 SAR.',
      created_at: iso(4),
    },
    {
      id: 'notif-3',
      title: 'موسم تمور السكري الملكي الفاخر',
      title_en: 'Royal Sukkari dates season',
      body: 'بدأ حصاد الدفعة الأولى من مزارع القصيم وعنيزة. الكميات محدودة.',
      body_en: 'Harvest of the first harvest batch has started. Limited quantities.',
      created_at: iso(10),
    },
  ];
  return base.map((n) => ({ ...n, is_read: readIds.includes(n.id) }));
}

export async function markNotificationRead(id) {
  await latency(60);
  const read = safeStorage.getJson(NOTIF_KEY, ['notif-2', 'notif-3']);
  if (!read.includes(id)) safeStorage.setJson(NOTIF_KEY, [...read, id]);
  return { success: true };
}

export async function markAllNotificationsRead() {
  await latency(60);
  safeStorage.setJson(NOTIF_KEY, ['notif-1', 'notif-2', 'notif-3']);
  return { success: true };
}

const PREFS_KEY = 'tamrna.web.account_settings';

export async function getPreferences() {
  await latency(60);
  requireUser();
  return safeStorage.getJson(PREFS_KEY, { orders: true, gifts: true, marketing: false });
}

export async function savePreferences(prefs) {
  await latency(200);
  requireUser();
  safeStorage.setJson(PREFS_KEY, { orders: !!prefs.orders, gifts: !!prefs.gifts, marketing: !!prefs.marketing });
  return { success: true };
}

// ---- Wishlist -------------------------------------------------------------------------------------------

export async function getWishlistIds() {
  await latency(40);
  const user = getStoredUser();
  if (!user) return [];
  return db.where('wishlists', (w) => w.user_id === user.id).map((w) => w.product_id);
}

export async function toggleWishlist(productId) {
  await latency(100);
  const user = getStoredUser();
  if (!user) {
    return {
      requires_login: true,
      message: t('يرجى تسجيل الدخول أو إنشاء حساب لإضافة المنتجات إلى المفضلة.', 'Please sign in or create an account to save dates to your wishlist.'),
    };
  }
  const id = Number(productId);
  const existing = db.all('wishlists').find((w) => w.user_id === user.id && w.product_id === id);
  if (existing) db.remove('wishlists', existing.id);
  else db.insert('wishlists', { user_id: user.id, product_id: id });
  const count = db.where('wishlists', (w) => w.user_id === user.id).length;
  return {
    in_wishlist: !existing,
    count,
    message: existing ? t('تمت إزالة المنتج من المفضلة', 'Item removed from your wishlist') : t('تمت إضافة المنتج إلى المفضلة', 'Item added to your wishlist'),
  };
}
