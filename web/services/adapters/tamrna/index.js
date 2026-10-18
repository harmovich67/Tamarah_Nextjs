import { ApiError, ERROR_CODES, safeStorage } from '@tamrna/shared/api';
import { DEFAULT_FREE_SHIPPING_THRESHOLD } from '@tamrna/shared/constants';
import { effectivePrice, formatMoney2, randomToken, slugify } from '@tamrna/shared/utils';
import { apiClient as api } from '@/lib/apiClient';
import { getClientLocale } from '@/lib/locale-client';

/**
 * Adapter for the real Tamrna backend (Postman collection `tomorona`, `/client/*`). It returns exactly the shapes the
 * mock adapters return (`name_ar`, `featured_image`, `price` / `sale_price`, cart summary...), so no screen changes.
 *
 * What the backend does not expose yet (orders / payment, accounts, coupons, home content, menus, settings) stays on
 * the mock adapters: see services/index.js.
 *
 * The backend answers in one language per request, so catalog calls are made in `ar` and `en` and merged by id.
 */

// ------------------------------------------------------------------------------------------------ http helpers
const unwrap = (res) => (res && typeof res === 'object' && !Array.isArray(res) && 'data' in res ? res.data : res);
const rowsOf = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : d?.data ?? d?.items ?? [];
};
const lastPageOf = (res) => res?.meta?.last_page ?? res?.data?.meta?.last_page ?? 1;
const inLang = (lang) => ({ headers: { 'Accept-Language': lang } });

async function fetchAll(path, params, lang) {
  const out = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await api.get(path, { ...params, page, per_page: 100 }, inLang(lang));
    const rows = rowsOf(res);
    out.push(...rows);
    if (!rows.length || page >= lastPageOf(res)) break;
  }
  return out;
}

const getData = async (path, query, lang) => unwrap(await api.get(path, query, lang ? inLang(lang) : undefined));

/** Small time-based cache: the home page, the catalog and the sitemap all need the same product list. */
const cache = new Map();
async function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await loader();
  cache.set(key, { at: Date.now(), value });
  return value;
}
const CATALOG_TTL = 30_000;

const notFound = (message) => new ApiError({ status: 404, code: ERROR_CODES.NOT_FOUND, message, data: { success: false, message } });
const unsupported = (message) => new ApiError({ status: 400, code: ERROR_CODES.HTTP, message, data: { success: false, message } });
const t = (ar, en) => (getClientLocale() === 'en' ? en : ar);

// ------------------------------------------------------------------------------------------------ mapping
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const UNIT = { g: ['جرام', 'g'], kg: ['كجم', 'kg'], t: ['طن', 't'] };
const unitLabel = (unit, lang) => (UNIT[unit] ? UNIT[unit][lang === 'en' ? 1 : 0] : unit || '');
/** "250 جرام" (Arabic units keep `weightToEnglish()` working on the storefront). */
const weightLabel = (w, unit, lang = 'ar') => (w === null || w === undefined || w === '' ? '' : `${Number(w)} ${unitLabel(unit, lang)}`.trim());

/** The backend answers with a placeholder (`/assets/images/image.png`, id null) when nothing was uploaded. */
const imageOf = (m) => {
  const p = typeof m === 'string' ? m : m?.path || m?.url || '';
  return !p || /\/assets\/images\/[\w-]+\.png$/.test(p) ? '' : p;
};

/** `13-<slug>`: the id makes the lookup exact, the slug keeps the URL readable (the backend slug is not unique). */
const slugFor = (id, slug, name) => {
  const s = slugify(slug || name || '');
  return s ? `${id}-${s}` : String(id);
};
const idFromSlug = (slug) => {
  const m = String(slug ?? '').match(/^(\d+)/);
  return m ? Number(m[1]) : null;
};

/** Fields shared by list rows and detail pages. */
function baseProduct(ar, en) {
  return {
    id: ar.id,
    slug: slugFor(ar.id, ar.slug, ar.name),
    status: 'published',
    name_ar: ar.name,
    name_en: en?.name || ar.name,
    description_ar: ar.description || '',
    description_en: en?.description || ar.description || '',
    badge: '',
    is_bestseller: false,
    is_featured: !!ar.is_featured_override,
    sales_count: 0,
    rating: Number(ar.rating) || 0,
    rating_count: Number(ar.reviews_count) || 0,
    is_preorder: ar.availability === 'preorder',
  };
}

/** One row of GET /client/products. */
function fromListRow(ar, en) {
  const base = Number(ar.base_price) || 0;
  const effective = round2(ar.effective_price ?? base);
  const discounted = effective > 0 && effective < base;
  const category = ar.category;
  return {
    ...baseProduct(ar, en),
    featured_image: imageOf(ar.image),
    price: base,
    sale_price: discounted ? effective : null,
    category_id: category?.id ?? null,
    category_name_ar: category?.name,
    category_name_en: en?.category?.name || category?.name,
    category_slug: category ? String(category.id) : undefined,
    weight: weightLabel(ar.weight, ar.weight_unit),
    is_fragile: false,
    sku: '',
    // The backend does not save stock yet: a purchasable product counts as in stock.
    stock_quantity: ar.is_purchasable === false || ar.availability === 'unavailable' ? 0 : 99,
  };
}

function mapVariant(v, productStock) {
  const base = Number(v.base_price) || 0;
  const effective = round2(v.effective_price ?? base);
  const discounted = effective > 0 && effective < base;
  const stock = v.stock === null || v.stock === undefined ? productStock : Number(v.stock);
  return {
    id: v.id,
    size_name: weightLabel(v.weight, v.weight_unit, 'ar'),
    size_name_en: weightLabel(v.weight, v.weight_unit, 'en'),
    sku: '',
    price: base,
    sale_price: discounted ? effective : null,
    stock_quantity: stock,
    is_default: !!v.is_default,
  };
}

/** Builds the storefront `{ product, variants }` from the ar + en detail payloads. */
function fromDetail(arData, enData) {
  const ar = arData.product;
  const en = enData?.product || ar;
  const purchasable = ar.is_purchasable !== false && ar.availability !== 'unavailable';
  const productStock = purchasable ? (ar.stock === null || ar.stock === undefined ? 99 : Number(ar.stock)) : 0;
  const variants = (ar.variants || []).map((v) => mapVariant(v, productStock)).sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
  const main = variants.find((v) => v.is_default) || variants[0];
  const category = (ar.categories || [])[0];
  const enCategory = (en.categories || []).find((c) => c.id === category?.id) || category;
  const gallery = (ar.gallery || []).map(imageOf).filter(Boolean);
  const product = {
    ...baseProduct(ar, en),
    slug: slugFor(ar.id, (ar.translations?.ar || {}).slug, ar.name),
    featured_image: gallery[0] || imageOf(ar.image),
    gallery: gallery.slice(1),
    price: main?.price ?? 0,
    sale_price: main?.sale_price ?? null,
    sku: ar.barcode || '',
    weight: main ? main.size_name : '',
    is_fragile: !!ar.is_fragile,
    category_id: category?.id ?? null,
    category_name_ar: category?.name,
    category_name_en: enCategory?.name,
    category_slug: category ? String(category.id) : undefined,
    stock_quantity: variants.length ? Math.max(...variants.map((v) => Number(v.stock_quantity) || 0)) : productStock,
    preorder_date: '',
  };
  return { product, variants };
}

// ------------------------------------------------------------------------------------------------ catalog
/** Every published product (ar + en merged) and the categories derived from them (or from /client/departments). */
async function loadBase() {
  return cached('base', CATALOG_TTL, async () => {
    const [arRows, enRows] = await Promise.all([fetchAll('/client/products', {}, 'ar'), fetchAll('/client/products', {}, 'en')]);
    const enById = new Map(enRows.map((r) => [r.id, r]));
    const products = arRows.map((r) => fromListRow(r, enById.get(r.id)));
    return { products, categories: await loadCategories(products) };
  });
}

const categoryList = (data) => {
  const list = Array.isArray(data) ? data : data?.categories ?? data?.departments ?? data?.data;
  return Array.isArray(list) && list.length && list.every((c) => Number.isFinite(Number(c?.id)) && typeof c?.name === 'string') ? list : null;
};

async function loadCategories(products) {
  const count = (id) => products.filter((p) => p.category_id === id).length;
  try {
    const [ar, en] = await Promise.all([getData('/client/departments', undefined, 'ar'), getData('/client/departments', undefined, 'en')]);
    const arList = categoryList(ar);
    if (arList) {
      const enById = new Map((categoryList(en) || []).map((c) => [c.id, c]));
      return arList.map((c, i) => ({
        id: c.id,
        slug: String(c.id),
        name_ar: c.name,
        name_en: enById.get(c.id)?.name || c.name,
        image: imageOf(c.image),
        icon: 'tag',
        order_index: c.sort_order ?? i + 1,
        count: count(c.id),
      }));
    }
  } catch {
    /* the departments endpoint failed or has an unknown shape: derive the categories from the products */
  }
  const seen = new Map();
  products.forEach((p) => {
    if (p.category_id != null && !seen.has(p.category_id)) {
      seen.set(p.category_id, { id: p.category_id, slug: String(p.category_id), name_ar: p.category_name_ar, name_en: p.category_name_en || p.category_name_ar, image: '', icon: 'tag', order_index: seen.size + 1, count: count(p.category_id) });
    }
  });
  return [...seen.values()];
}

const SORTERS = {
  price_asc: (a, b) => effectivePrice(a) - effectivePrice(b),
  price_desc: (a, b) => effectivePrice(b) - effectivePrice(a),
  rating: (a, b) => b.rating - a.rating,
  bestseller: (a, b) => b.sales_count - a.sales_count,
  featured: (a, b) => Number(b.is_featured) - Number(a.is_featured) || a.id - b.id,
};

/** Same filters / sorting as the mock catalog (CatalogController::catalog()), applied to the real products. */
export async function getCatalog(params = {}) {
  const { cat, filter, search = '', sort = 'featured', price_min = null, price_max = null, availability = [] } = params;
  const { products, categories } = await loadBase();
  const prices = products.map(effectivePrice);
  const bounds = { min: prices.length ? Math.floor(Math.min(...prices)) : 0, max: prices.length ? Math.ceil(Math.max(...prices)) : 0 };

  let rows = products;
  if (cat) rows = rows.filter((p) => String(p.category_id) === String(cat) || p.category_slug === String(cat));
  if (filter === 'preorder') rows = rows.filter((p) => p.is_preorder);
  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter((p) => [p.name_ar, p.name_en, p.description_ar, p.description_en].some((v) => String(v || '').toLowerCase().includes(term)));
  }
  if (availability.length) {
    rows = rows.filter(
      (p) =>
        (availability.includes('available') && p.stock_quantity > 0 && !p.is_preorder) ||
        (availability.includes('preorder') && p.is_preorder) ||
        (availability.includes('out_of_stock') && p.stock_quantity <= 0 && !p.is_preorder),
    );
  }
  if (price_min != null) rows = rows.filter((p) => effectivePrice(p) >= price_min);
  if (price_max != null) rows = rows.filter((p) => effectivePrice(p) <= price_max);
  return { products: rows.slice().sort(SORTERS[sort] || SORTERS.featured), categories, bounds };
}

/** @param {string|number} slug `13-slug` (or just the id) */
export async function getProduct(slug) {
  const id = idFromSlug(slug);
  if (id === null) throw notFound(t('لا توجد منتجات مطابقة', 'No matching products'));
  // The product page asks twice (metadata + body): keep the answer for a few seconds.
  const [ar, en] = await cached(`detail:${id}`, 10_000, () => Promise.all([getData(`/client/products/${id}`, undefined, 'ar'), getData(`/client/products/${id}`, undefined, 'en').catch(() => null)]));
  if (!ar?.product) throw notFound(t('لا توجد منتجات مطابقة', 'No matching products'));
  const { product, variants } = fromDetail(ar, en);
  product.slug = String(slug); // keep the URL the visitor came with (canonical stays stable)
  const { products } = await loadBase();
  const related = products.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4);
  return { product, variants, related };
}

export async function getProductsByIds(ids = []) {
  const wanted = ids.map(String);
  const { products } = await loadBase();
  return products.filter((p) => wanted.includes(String(p.id)));
}

// ------------------------------------------------------------------------------------------------ content (partial)
/** Categories + products come from the backend; the rest of the home page (sections, hero, texts) stays as the mock. */
export async function realHomeParts() {
  const { products, categories } = await loadBase();
  const ordered = products.slice().sort(SORTERS.featured);
  return { categories, products: ordered.slice(0, 8), preorderProducts: products.filter((p) => p.is_preorder), bestsellers: [] };
}

export async function realSitemapParts() {
  const { products, categories } = await loadBase();
  return { products: products.map((p) => ({ slug: p.slug })), categories: categories.map((c) => ({ slug: c.slug })) };
}

/** Contact form: { name, email, phone?, message } -> POST /client/contact { full_name, email, content }. */
export async function sendContactMessage({ name, email, phone, message }) {
  const body = new FormData();
  body.append('full_name', name || '');
  body.append('email', email || '');
  body.append('content', phone ? `${message}\n\n${phone}` : message || '');
  try {
    await api.post('/client/contact', body);
  } catch (error) {
    // Checked on the live backend: guests get 401 here although the route is meant to be public. Say so instead of
    // showing "session expired" (or pretending the message was sent).
    if (error?.status === 401) throw unsupported(t('تعذر إرسال الرسالة حالياً (الخدمة تتطلب تسجيل الدخول). حاول لاحقاً.', 'Could not send your message right now (the service requires a login). Please try later.'));
    throw error;
  }
  return { success: true };
}

// ------------------------------------------------------------------------------------------------ cart
const GUEST_KEY = 'tamrna.web.guest_token';
/** Guests are identified by a random token the backend stores the cart under. */
function guestToken() {
  let token = safeStorage.get(GUEST_KEY);
  if (!token) {
    token = randomToken(16);
    safeStorage.set(GUEST_KEY, token);
  }
  return token;
}

/** Variant prices of products seen in the cart (the backend cart answers 0.00 for them, so read the product). */
const variantPrices = new Map();
async function variantPrice(productId, variantId) {
  const key = `${productId}:${variantId}`;
  if (!variantPrices.has(key)) {
    const data = await getData(`/client/products/${productId}`, undefined, 'ar');
    (data?.product?.variants || []).forEach((v) => variantPrices.set(`${productId}:${v.id}`, round2(v.effective_price ?? v.base_price ?? 0)));
  }
  return variantPrices.get(key) ?? 0;
}

async function toSummary(data) {
  const locale = getClientLocale();
  const lang = locale === 'en' ? 'en' : 'ar';
  const items = await Promise.all(
    (data?.items || []).map(async (it) => {
      const v = it.variant || {};
      let unit = Number(v.final_price ?? v.price) || 0;
      if (!(unit > 0)) unit = await variantPrice(it.product?.id, v.id);
      const quantity = Number(it.quantity) || 1;
      return {
        key: String(it.id),
        variant_id: v.id ?? null,
        product_id: it.product?.id ?? null,
        product_slug: String(it.product?.id ?? ''),
        product_name: it.product?.name || '',
        size_name: weightLabel(v.weight, v.weight_unit, lang),
        sku: '',
        image: imageOf(it.product?.image),
        unit_price: unit,
        unit_price_formatted: formatMoney2(unit, locale),
        quantity,
        max_stock: 99,
        is_preorder: false,
        is_fragile: false,
        subtotal: unit * quantity,
        subtotal_formatted: formatMoney2(unit * quantity, locale),
      };
    }),
  );
  const count = items.reduce((s, l) => s + l.quantity, 0);
  const subtotal = items.reduce((s, l) => s + l.subtotal, 0);
  const threshold = DEFAULT_FREE_SHIPPING_THRESHOLD;
  return {
    items,
    count,
    item_count: count,
    subtotal,
    subtotal_formatted: formatMoney2(subtotal, locale),
    discount: 0,
    discount_formatted: formatMoney2(0, locale),
    coupon_code: null,
    coupon_details: null,
    total: subtotal,
    total_formatted: formatMoney2(subtotal, locale),
    free_shipping_threshold: threshold,
    free_shipping_remaining: Math.max(0, threshold - subtotal),
    free_shipping_progress: threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 100,
    is_free_shipping: subtotal >= threshold,
  };
}

const guestQuery = () => ({ guest_token: guestToken() });

export async function getCart() {
  return toSummary(await getData('/client/cart', guestQuery()));
}

/** A mutation answers with the cart; fall back to reading it when the answer has another shape. */
const cartFrom = async (res) => (Array.isArray(unwrap(res)?.items) ? toSummary(unwrap(res)) : getCart());

export async function addItem({ productId, variantId, quantity = 1 }) {
  let variant = variantId;
  if (!variant) {
    if (!productId) throw unsupported(t('بيانات المنتج غير صحيحة', 'Invalid product data'));
    const detail = await getData(`/client/products/${productId}`, undefined, 'ar');
    const variants = detail?.product?.variants || [];
    variant = (variants.find((v) => v.is_default) || variants[0])?.id;
    if (!variant) throw notFound(t('المنتج غير موجود', 'Product not found'));
  }
  const body = new FormData();
  body.append('product_variant_id', String(variant));
  body.append('quantity', String(Math.max(1, Number(quantity) || 1)));
  body.append('guest_token', guestToken());
  const res = await api.post('/client/cart/add', body);
  return { message: res?.message || t('تمت إضافة التمر إلى سلة التسوق بنجاح', 'Added to your cart'), cart: await cartFrom(res) };
}

export async function updateItem({ key, quantity }) {
  if (!(Number(quantity) > 0)) return removeItem({ key });
  const body = new FormData();
  body.append('_method', 'put');
  body.append('quantity', String(Number(quantity)));
  // Item routes take the guest token in the query string.
  return { cart: await cartFrom(await api.post(`/client/cart/items/${key}?guest_token=${encodeURIComponent(guestToken())}`, body)) };
}

export async function removeItem({ key }) {
  const res = await api.delete(`/client/cart/items/${key}?guest_token=${encodeURIComponent(guestToken())}`);
  return { message: t('تم حذف الصنف من السلة', 'Item removed from cart'), cart: await cartFrom(res) };
}

export async function clearCart() {
  const res = await api.delete(`/client/cart/clear?guest_token=${encodeURIComponent(guestToken())}`);
  return { cart: await cartFrom(res) };
}

// The backend has no coupons / gift cards in the cart yet.
export async function applyCoupon() {
  throw unsupported(t('أكواد الخصم غير متاحة حالياً', 'Coupons are not available yet'));
}
export async function removeCoupon() {
  return { cart: await getCart() };
}
export async function addGiftCard() {
  throw unsupported(t('بطاقات الإهداء غير متاحة في السلة حالياً', 'Gift cards cannot be added to the cart yet'));
}
