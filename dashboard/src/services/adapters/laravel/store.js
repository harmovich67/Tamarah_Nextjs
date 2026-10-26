import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { mapLimit } from '@/lib/imageCompress';
import { packsFromGrams } from '@/lib/stock';
import { toFormData, unwrap } from './helpers';
import { fetchAll, fetchAllBilingual, fetchPage, isOn, listFilters, mediaList, mediaOf, slugPair, tx, txPair, uploadMedia, withFormErrors } from './tamrna';

/**
 * Laravel adapter for the store-management domain (same function names / shapes as adapters/mock/store.js).
 * Categories, products, orders and the dashboard KPIs talk to the Tamrna backend (see ./tamrna.js and ./orders.js for the
 * field translation); warehouses and stock updates still follow docs/API_CONTRACT.md because the collection has none.
 */

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// -------------------------------------------------------------------------------------------- categories
function toCategory(c) {
  const name = txPair(c, 'name');
  const description = txPair(c, 'description');
  const image = mediaOf(c.image ?? c.media);
  return {
    id: c.id,
    name_ar: name.ar,
    name_en: name.en,
    description_ar: tx(c, 'description', 'ar'),
    description_en: tx(c, 'description', 'en'),
    description: description.ar,
    slug: tx(c, 'slug', 'en') || tx(c, 'slug', 'ar'),
    icon: 'tag',
    image: image?.url || '',
    image_id: image?.id ?? null,
    is_active: c.is_active === undefined ? true : isOn(c.is_active),
    sort_order: c.sort_order ?? null,
    products_count: c.products_count ?? null, // the list endpoint does not count products
  };
}

export const listCategories = async (filters) => (await fetchAllBilingual(e.categories.list, listFilters(filters))).map(toCategory);
/**
 * One page of the categories grid, paged / searched / filtered by the backend in ONE request (`page`, `per_page`, `search`,
 * `filters[is_active]`). The list answers `{ id, name, sort_order, is_active, image, parent, children_count }` in the current
 * language only (no slug, no product count): the edit form reads the full record.
 */
export async function listCategoriesPage({ page = 1, per_page = 12, search, is_active } = {}) {
  const { rows, ...paging } = await fetchPage(e.categories.list, { ...listFilters({ search, is_active }), page, per_page });
  return { rows: rows.map(toCategory), ...paging };
}
export const getCategory = async (id) => toCategory(unwrap(await api.get(e.categories.item(id))));

async function categoryBody(values) {
  const slugs = slugPair(values);
  const name_en = (values.name_en || '').trim() || values.name_ar;
  const body = {
    en: { name: name_en, description: (values.description_en || '').trim(), slug: slugs.en },
    ar: { name: values.name_ar, description: (values.description_ar || '').trim(), slug: slugs.ar },
    is_active: values.is_active ?? true,
  };
  if (values.sort_order !== undefined && values.sort_order !== null && values.sort_order !== '') body.sort_order = values.sort_order;
  if (values.image_file instanceof File) body.image = await uploadMedia(values.image_file, { model: 'Category', option: 'image' });
  return body;
}

export const createCategory = (values) =>
  withFormErrors(categoryBody(values).then((body) => api.post(e.categories.list, toFormData(body)).then((r) => toCategory(unwrap(r)))));
// Laravel cannot read multipart bodies on PUT: send POST with _method=PUT.
export const updateCategory = (id, values) =>
  withFormErrors(categoryBody(values).then((body) => api.post(e.categories.item(id), toFormData({ ...body, _method: 'PUT' })).then((r) => toCategory(unwrap(r)))));
export const deleteCategory = async (id) => api.delete(e.categories.item(id));
export const toggleCategory = async (id) => unwrap(await api.post(e.categoryStatus(id)));
/** @param {Record<string, number>} order category id -> position */
export const sortCategories = async (order) => api.post(e.categorySortOrder, toFormData({ order }));

// ---------------------------------------------------------------------------------------------- products
const categoryIdsOf = (p) => p.category_ids ?? (p.categories ? p.categories.map((c) => c.id) : p.category_id ? [p.category_id] : []);

/** Price after the variant discount (percentage or fixed amount). */
function finalPrice(v) {
  const base = Number(v.base_price ?? v.price ?? 0);
  const value = Number(v.discount_value ?? 0);
  if (!isOn(v.discount_active) || !(value > 0)) return base;
  return Math.max(0, v.discount_type === 'percentage' ? base * (1 - value / 100) : base - value);
}

// The backend sends decimals as strings ("250.0000").
const variantLabel = (v) => `${v.weight === undefined || v.weight === null ? '' : Number(v.weight)} ${v.weight_unit ?? ''}`.trim();

/** A backend variant as a form row (price, weight + unit and the discount as a percentage). */
function toVariantForm(v) {
  const base = Number(v.base_price ?? v.price ?? 0);
  const value = Number(v.discount_value ?? 0);
  let discount = '';
  if (value > 0) discount = v.discount_type === 'percentage' ? value : base > 0 ? round((value / base) * 100) : '';
  return {
    id: v.id,
    weight: v.weight === undefined || v.weight === null ? '' : Number(v.weight),
    weight_unit: v.weight_unit || 'g',
    price: base,
    discount_percent: discount,
    size_name: variantLabel(v),
    size_name_en: '',
    sku: '',
    sale_price: '',
    stock_quantity: v.stock ?? '', // per-pack stock (only meaningful for box products)
  };
}

const defaultVariant = (variants) => variants.find((v) => isOn(v.is_default)) || variants[0];

const numOrNull = (x) => (x === null || x === undefined || x === '' ? null : Number(x));

/**
 * Stock shown in the list, in packs. Box products (is_box) keep it inside each variant. The others keep one stock in GRAMS
 * (see lib/stock.js): it is shown as the number of default packs it covers, which is what the checkout will sell.
 * The list endpoint only carries the default variant, so for a box product with several packs this is a lower bound.
 */
function totalStock(p, variants, def) {
  if (!isOn(p.is_box)) {
    const grams = numOrNull(p.stock);
    return def ? packsFromGrams(grams, def.weight, def.weight_unit) ?? grams : grams;
  }
  const known = (variants.length ? variants : def ? [def] : []).map((v) => numOrNull(v.stock)).filter((n) => n !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

/**
 * List rows carry `default_variant` + `price_range` and category *names*; the show endpoint carries full `variants` and
 * category objects. Both are handled here (a category given by name is matched against the category list).
 */
function toProductRow(p, categories) {
  const variants = p.variants || [];
  const def = p.default_variant || defaultVariant(variants);
  let min = 0;
  let max = 0;
  if (variants.length) {
    const prices = variants.map(finalPrice);
    min = Math.min(...prices);
    max = Math.max(...prices);
  } else if (p.price_range) {
    max = Number(p.price_range.max) || 0;
    min = Math.min(Number(p.price_range.min) || 0, def?.effective_price ?? Infinity);
    min = Number.isFinite(min) ? round(min) : 0;
  }
  const entries = p.categories_ar ?? p.categories ?? [];
  const ids = [];
  const names = [];
  for (const entry of entries) {
    const found = typeof entry === 'object' ? categories.find((c) => c.id === entry.id) : categories.find((c) => c.name_ar === entry || c.name_en === entry);
    if (found) ids.push(found.id);
    names.push(typeof entry === 'string' ? entry : found?.name_ar || '');
  }
  if (!ids.length) ids.push(...(p.category_ids ?? []));
  const cat = categories.find((c) => c.id === ids[0]);
  const name = txPair(p, 'name');
  const gallery = mediaList(p.gallery?.length ? p.gallery : p.image);
  return {
    id: p.id,
    name_ar: name.ar,
    name_en: name.en,
    slug: tx(p, 'slug', 'en') || tx(p, 'slug', 'ar'),
    featured_image: gallery[0]?.url || '',
    category_id: ids[0] ?? '',
    category_ids: ids,
    category_names: names,
    category_name_ar: cat?.name_ar ?? names[0],
    category_name_en: cat?.name_en ?? names[0],
    category_slug: cat?.slug,
    weight: def ? variantLabel(def) : '',
    badge: '',
    variants_count: variants.length,
    min_price: min,
    max_price: max,
    total_stock: totalStock(p, variants, def),
    stock_grams: isOn(p.is_box) ? null : numOrNull(p.stock),
    stock_out: !!p.stock_status?.is_out_of_stock,
    is_box: isOn(p.is_box),
    is_preorder: p.availability === 'preorder',
    availability: p.availability,
    status: isOn(p.is_published) ? 'published' : 'draft',
    is_active: p.is_active === undefined ? true : isOn(p.is_active),
  };
}

/**
 * @param {{ cat?: string, search?: string, is_active?: boolean | 0 | 1 }} [params] cat = category slug or id; the backend filters
 *   by it (`filters[category_id]`) and by `filters[is_active]` / `search` (checked on the live server)
 */
export async function listProducts({ cat, ...filters } = {}) {
  const categories = await listCategories();
  const wanted = cat ? categories.find((c) => c.slug === cat || String(c.id) === String(cat)) : null;
  if (cat && !wanted) return []; // a category that does not exist has no products
  const params = listFilters({ ...filters, filters: { ...filters.filters, ...(wanted ? { category_id: wanted.id } : {}) } });
  const products = await fetchAllBilingual(e.products.list, params);
  return products.map((p) => toProductRow(p, categories)).sort((x, y) => y.id - x.id);
}

export async function getProduct(id) {
  const [raw, categories] = await Promise.all([api.get(e.products.item(id)).then(unwrap), listCategories()]);
  const row = toProductRow(raw, categories);
  const gallery = mediaList(raw.gallery ?? raw.images ?? raw.media);
  // The form treats the first pack as the default one (is_default is re-sent by position on save), so list it first.
  const variants = (raw.variants || [])
    .slice()
    .sort((a, b) => Number(isOn(b.is_default)) - Number(isOn(a.is_default)))
    .map(toVariantForm);
  return {
    product: {
      ...row,
      description_ar: tx(raw, 'description', 'ar'),
      description_en: tx(raw, 'description', 'en'),
      name_ar: tx(raw, 'name', 'ar') || row.name_ar,
      name_en: tx(raw, 'name', 'en') || row.name_en,
      slug_en: tx(raw, 'slug', 'en'),
      slug_ar: tx(raw, 'slug', 'ar'),
      sku: raw.barcode ?? '',
      is_fragile: isOn(raw.is_fragile),
      price: 0,
      sale_price: null,
      stock_quantity: raw.stock ?? 0, // product-level stock (is_box = false)
      preorder_date: '',
      gallery_existing: gallery,
      extras: {
        show_purchase_count: isOn(raw.show_purchase_count),
        manual_purchase_count: raw.manual_purchase_count ?? undefined,
        is_featured_override: isOn(raw.is_featured_override),
        is_active: row.is_active,
      },
    },
    variants,
    categories,
  };
}

export const listProductFormOptions = async () => ({ categories: await listCategories() });

async function productBody(values) {
  const slugs = values.slug_en || values.slug_ar ? { en: values.slug_en, ar: values.slug_ar } : slugPair({ name_en: values.name_en, name_ar: values.name_ar });
  const name_en = (values.name_en || '').trim() || values.name_ar;
  const existing = values.gallery_existing || [];
  // The pictures upload three at a time (in order of the gallery) instead of one after the other.
  const gallery = (
    await mapLimit(values.gallery || [], 3, async (item) => {
      if (item instanceof File) return uploadMedia(item, { model: 'Product', option: 'gallery' });
      return existing.find((m) => m.url === item)?.id ?? null;
    })
  ).filter((id) => id !== null && id !== undefined);
  // Keep an unavailable product unavailable; the form only knows "pre-order or not".
  const availability = values.is_preorder ? 'preorder' : values.availability && values.availability !== 'preorder' ? values.availability : 'available';
  const extras = values.extras || {};
  // is_box = false: one product-level stock; is_box = true: the stock lives inside each variant.
  const isBox = !!values.is_box;
  return {
    barcode: values.sku || undefined,
    is_box: isBox,
    stock: isBox ? undefined : numOrNull(values.stock_quantity) ?? undefined,
    is_fragile: !!values.is_fragile,
    show_purchase_count: !!extras.show_purchase_count,
    manual_purchase_count: extras.manual_purchase_count,
    availability,
    is_published: values.status !== 'draft',
    is_featured_override: !!extras.is_featured_override,
    is_active: extras.is_active ?? true,
    gallery,
    category_ids: [values.category_id],
    variants: (values.variants || []).map((v, i) => {
      const pct = Number(v.discount_percent) || 0;
      return {
        id: v.id,
        weight: v.weight,
        weight_unit: v.weight_unit || 'g',
        base_price: v.price,
        stock: isBox ? numOrNull(v.stock_quantity) ?? undefined : undefined,
        is_default: i === 0,
        discount_type: pct > 0 ? 'percentage' : undefined,
        discount_value: pct > 0 ? pct : undefined,
        discount_active: pct > 0,
      };
    }),
    en: { name: name_en, description: (values.description_en || '').trim(), slug: slugs.en },
    ar: { name: values.name_ar, description: (values.description_ar || '').trim(), slug: slugs.ar },
  };
}

export const createProduct = (values) => withFormErrors(productBody(values).then((body) => api.post(e.products.list, toFormData(body)).then(unwrap)));
export const updateProduct = (id, values) =>
  withFormErrors(productBody(values).then((body) => api.post(e.products.item(id), toFormData({ ...body, _method: 'PUT' })).then(unwrap)));
export const deleteProduct = async (id) => api.delete(e.products.item(id));
export const toggleProductPublished = async (id) => unwrap(await api.post(e.productPublished(id)));
export const updateStock = async ({ variantId, stock }) => unwrap(await api.post(e.variantStock(variantId), { stock }));

// --------------------------------------------------------------------------------------------- warehouses
export const listWarehouses = async () => unwrap(await api.get(e.warehouses.list));
export const createWarehouse = async (values) => unwrap(await api.post(e.warehouses.list, values));
export const updateWarehouse = async (id, values) => unwrap(await api.put(e.warehouses.item(id), values));
export const deleteWarehouse = async (id) => api.delete(e.warehouses.item(id));

// Orders + dashboard KPIs: ./orders.js. The backend has no waybill endpoint; the screen hides the button in laravel mode.
export { listOrders, getOrder, updateOrderStatus, deleteOrder, getDashboardStats } from './orders';
