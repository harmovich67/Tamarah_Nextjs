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

/**
 * A read is retried once when the connection itself failed ("fetch failed": the request never got an answer, seen from the
 * Next server now and then). Answers with a status, and timeouts, are not retried.
 */
async function apiGet(path, query, opts) {
  try {
    return await api.get(path, query, opts);
  } catch (error) {
    if (error?.code !== ERROR_CODES.NETWORK) throw error;
    return api.get(path, query, opts);
  }
}

async function fetchAll(path, params, lang) {
  const out = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await apiGet(path, { ...params, page, per_page: 100 }, inLang(lang));
    const rows = rowsOf(res);
    out.push(...rows);
    if (!rows.length || page >= lastPageOf(res)) break;
  }
  return out;
}

const getData = async (path, query, lang) => unwrap(await apiGet(path, query, lang ? inLang(lang) : undefined));

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

/**
 * `tracked`: some pack of the product reports a stock above zero. The public answer gives `stock: 0` for the packs of EVERY product,
 * including products the dashboard holds stock for (their stock is kept on the product, which the public answer does not expose;
 * checked on the live server, the checkout then sells them). So a 0 on all packs means "unknown" and the pack counts as available;
 * the checkout answers 422 when there is really no stock. Only when a pack reports a positive stock are the numbers trusted.
 */
function mapVariant(v, productStock, tracked = false) {
  const base = Number(v.base_price) || 0;
  const effective = round2(v.effective_price ?? base);
  const discounted = effective > 0 && effective < base;
  const stock = tracked ? Number(v.stock) || 0 : productStock;
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
  const tracked = (ar.variants || []).some((v) => Number(v.stock) > 0);
  const variants = (ar.variants || []).map((v) => mapVariant(v, productStock, tracked)).sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
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
/**
 * The list answer (`GET /client/products`) has two gaps (checked on the live server): its `image` is always the default
 * placeholder (the pictures uploaded in the dashboard exist only in the product's `gallery`), and it carries no stock (every
 * row is `is_purchasable: true`, so the cards would offer "Add to cart" while the product page says "Out of stock").
 * Both come from the detail answer, which the product page already uses: read it for each product, a few at a time.
 */
async function withDetails(products) {
  const queue = [...products];
  // One slow answer (~0.7 s, and the server does not speed up under parallel load) per product: a few at a time and kept for
  // five minutes (the stock on a card can lag a little: the product page, the cart and the checkout use the real stock).
  const detail = (id) => cached(`detail-ar:${id}`, 300_000, () => getData(`/client/products/${id}`, undefined, 'ar'));
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try {
        const { product } = fromDetail(await detail(p.id), null);
        if (product.featured_image) p.featured_image = product.featured_image;
        p.stock_quantity = product.stock_quantity;
      } catch {
        /* keep the list values for this product */
      }
    }
  });
  await Promise.all(workers);
  return products;
}

/** Every published product (ar + en merged) and the categories derived from them (or from /client/departments). */
async function loadBase() {
  return cached('base', 120_000, async () => {
    const [arRows, enRows] = await Promise.all([fetchAll('/client/products', {}, 'ar'), fetchAll('/client/products', {}, 'en')]);
    const enById = new Map(enRows.map((r) => [r.id, r]));
    const products = await withDetails(arRows.map((r) => fromListRow(r, enById.get(r.id))));
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
  const feed = await homeFeed();
  // "Most ordered" is decided by the backend; with none the section is simply not shown.
  const bestsellers = feed.mostOrderedIds.map((id) => products.find((p) => String(p.id) === String(id))).filter(Boolean).slice(0, 4);
  const parts = { categories, products: ordered.slice(0, 8), preorderProducts: products.filter((p) => p.is_preorder), bestsellers };
  const banners = await realBanners();
  // Hero slides come from the dashboard banners (placement `home`); with none published the demo slides stay.
  // `featureCards` (dashboard "Features", type home) and `reviewCards` (visible reviews) replace the demo copy of the
  // home page sections when the backend has any; the page keeps its default copy otherwise.
  return { ...parts, ...(banners.length ? { banners } : {}), featureCards: feed.featureCards, reviewCards: feed.reviewCards };
}

/**
 * `GET /general/branches` (public, the dashboard "Branches" screen) in ar + en, shaped like `data/branches.js`
 * (`{ ar: [...], en: [...] }`). Returns null when the backend has none so the page keeps its bundled branches.
 * Missing phone / opening hours come back empty and the page falls back to the store phone / a dash.
 */
export async function getBranches() {
  try {
    const [ar, en] = await Promise.all([
      cached('branches:ar', CATALOG_TTL, () => getData('/general/branches', undefined, 'ar')),
      cached('branches:en', CATALOG_TTL, () => getData('/general/branches', undefined, 'en').catch(() => null)),
    ]);
    if (!Array.isArray(ar) || !ar.length) return null;
    const enById = new Map((Array.isArray(en) ? en : []).map((b) => [b.id, b]));
    const shape = (b) => ({
      id: b.id,
      city: String(b.city?.name ?? '').trim(),
      name: b.name || '',
      address: b.address || '',
      phone: b.phone || '',
      hours: b.opening_hours || '',
      badge: '',
    });
    return { ar: ar.map(shape), en: ar.map((b) => shape(enById.get(b.id) || b)) };
  } catch {
    return null;
  }
}

/** `GET /client/home` in ar + en: the pieces of the home page that the dashboard controls besides the hero banners. */
async function homeFeed() {
  const empty = { mostOrderedIds: [], featureCards: [], reviewCards: [] };
  try {
    const [ar, en] = await Promise.all([
      cached('home:ar', CATALOG_TTL, () => getData('/client/home', undefined, 'ar')),
      cached('home:en', CATALOG_TTL, () => getData('/client/home', undefined, 'en').catch(() => null)),
    ]);
    const enById = new Map((en?.features || []).map((f) => [f.id, f]));
    const featureCards = (ar?.features || [])
      .filter((f) => f.is_active !== false)
      .map((f) => {
        const other = enById.get(f.id) || f;
        return { title_ar: f.title || '', title_en: other.title || f.title || '', desc_ar: f.description || '', desc_en: other.description || f.description || '', image: imageOf(f.image) };
      });
    const reviewRows = Array.isArray(ar?.reviews?.data) ? ar.reviews.data : Array.isArray(ar?.reviews) ? ar.reviews : [];
    const enReviews = new Map((Array.isArray(en?.reviews?.data) ? en.reviews.data : []).map((r) => [r.id, r]));
    const reviewCards = reviewRows
      .filter((r) => ![true, 1].includes(r.is_hide ?? r.is_hidden))
      .map((r) => {
        const who = r.client ?? r.user ?? {};
        const name = r.client_name || who.full_name || who.name || [who.first_name, who.last_name].filter(Boolean).join(' ') || r.name || '';
        return { id: r.id, name, name_en: enReviews.get(r.id)?.client_name || name, city: '', rating: Number(r.rate ?? r.rating) || 5, comment: r.comment || '', product_name: '' };
      })
      .filter((r) => r.comment);
    return { mostOrderedIds: (ar?.most_ordered || []).map((p) => p.id), featureCards, reviewCards };
  } catch {
    return empty;
  }
}

// A number counts as on when positive: `accept_gift_card_amount` is a float on the backend (it used to hold 100).
const truthy = (v) => ['1', 'true', 'yes', 'on'].includes(String(v ?? '').trim().toLowerCase()) || Number(v) > 0;

/**
 * `GET /general/settings`: public key / value settings of the backend ({ key, value, group, type }). They are exposed under
 * their own key (e.g. `accept_gift_card_amount`) and, when filled, mapped onto the storefront's contact keys
 * (`phone` -> contact_phone, `whats_app` -> contact_whatsapp, `support_email` -> contact_email).
 */
export async function realSettings() {
  try {
    const rows = await cached('settings', CATALOG_TTL, () => getData('/general/settings'));
    const out = {};
    (Array.isArray(rows) ? rows : []).forEach((r) => {
      if (!r?.key) return;
      out[r.key] = r.value ?? '';
    });
    const map = { phone: 'contact_phone', whats_app: 'contact_whatsapp', support_email: 'contact_email' };
    Object.entries(map).forEach(([from, to]) => {
      if (String(out[from] ?? '').trim()) out[to] = out[from];
    });
    return out;
  } catch {
    return {};
  }
}

/**
 * Gift card builder options: the preset amounts of the dashboard (`GET /client/gift-cards`) and whether a custom amount is
 * allowed (`accept_gift_card_amount` setting: shows / hides the "Other value" button; allowed while the setting is absent).
 */
export async function getGiftCardOptions() {
  const [presets, settings] = await Promise.all([
    cached('gift-presets', CATALOG_TTL, () => getData('/client/gift-cards')).catch(() => null),
    realSettings(),
  ]);
  const amounts = (Array.isArray(presets) ? presets : [])
    .filter((p) => p.is_active !== false && Number(p.amount) > 0)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(a.amount) - Number(b.amount))
    .map((p) => Number(p.amount))
    // The dashboard can hold two presets with the same amount: the builder keys its buttons by amount.
    .filter((amount, i, all) => all.indexOf(amount) === i);
  return {
    amounts: amounts.length ? amounts : null,
    acceptCustomAmount: 'accept_gift_card_amount' in settings ? truthy(settings.accept_gift_card_amount) : true,
  };
}

/**
 * `GET /client/about` in `lang`, shaped for the About page: story, pillars, stats, values, performance numbers,
 * sustainability and the quality / commitment gallery. Missing sections come back empty so the page keeps its default copy.
 */
export async function getAbout(lang = 'ar') {
  const d = await cached(`about:${lang}`, CATALOG_TTL, () => getData('/client/about', undefined, lang));
  const list = (v) => (Array.isArray(v) ? v : []);
  const active = (rows) => list(rows).filter((r) => r.is_active !== false);
  const pictures = (m) => list(m).map(imageOf).filter(Boolean);
  const story = d?.our_story;
  const future = d?.future;
  const commitment = d?.commitment;
  return {
    story: story ? { title: story.title || '', description: story.description || '', image: pictures(story.images)[0] || '' } : null,
    // `image` is the picture uploaded in the dashboard for the item (empty for the default placeholder): it replaces the fixed icon.
    pillars: active(story?.features).map((f) => ({ id: f.id, title: f.title || '', description: f.description || '', image: imageOf(f.image) })),
    stats: active(d?.about_features).map((f) => ({ id: f.id, label: f.title || '', value: f.description || '', image: imageOf(f.image) })),
    values: active(d?.principles).map((f) => ({ id: f.id, title: f.title || '', description: f.description || '', image: imageOf(f.image) })),
    performance: list(d?.numbers).filter((n) => n.is_active !== false).map((n) => ({ id: n.id, value: n.number || '', title: n.title || '', description: n.description || '', image: imageOf(n.image) })),
    sustainability: future
      ? {
          title: future.title || '',
          description: future.description || '',
          image: pictures(future.images)[0] || '',
          principles: active(future.features).map((f) => ({ id: f.id, title: f.title || '', description: f.description || '', image: imageOf(f.image) })),
        }
      : null,
    quality: commitment ? { title: commitment.title || '', description: commitment.description || '', images: pictures(commitment.images) } : null,
  };
}

/** `GET /client/home` -> hero slides (`title` / `name` / `description` + image), merged ar + en. */
async function realBanners() {
  try {
    const [ar, en] = await Promise.all([
      cached('home:ar', CATALOG_TTL, () => getData('/client/home', undefined, 'ar')),
      cached('home:en', CATALOG_TTL, () => getData('/client/home', undefined, 'en').catch(() => null)),
    ]);
    const enById = new Map((en?.banners || []).map((b) => [b.id, b]));
    return (ar?.banners || []).map((b, i) => {
      const e = enById.get(b.id) || b;
      return {
        id: b.id,
        badge_ar: b.name || '',
        badge_en: e.name || b.name || '',
        title_ar: b.title || '',
        title_en: e.title || b.title || '',
        subtitle_ar: b.description || '',
        subtitle_en: e.description || b.description || '',
        cta_ar: '',
        cta_en: '',
        link: '/catalog',
        image: imageOf(b.image),
        status: 'active',
        order_index: b.sort_order ?? i + 1,
      };
    });
  } catch {
    return [];
  }
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
// Gift cards are sent straight away by POST /client/gift-cards (see ./checkout.js); there are no coupons in the cart.
export { addGiftCard } from './checkout';

// Customer side of the backend: sign-in, account and checkout.
export * as auth from './auth';
export * as account from './account';
export * as checkout from './checkout';
