import { safeStorage } from '@tamrna/shared/api';
import { GIFT_CARD, DEFAULT_FREE_SHIPPING_THRESHOLD } from '@tamrna/shared/constants';
import { formatMoney2, isSaudiMobile, todayISO, randomToken } from '@tamrna/shared/utils';
import { getClientLocale } from '@/lib/locale-client';
import { db, latency, fail } from './db';

/**
 * Mock cart adapter. Ports CartController::getCartSummary() and the /api/cart/* endpoints.
 * The cart lives in this browser (PHP kept it in the session): { items: { [key]: entry }, coupon_code }.
 */

const CART_KEY = 'tamrna.web.cart';
const t = (ar, en) => (getClientLocale() === 'en' ? en : ar);

const read = () => {
  const state = safeStorage.getJson(CART_KEY, null);
  return state && typeof state === 'object' ? { items: state.items || {}, coupon_code: state.coupon_code || null } : { items: {}, coupon_code: null };
};
const write = (state) => safeStorage.setJson(CART_KEY, state);

const effective = (sale, price) => (sale != null && sale > 0 ? sale : price);

function giftLine(key, entry) {
  const locale = getClientLocale();
  const isAr = locale !== 'en';
  const amount = Number(entry.amount) || 0;
  const qty = Math.max(1, Math.min(10, Number(entry.qty) || 1));
  const printed = entry.card_type === 'printed';
  const typeLabel = isAr ? (printed ? 'بطاقة مطبوعة' : 'بطاقة رقمية') : printed ? 'Printed card' : 'Digital card';
  const to = String(entry.recipient_name || '').trim();
  return {
    key,
    variant_id: null,
    product_id: null,
    product_name: isAr ? 'بطاقة إهداء تمرنا' : 'Tamrna Gift Card',
    size_name: typeLabel + (to ? `${isAr ? ' · إلى ' : ' · To '}${to}` : ''),
    sku: 'GIFT-CARD',
    image: 'assets/images/home/gifting.webp',
    unit_price: amount,
    unit_price_formatted: formatMoney2(amount, locale),
    quantity: qty,
    max_stock: 10,
    is_preorder: false,
    is_fragile: false,
    is_gift_card: true,
    gift: { ...entry, qty: undefined },
    subtotal: amount * qty,
    subtotal_formatted: formatMoney2(amount * qty, locale),
  };
}

function productLine(key, entry) {
  const locale = getClientLocale();
  let variant = entry.variant_id ? db.find('product_variants', entry.variant_id) : null;
  const product = db.find('products', variant ? variant.product_id : entry.product_id ?? key);
  if (!product) return null;
  const isAr = locale === 'ar';
  const maxStock = (variant ? variant.stock_quantity : product.stock_quantity) || 99;
  const quantity = Math.max(1, Math.min(Number(entry.qty) || 1, maxStock));
  const unit = variant
    ? effective(variant.sale_price, variant.price) || effective(product.sale_price, product.price)
    : effective(product.sale_price, product.price);
  const subtotal = unit * quantity;
  return {
    key,
    variant_id: variant ? variant.id : null,
    product_id: product.id,
    product_slug: product.slug,
    product_name: isAr ? product.name_ar : product.name_en || product.name_ar,
    size_name: variant ? (isAr ? variant.size_name : variant.size_name_en || variant.size_name) : product.weight,
    sku: variant ? variant.sku : product.sku,
    image: product.featured_image,
    unit_price: unit,
    unit_price_formatted: formatMoney2(unit, locale),
    quantity,
    max_stock: maxStock,
    is_preorder: !!product.is_preorder,
    is_fragile: !!product.is_fragile,
    subtotal,
    subtotal_formatted: formatMoney2(subtotal, locale),
  };
}

/** @param {string} code */
function findGiftCard(code) {
  const upper = String(code || '').trim().toUpperCase();
  return db.all('gift_cards').find((g) => g.code === upper && g.status === 'active' && Number(g.balance) > 0) || null;
}

/** Full cart summary (items, totals, coupon / gift-card discount, free-shipping meter). */
export function computeSummary() {
  const locale = getClientLocale();
  const state = read();
  const items = [];
  let subtotal = 0;
  let count = 0;
  Object.entries(state.items).forEach(([key, entry]) => {
    const line = entry?.type === 'gift_card' ? giftLine(key, entry) : productLine(key, entry);
    if (!line) return;
    items.push(line);
    subtotal += line.subtotal;
    count += line.quantity;
  });

  const threshold = Math.max(0, Number(db.getSetting('shipping_free_threshold', DEFAULT_FREE_SHIPPING_THRESHOLD)) || 0);
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 100;

  let discount = 0;
  let couponCode = state.coupon_code;
  let couponDetails = null;
  if (couponCode && subtotal > 0) {
    const today = todayISO();
    const coupon = db.all('coupons').find(
      (c) => c.code === couponCode && c.is_active && (!c.start_date || c.start_date <= today) && (!c.end_date || c.end_date >= today),
    );
    const gift = !coupon ? findGiftCard(couponCode) : null;
    if (coupon) {
      const limitExceeded = coupon.usage_limit && coupon.times_used >= coupon.usage_limit;
      const minMet = !coupon.min_order_amount || subtotal >= coupon.min_order_amount;
      if (!limitExceeded && minMet) {
        discount = coupon.discount_type === 'fixed' ? Math.min(subtotal, Number(coupon.discount_value)) : Math.round(subtotal * (Number(coupon.discount_value) / 100) * 100) / 100;
        couponDetails = {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          discount_label: coupon.discount_type === 'percentage' ? `${Number(coupon.discount_value)}%` : formatMoney2(coupon.discount_value, locale),
        };
      } else {
        couponCode = null;
        write({ ...state, coupon_code: null });
      }
    } else if (gift) {
      discount = Math.min(subtotal, Number(gift.balance));
      couponDetails = {
        code: gift.code,
        discount_type: 'gift_card',
        discount_value: Number(gift.balance),
        discount_label: formatMoney2(gift.balance, locale),
        is_gift_card: true,
      };
    } else {
      couponCode = null;
      write({ ...state, coupon_code: null });
    }
  }

  const total = Math.max(0, subtotal - discount);
  return {
    items,
    count,
    item_count: count,
    subtotal,
    subtotal_formatted: formatMoney2(subtotal, locale),
    discount,
    discount_formatted: formatMoney2(discount, locale),
    coupon_code: couponCode,
    coupon_details: couponDetails,
    total,
    total_formatted: formatMoney2(total, locale),
    free_shipping_threshold: threshold,
    free_shipping_remaining: remaining,
    free_shipping_progress: progress,
    is_free_shipping: subtotal >= threshold,
  };
}

export const clearCartState = () => write({ items: {}, coupon_code: null });

export async function getCart() {
  await latency(60);
  return computeSummary();
}

/** @param {{ productId?: number|string|null, variantId?: number|string|null, quantity?: number }} input */
export async function addItem({ productId, variantId, quantity = 1 }) {
  await latency(120);
  const qty = Math.max(1, Number(quantity) || 1);
  const state = read();
  let key;
  let stock;
  let entry;
  if (variantId) {
    const variant = db.find('product_variants', variantId);
    if (!variant) fail(t('المنتج أو العبوة المطلوبة غير موجودة', 'The requested product or pack was not found'), 404);
    key = String(variant.id);
    stock = variant.stock_quantity;
    entry = { variant_id: variant.id, product_id: variant.product_id };
  } else if (productId) {
    const product = db.where('products', (p) => p.status === 'published').find((p) => String(p.id) === String(productId));
    if (!product) fail(t('المنتج غير موجود', 'Product not found'), 404);
    const first = db.where('product_variants', (v) => v.product_id === product.id)[0];
    key = String(first ? first.id : product.id);
    stock = first ? first.stock_quantity : product.stock_quantity;
    entry = { variant_id: first ? first.id : null, product_id: product.id };
  } else {
    fail(t('بيانات المنتج غير صحيحة', 'Invalid product data'));
  }
  const current = Number(state.items[key]?.qty) || 0;
  if (current + qty > stock) {
    fail(t(`عذراً، الكمية المتاحة في المخزون هي ${stock} فقط.`, `Sorry, only ${stock} left in stock.`));
  }
  state.items[key] = { ...entry, qty: current + qty };
  write(state);
  return { message: t('تمت إضافة التمر إلى سلة التسوق بنجاح', 'Added to your cart'), cart: computeSummary() };
}

export async function updateItem({ key, quantity }) {
  await latency(90);
  const state = read();
  const qty = Number(quantity) || 0;
  if (qty <= 0) delete state.items[key];
  else if (state.items[key]) state.items[key].qty = qty;
  write(state);
  return { cart: computeSummary() };
}

export async function removeItem({ key }) {
  await latency(90);
  const state = read();
  delete state.items[key];
  write(state);
  return { message: t('تم حذف الصنف من السلة', 'Item removed from cart'), cart: computeSummary() };
}

export async function clearCart() {
  await latency(90);
  clearCartState();
  return { cart: computeSummary() };
}

export async function applyCoupon({ code }) {
  await latency(160);
  const value = String(code || '').trim().toUpperCase();
  if (!value) fail(t('يرجى إدخال رمز الكوبون', 'Please enter a coupon code'));
  const cart = computeSummary();
  if (!cart.items.length) fail(t('سلة التسوق فارغة', 'Your cart is empty'));
  const today = todayISO();
  const coupon = db.all('coupons').find((c) => c.code === value);
  const state = read();
  if (!coupon) {
    const gift = findGiftCard(value);
    if (gift) {
      write({ ...state, coupon_code: gift.code });
      const next = computeSummary();
      return { message: t(`تم تطبيق بطاقة الإهداء بقيمة ${next.discount_formatted}`, `Gift card applied: ${next.discount_formatted}`), cart: next };
    }
    fail(t('رمز الكوبون غير صحيح أو غير مسجل', 'Invalid or unknown coupon code'));
  }
  if (!coupon.is_active) fail(t('عذراً، هذا الكوبون متوقف حالياً', 'Sorry, this coupon is currently disabled'));
  if (coupon.start_date && coupon.start_date > today) fail(t('عذراً، لم يبدأ سريان هذا الكوبون بعد', 'Sorry, this coupon is not valid yet'));
  if (coupon.end_date && coupon.end_date < today) fail(t('عذراً، انتهت فترة صلاحية هذا الكوبون', 'Sorry, this coupon has expired'));
  if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) fail(t('عذراً، استنفد هذا الكوبون الحد الأقصى لمرات الاستخدام', 'Sorry, this coupon reached its usage limit'));
  if (coupon.min_order_amount && cart.subtotal < coupon.min_order_amount) {
    fail(
      t(
        `الحد الأدنى للطلب لتفعيل هذا الكوبون هو ${Number(coupon.min_order_amount).toFixed(2)} ر.س`,
        `The minimum order for this coupon is ${Number(coupon.min_order_amount).toFixed(2)} SAR`,
      ),
    );
  }
  write({ ...state, coupon_code: value });
  const next = computeSummary();
  const message =
    coupon.discount_type === 'percentage'
      ? t(`تم تطبيق خصم ${coupon.discount_value}% بنجاح!`, `${coupon.discount_value}% discount applied!`)
      : t(`تم تطبيق خصم ${formatMoney2(coupon.discount_value, 'ar')} بنجاح!`, `${formatMoney2(coupon.discount_value, 'en')} discount applied!`);
  return { message, cart: next };
}

export async function removeCoupon() {
  await latency(90);
  write({ ...read(), coupon_code: null });
  return { message: t('تم إلغاء الكوبون بنجاح', 'Coupon removed'), cart: computeSummary() };
}

/** GiftCardService::buildEntry() + CartController::apiAddGiftCard() */
export async function addGiftCard(input) {
  await latency(160);
  const amount = Number(input.amount) || 0;
  const sender = String(input.sender_name || '').trim();
  const recipient = String(input.recipient_name || '').trim();
  const phone = String(input.recipient_phone || '').trim();
  if (amount < GIFT_CARD.MIN_AMOUNT || amount > GIFT_CARD.MAX_AMOUNT) {
    const m = t(`قيمة البطاقة يجب أن تكون بين ${GIFT_CARD.MIN_AMOUNT} و${GIFT_CARD.MAX_AMOUNT} ر.س`, `Card value must be between ${GIFT_CARD.MIN_AMOUNT} and ${GIFT_CARD.MAX_AMOUNT} SAR`);
    fail(m, 422, { amount: [m] });
  }
  if (sender.length < 2 || recipient.length < 2) {
    const m = t('يرجى كتابة اسم المُرسل واسم المُهدى إليه', 'Please enter the sender and recipient names');
    fail(m, 422, { sender_name: [m] });
  }
  if (phone && !isSaudiMobile(phone)) {
    const m = t('رقم جوال المستلم غير صحيح (مثال: 05xxxxxxxx)', 'Recipient mobile is not valid (e.g. 05xxxxxxxx)');
    fail(m, 422, { recipient_phone: [m] });
  }
  const state = read();
  state.items[`gift_${randomToken(10)}`] = {
    type: 'gift_card',
    card_type: input.card_type === 'printed' ? 'printed' : 'digital',
    amount: Math.round(amount * 100) / 100,
    sender_name: sender.slice(0, 150),
    sender_phone: String(input.sender_phone || '').slice(0, 50),
    recipient_name: recipient.slice(0, 150),
    recipient_phone: phone.slice(0, 50),
    recipient_email: String(input.recipient_email || '').slice(0, 150),
    message: String(input.message || '').slice(0, 180),
    qty: 1,
  };
  write(state);
  return { message: t('تمت إضافة بطاقة الإهداء إلى السلة', 'Gift card added to your cart'), cart: computeSummary() };
}
