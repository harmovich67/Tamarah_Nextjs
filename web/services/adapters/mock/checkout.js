import { safeStorage } from '@tamrna/shared/api';
import { DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_STANDARD_SHIPPING_FEE } from '@tamrna/shared/constants';
import { formatMoney2, nowSql, randomToken, pad } from '@tamrna/shared/utils';
import { getClientLocale } from '@/lib/locale-client';
import { getStoredUser } from '@/lib/session';
import { db, latency, fail } from './db';
import { computeSummary, clearCartState } from './cart';

/**
 * Mock checkout adapter. Ports CheckoutController (cities, shipping calculation, order creation, payment
 * initiation / verification) and the order confirmation lookup.
 */

const t = (ar, en) => (getClientLocale() === 'en' ? en : ar);
const PENDING_KEY = 'tamrna.web.pending_order';

const FALLBACK_ESTIMATE = 'توصيل مبرد خلال 24-48 ساعة';

function shippingFor(cityNameAr, subtotal) {
  const threshold = Math.max(0, Number(db.getSetting('shipping_free_threshold', DEFAULT_FREE_SHIPPING_THRESHOLD)) || 0);
  if (subtotal >= threshold) return { fee: 0, is_free: true, delivery: 'توصيل مبرد مجاني للطلبات المميزة', is_cold: 1 };
  const zone = db.all('shipping_zones').find((z) => z.city_name_ar === cityNameAr && z.is_active);
  if (zone) return { fee: Number(zone.shipping_fee), is_free: false, delivery: zone.estimated_delivery || FALLBACK_ESTIMATE, is_cold: zone.is_cold_shipping ? 1 : 0 };
  const standard = Math.max(0, Number(db.getSetting('shipping_standard_fee', DEFAULT_STANDARD_SHIPPING_FEE)) || 0);
  return { fee: standard, is_free: false, delivery: FALLBACK_ESTIMATE, is_cold: 1 };
}

const activeZones = () => db.where('shipping_zones', (z) => z.is_active).sort((a, b) => a.id - b.id);

function paymentSettings() {
  const s = db.getSettings();
  const on = (key, dflt = '1') => String(s[key] ?? dflt) === '1';
  return {
    enable_mada: on('enable_mada'),
    enable_apple_pay: on('enable_apple_pay'),
    enable_credit_card: on('enable_credit_card'),
    enable_paymob: on('enable_paymob'),
    enable_tabby: on('enable_tabby'),
    enable_tamara: on('enable_tamara'),
    enable_cod: on('enable_cod'),
    enable_bank_transfer: on('enable_bank_transfer', '0'),
    cod_fee: Number(s.cod_fee || 0),
    bank_name: s.bank_name || 'Al Rajhi Bank',
    bank_account_name: s.bank_account_name || 'Tumurna Trading Establishment',
    bank_iban: s.bank_iban || '',
    allow_guest_checkout: String(s.allow_guest_checkout ?? '1') === '1',
  };
}

/** Data the checkout screen needs besides the cart. */
export async function getCheckoutData() {
  await latency(80);
  const user = getStoredUser();
  const savedAddresses = user
    ? db.where('user_addresses', (a) => a.user_id === user.id).sort((a, b) => b.is_default - a.is_default || b.id - a.id)
    : [];
  const cities = activeZones();
  const cart = computeSummary();
  const defaultCity = cities[0]?.city_name_ar || 'الرياض';
  return {
    cities,
    savedAddresses,
    payment: paymentSettings(),
    shipping: shippingFor(defaultCity, cart.subtotal),
  };
}

/** @param {{ shipping_type?: string, city?: string }} input */
export async function calculateShipping({ shipping_type = 'home_delivery', city = 'الرياض' }) {
  await latency(60);
  const cart = computeSummary();
  let fee = 0;
  let delivery = t('استلام من فروع تمرنا المعتمدة', 'Pickup from approved Tamrna boutiques');
  let isCold = 0;
  if (shipping_type !== 'branch_pickup') {
    const calc = shippingFor(city, cart.subtotal);
    fee = calc.fee;
    delivery = calc.delivery;
    isCold = calc.is_cold;
  }
  const total = Math.max(0, cart.subtotal - cart.discount + fee);
  return {
    shipping_fee: fee,
    shipping_fee_formatted: fee === 0 ? t('مجاناً', 'FREE') : formatMoney2(fee, getClientLocale()),
    delivery_estimate: delivery,
    is_cold: isCold,
    subtotal: cart.subtotal,
    discount: cart.discount,
    total,
    total_formatted: formatMoney2(total, getClientLocale()),
  };
}

function resolveProvider(method) {
  if (['tabby', 'tamara', 'paymob', 'cod', 'bank_transfer'].includes(method)) return method;
  return String(db.getSetting('gateway_provider', 'moyasar') || 'moyasar').toLowerCase();
}

/**
 * Create an order from the current cart.
 * @returns {Promise<{ order: object, next: { type: 'order'|'payment', url: string } }>}
 */
export async function placeOrder(input) {
  await latency(500);
  const cart = computeSummary();
  if (!cart.items.length) fail(t('سلة التسوق فارغة', 'Your cart is empty'));
  const user = getStoredUser();
  const settings = paymentSettings();
  if (!settings.allow_guest_checkout && !user) fail(t('يرجى تسجيل الدخول لإتمام الطلب', 'Please sign in to place your order'), 401);

  const fullName = `${input.first_name || ''} ${input.last_name || ''}`.trim() || t('عميل المتجر', 'Store customer');
  const phone = String(input.phone || '').trim();
  const shippingType = input.shipping_type === 'branch_pickup' ? 'branch_pickup' : 'home_delivery';
  const city = String(input.city || 'الرياض').trim();
  const district = String(input.district || '').trim();
  const address = String(input.address || '').trim();
  if (!phone || (shippingType === 'home_delivery' && !address)) {
    const m = t('يرجى ملء كافة حقول العنوان ورقم الهاتف للتوصيل', 'Please complete the delivery address and phone number');
    fail(m, 422, { address: [m] });
  }

  const method = input.payment_method || 'mada';
  const shippingFee = shippingType === 'branch_pickup' ? 0 : shippingFor(city, cart.subtotal).fee;
  const codFee = method === 'cod' ? Math.max(0, settings.cod_fee) : 0;
  const total = Math.max(0, cart.subtotal - cart.discount + shippingFee + codFee);
  const now = new Date();
  const orderNumber = `ORD-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${1000 + Math.floor(Math.random() * 9000)}`;
  const fullAddress = shippingType === 'branch_pickup' ? `استلام من الفرع (${city})` : `المدينة: ${city} | الحي: ${district} | العنوان: ${address}`;
  const offline = method === 'cod' || method === 'bank_transfer';

  const order = db.insert('orders', {
    order_number: orderNumber,
    user_id: user?.id ?? null,
    customer_name: fullName,
    customer_phone: phone,
    customer_email: String(input.email || '').trim(),
    shipping_address: fullAddress,
    governorate: city,
    city,
    district,
    shipping_type: shippingType,
    subtotal: cart.subtotal,
    shipping_fee: shippingFee + codFee,
    discount: cart.discount,
    coupon_code: cart.coupon_code,
    total,
    payment_method: method,
    payment_status: 'pending',
    payment_reference: offline ? `${method.toUpperCase()}-${Date.now()}` : null,
    shipping_service: 'standard_freight',
    shipping_status: 'processing',
    notes: String(input.notes || '').trim() || null,
    updated_at: nowSql(),
  });

  // Coupon usage / gift card consumption
  if (cart.coupon_code) {
    if (cart.coupon_details?.is_gift_card) {
      const card = db.all('gift_cards').find((g) => g.code === cart.coupon_code);
      if (card) {
        const balance = Math.max(0, Number(card.balance) - cart.discount);
        db.update('gift_cards', card.id, { balance, status: balance <= 0.0001 ? 'used' : card.status });
      }
    } else {
      const coupon = db.all('coupons').find((c) => c.code === cart.coupon_code);
      if (coupon) db.update('coupons', coupon.id, { times_used: (coupon.times_used || 0) + 1 });
    }
  }

  // Items + stock
  cart.items.forEach((item) => {
    db.insert('order_items', {
      order_id: order.id,
      product_id: item.product_id || 0,
      variant_id: item.variant_id || null,
      product_name: item.product_name,
      size_name: item.size_name,
      unit_price: item.unit_price,
      price: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    });
    if (item.is_gift_card) {
      for (let i = 0; i < item.quantity; i += 1) {
        db.insert('gift_cards', {
          code: `TUM-GIFT-${randomToken(6)}`,
          card_type: item.gift.card_type,
          amount: item.gift.amount,
          balance: item.gift.amount,
          sender_name: item.gift.sender_name,
          sender_phone: item.gift.sender_phone || null,
          recipient_name: item.gift.recipient_name,
          recipient_phone: item.gift.recipient_phone || null,
          recipient_email: item.gift.recipient_email || null,
          message: item.gift.message || null,
          status: 'pending',
          order_id: order.id,
          order_number: orderNumber,
        });
      }
      return;
    }
    if (item.variant_id) {
      const v = db.find('product_variants', item.variant_id);
      if (v) db.update('product_variants', v.id, { stock_quantity: Math.max(0, v.stock_quantity - item.quantity) });
    }
    if (item.product_id) {
      const p = db.find('products', item.product_id);
      if (p) db.update('products', p.id, { stock_quantity: Math.max(0, p.stock_quantity - item.quantity) });
    }
  });

  // Optionally remember the address
  if (user && input.save_address && address) {
    const exists = db.all('user_addresses').find((a) => a.user_id === user.id && a.address === address);
    if (!exists) {
      db.insert('user_addresses', { user_id: user.id, title: t('المنزل', 'Home'), recipient_name: fullName, phone, city, governorate: city, district, address, street_address: address, is_default: 0 });
    }
  }

  if (offline) {
    clearCartState();
    return { order, next: { type: 'order', url: `/order/${orderNumber}` } };
  }

  safeStorage.set(PENDING_KEY, orderNumber);
  const provider = resolveProvider(method);
  return {
    order,
    next: { type: 'payment', url: `/checkout/simulator?order_number=${encodeURIComponent(orderNumber)}&provider=${provider}&method=${method}` },
  };
}

export async function getOrder(orderNumber) {
  await latency(60);
  const order = db.all('orders').find((o) => o.order_number === orderNumber);
  if (!order) fail(t('الطلب غير موجود', 'Order not found'), 404);
  const items = db.where('order_items', (i) => i.order_id === order.id).map((i) => {
    const p = i.product_id ? db.find('products', i.product_id) : null;
    return { ...i, featured_image: p?.featured_image, product_slug: p?.slug };
  });
  return { order, items };
}

/** Provider return-URL handler: marks the order paid (or records the failure). */
export async function verifyPayment({ order_number, status = 'paid' }) {
  await latency(300);
  const orderNumber = order_number || safeStorage.get(PENDING_KEY);
  const order = db.all('orders').find((o) => o.order_number === orderNumber);
  if (status !== 'paid') {
    const message = t('تم رفض أو إلغاء عملية الدفع. يمكنك إعادة المحاولة.', 'The payment was declined or cancelled. You can try again.');
    if (order) db.update('orders', order.id, { notes: `${order.notes || ''} | ${message}` });
    return { paid: false, order_number: orderNumber, message };
  }
  if (!order) fail(t('الطلب غير موجود', 'Order not found'), 404);
  db.update('orders', order.id, { payment_status: 'paid', payment_reference: order.payment_reference || `SIM_${Date.now()}` });
  db.where('gift_cards', (g) => g.order_id === order.id && g.status === 'pending').forEach((g) => db.update('gift_cards', g.id, { status: 'active' }));
  clearCartState();
  safeStorage.remove(PENDING_KEY);
  return { paid: true, order_number: order.order_number };
}

/** Order summary shown by the sandbox simulator screen. */
export async function getPaymentSession(orderNumber) {
  return (await getOrder(orderNumber)).order;
}
