import { formatMoney2 } from '@tamrna/shared/utils';
import { getClientLocale } from '@/lib/locale-client';
import { getStoredUser } from '@/lib/session';
import { createAddress, findSavedAddress, getOrder as getAccountOrder, loadCities, savedAddresses, zonesOf } from './account';
import { api, form, localPhone, needsLogin, num, PHONE_CODE, rowsOf, t, toOrder, unsupported, unwrap } from './http';

/**
 * Checkout against the Tamrna backend: `POST /client/orders/checkout { address_id, gift_card_code, delivery_type }`
 * with `delivery_type` = `delivery` (home) | `branch` (pickup) | `private`. The backend takes the cart of the signed-in
 * client, so the customer must be logged in (a guest cart is merged at login with `?guest_token=`).
 *
 * The collection has no payment, shipping-quote or order-lookup endpoint, so: the only payment method is "pay on
 * delivery / at the branch", the shipping fee is whatever the order answers with, and an order is found in the customer's
 * order list.
 */
const loadCart = async () => (await import('./index')).getCart();

export async function getCheckoutData() {
  const user = getStoredUser();
  const [cities, savedAddressList] = await Promise.all([loadCities(), user ? savedAddresses().catch(() => []) : []]);
  return {
    cities: zonesOf(cities),
    savedAddresses: savedAddressList,
    payment: {
      enable_mada: false,
      enable_apple_pay: false,
      enable_credit_card: false,
      enable_paymob: false,
      enable_tabby: false,
      enable_tamara: false,
      enable_cod: true,
      enable_bank_transfer: false,
      cod_fee: 0,
      bank_name: '',
      bank_account_name: '',
      bank_iban: '',
      allow_guest_checkout: false,
    },
    shipping: { fee: 0, is_free: false, delivery: t('يحدّد الفريق رسوم وموعد التوصيل بعد تأكيد الطلب', 'Delivery fee and date are confirmed after the order'), is_cold: 1 },
  };
}

/** No quote endpoint: show the cart total; the shipping fee appears on the order. */
export async function calculateShipping({ shipping_type = 'home_delivery' }) {
  const cart = await loadCart();
  const total = Math.max(0, cart.subtotal - cart.discount);
  return {
    shipping_fee: 0,
    shipping_fee_formatted: t('يُحدد بعد التأكيد', 'Set after confirmation'),
    delivery_estimate:
      shipping_type === 'branch_pickup'
        ? t('استلام من فروع تمرنا المعتمدة', 'Pickup from approved Tamrna boutiques')
        : t('يحدّد الفريق رسوم وموعد التوصيل بعد تأكيد الطلب', 'Delivery fee and date are confirmed after the order'),
    is_cold: shipping_type === 'branch_pickup' ? 0 : 1,
    subtotal: cart.subtotal,
    discount: cart.discount,
    total,
    total_formatted: formatMoney2(total, getClientLocale()),
  };
}

/**
 * @param {object} input first_name last_name phone email shipping_type city district address notes
 * @returns {Promise<{ order: object, next: { type: 'order', url: string } }>}
 */
export async function placeOrder(input) {
  if (!getStoredUser()) throw needsLogin();
  const cart = await loadCart();
  if (!cart.items.length) throw unsupported(t('سلة التسوق فارغة', 'Your cart is empty'));

  const branch = input.shipping_type === 'branch_pickup';
  const body = { delivery_type: branch ? 'branch' : 'delivery', gift_card_code: '' };

  if (!branch) {
    const street = String(input.address || '').trim();
    const district = String(input.district || '').trim();
    const cities = await loadCities();
    const city = cities.find((c) => c.name === String(input.city || '').trim()) ?? cities[0];
    // The backend orders against an address id: use the saved address the customer picked (or one with the same street and
    // city) and only save a new one when there is none, so retrying never adds duplicates.
    const savedRows = await savedAddresses().catch(() => []);
    const picked = input.address_id ? savedRows.find((a) => String(a.id) === String(input.address_id) && a.street_address === street) : null;
    const saved = picked || findSavedAddress(savedRows, { street, city });
    body.address_id = saved ? saved.id : await createAddress({ cityId: city?.id, street, district });
    if (!body.address_id) throw unsupported(t('تعذر حفظ عنوان التوصيل. حاول مرة أخرى.', 'Could not save the delivery address. Please try again.'));
  }

  const res = unwrap(await api.post('/client/orders/checkout', form(body)));
  const raw = res?.order ?? res;
  const { order, items } = toOrder(raw && typeof raw === 'object' ? raw : {});
  const number = order.order_number || String(raw?.id ?? '');
  return { order: { ...order, items }, next: { type: 'order', url: `/order/${encodeURIComponent(number)}` } };
}

export async function getOrder(orderNumber) {
  const { order, items } = await getAccountOrder(orderNumber);
  return { order, items };
}

/** There is no online payment: nothing to verify. */
export async function verifyPayment({ order_number }) {
  return { paid: false, order_number, message: t('الدفع الإلكتروني غير متاح حالياً. الدفع عند الاستلام.', 'Online payment is not available. Pay on delivery.') };
}

export async function getPaymentSession(orderNumber) {
  return (await getOrder(orderNumber)).order;
}

// ------------------------------------------------------------------------------------------------------ gift cards
/**
 * `POST /client/gift-cards` sends the card to the recipient straight away (it is not a cart line).
 * `gift_card_id` is the preset amount chosen in the dashboard (`GET /client/gift-cards`); a custom amount is sent without it.
 * @param {{ card_type: 'digital'|'printed', amount: number, sender_name: string, sender_phone?: string, recipient_name: string, recipient_phone?: string, message?: string }} input
 */
export async function addGiftCard(input) {
  if (!getStoredUser()) throw needsLogin();
  let presetId;
  try {
    const presets = rowsOf(await api.get('/client/gift-cards'));
    presetId = presets.find((p) => num(p, ['amount']) === Number(input.amount))?.id;
  } catch {
    /* the presets list is optional: send the card with its amount only */
  }
  const body = form({
    sender_name: input.sender_name,
    sender_phone_code: PHONE_CODE,
    sender_phone: input.sender_phone ? localPhone(input.sender_phone) : undefined,
    recipient_name: input.recipient_name,
    recipient_phone_code: PHONE_CODE,
    recipient_phone: input.recipient_phone ? localPhone(input.recipient_phone) : undefined,
    message: input.message,
    amount: input.amount,
    gift_card_id: presetId,
    redemption_type: input.card_type === 'printed' ? 'printed' : 'digital',
  });
  const res = await api.post('/client/gift-cards', body);
  return { message: res?.message || t('تم إرسال بطاقة الإهداء بنجاح', 'Your gift card was sent'), cart: await loadCart() };
}

