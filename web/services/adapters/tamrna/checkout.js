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

/** Pickup branches of the dashboard (`GET /general/branches`, only those with pickup enabled). */
async function pickupBranches() {
  const rows = rowsOf(await api.get('/general/branches'));
  return rows
    .filter((b) => b.pickup_enabled !== false && b.pickup_enabled !== 0)
    .map((b) => ({ id: String(b.id), name: b.name || '', city: String(b.city?.name ?? '').trim(), address: b.address || '' }));
}

export async function getCheckoutData() {
  const user = getStoredUser();
  const [cities, savedAddressList, branches] = await Promise.all([loadCities(), user ? savedAddresses().catch(() => []) : [], pickupBranches().catch(() => [])]);
  return {
    cities: zonesOf(cities),
    savedAddresses: savedAddressList,
    branches,
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
  const savedRows = await savedAddresses().catch(() => []);
  let addressId;
  let isDefault = false;

  if (branch) {
    // Pickup orders need the branch id and (checked on the live server) an address too: the customer's default one.
    if (!/^\d+$/.test(String(input.pickup_branch || ''))) throw unsupported(t('اختر فرع الاستلام.', 'Choose the pickup branch.'));
    body.branch_id = input.pickup_branch;
    const home = savedRows.find((a) => a.is_default) || savedRows[0];
    if (!home) throw unsupported(t('أضف عنواناً في حسابك أولاً، فهو مطلوب حتى عند الاستلام من الفرع.', 'Add an address to your account first; it is required for branch pickup too.'));
    addressId = home.id;
    isDefault = !!home.is_default;
  } else {
    const street = String(input.address || '').trim();
    const district = String(input.district || '').trim();
    const cities = await loadCities();
    const city = cities.find((c) => c.name === String(input.city || '').trim()) ?? cities[0];
    // The backend orders against an address id: use the saved address the customer picked (or one with the same street and
    // city) and only save a new one when there is none, so retrying never adds duplicates.
    const picked = input.address_id ? savedRows.find((a) => String(a.id) === String(input.address_id) && a.street_address === street) : null;
    const saved = picked || findSavedAddress(savedRows, { street, city });
    addressId = saved ? saved.id : await createAddress({ cityId: city?.id, street, district, is_default: true });
    isDefault = saved ? !!saved.is_default : true;
    if (!addressId) throw unsupported(t('تعذر حفظ عنوان التوصيل. حاول مرة أخرى.', 'Could not save the delivery address. Please try again.'));
  }
  // The backend only accepts the customer's DEFAULT address (any other one answers 422 "العنوان غير موجود أو غير مفعّل";
  // checked on the live server), so the address used for the order becomes the default one.
  if (!isDefault) await api.post(`/client/addresses/${addressId}/set-default`);
  body.address_id = addressId;

  let res;
  try {
    res = unwrap(await api.post('/client/orders/checkout', form(body)));
  } catch (error) {
    await dropUnavailable(error);
    throw error;
  }
  const raw = res?.order ?? res;
  const { order, items } = toOrder(raw && typeof raw === 'object' ? raw : {});
  const number = order.order_number || String(raw?.id ?? '');
  rememberPlacedOrder(order, items);
  return { order: { ...order, items }, next: { type: 'order', url: `/order/${encodeURIComponent(number)}` } };
}

/**
 * The cart can hold lines of products deleted since (the cart answer hides them, the checkout refuses with 422
 * `unavailable_items`): take those lines out so the next try goes through, and say so.
 */
async function dropUnavailable(error) {
  const lines = error?.data?.data?.unavailable_items;
  if (!Array.isArray(lines) || !lines.length) return;
  // A line with quantities (`requested_quantity` / `available_quantity`) is a stock shortage: the product exists, so the line
  // stays in the cart and the customer is told what is available. A line without them belongs to a product that is gone: the
  // cart answer hides it but the checkout refuses it, so it is removed.
  const gone = lines.filter((i) => i.requested_quantity === undefined && i.available_quantity === undefined);
  await Promise.all(gone.map((i) => api.delete(`/client/cart/items/${i.item_id}`).catch(() => null)));
  const short = lines.filter((i) => !gone.includes(i));
  // "250.0000 g" -> "250 جرام"
  const weightOf = (raw) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return '';
    const unit = /kg/i.test(raw) ? t('كجم', 'kg') : /(^|\s)t$/i.test(String(raw).trim()) ? t('طن', 't') : t('جرام', 'g');
    return `${n} ${unit}`;
  };
  const named = (i) => [i.product_name, weightOf(i.variant_weight) && `(${weightOf(i.variant_weight)})`].filter(Boolean).join(' ');
  const parts = [];
  if (short.length) {
    parts.push(
      short
        .map((i) => {
          const left = Number(i.available_quantity);
          if (!Number.isFinite(left)) return `${named(i)}: ${i.reason || t('الكمية غير متوفرة', 'not available in this quantity')}`;
          return left > 0
            ? `${named(i)}: ${t(`المتاح ${left} فقط والمطلوب ${i.requested_quantity}`, `only ${left} available, ${i.requested_quantity} requested`)}`
            : `${named(i)}: ${t('غير متوفر حالياً', 'currently out of stock')}`;
        })
        .join(t('، ', ', ')),
    );
  }
  if (gone.length) parts.push(t('تمت إزالة منتجات لم تعد متوفرة من سلتك.', 'Products that are no longer available were removed from your cart.'));
  error.message = `${parts.join(' ')} ${t('راجع السلة ثم أكمل الطلب.', 'Review your cart, then place the order again.')}`;
  error.data = { ...error.data, success: false };
}

/**
 * The customer order list carries no lines (checked on the live server), but the checkout answer does: keep them for the
 * confirmation page of this order.
 */
function rememberPlacedOrder(order, items) {
  // The backend sends no date in the checkout answer or in the order list: the moment of placing is the order date.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const created_at = order.created_at || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  try {
    sessionStorage.setItem('tamrna:placed-order', JSON.stringify({ number: order.order_number, id: order.id, order: { ...order, created_at }, items }));
  } catch {
    /* private mode: the confirmation page shows the totals without the lines */
  }
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

