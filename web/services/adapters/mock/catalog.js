import { effectivePrice } from '@tamrna/shared/utils';
import { db, latency, fail } from './db';

const withCategory = (p) => {
  const c = db.find('categories', p.category_id);
  return { ...p, category_name_ar: c?.name_ar, category_name_en: c?.name_en, category_slug: c?.slug };
};

/**
 * Ports CatalogController::catalog(). Filters: cat, filter=preorder, search, sort, price_min, price_max,
 * availability[].
 *
 * @param {object} [params]
 * @param {string} [params.cat]
 * @param {string} [params.filter]
 * @param {string} [params.search]
 * @param {string} [params.sort]
 * @param {number|null} [params.price_min]
 * @param {number|null} [params.price_max]
 * @param {string[]} [params.availability]
 */
export async function getCatalog(params = {}) {
  await latency(0);
  const { cat, filter, search = '', sort = 'featured', price_min = null, price_max = null, availability = [] } = params;
  const published = db.where('products', (p) => p.status === 'published');
  const prices = published.map(effectivePrice);
  const bounds = {
    min: prices.length ? Math.floor(Math.min(...prices)) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
  };

  const categories = db
    .all('categories')
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((c) => ({ ...c, count: published.filter((p) => p.category_id === c.id).length }));

  let rows = published.map(withCategory);

  if (cat) rows = rows.filter((p) => String(p.category_id) === String(cat) || p.category_slug === cat);
  if (filter === 'preorder') rows = rows.filter((p) => p.is_preorder);
  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter((p) =>
      [p.name_ar, p.name_en, p.description_ar, p.description_en].some((v) => String(v || '').toLowerCase().includes(term)),
    );
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

  const sorters = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    bestseller: (a, b) => b.is_bestseller - a.is_bestseller || b.sales_count - a.sales_count,
    featured: (a, b) => b.is_featured - a.is_featured || a.id - b.id,
  };
  rows = rows.slice().sort(sorters[sort] || sorters.featured);

  return { products: rows, categories, bounds };
}

export async function getProduct(slug) {
  await latency(0);
  const product = db
    .where('products', (p) => p.status === 'published')
    .find((p) => p.slug === slug || String(p.id) === String(slug));
  if (!product) fail('لا توجد منتجات مطابقة', 404);
  const variants = db.where('product_variants', (v) => v.product_id === product.id).sort((a, b) => a.price - b.price);
  const related = db
    .where('products', (p) => p.status === 'published' && p.category_id === product.category_id && p.id !== product.id)
    .slice(0, 4)
    .map(withCategory);
  return { product: withCategory(product), variants, related };
}

export async function getProductsByIds(ids = []) {
  await latency(0);
  const wanted = ids.map(String);
  return db.where('products', (p) => p.status === 'published' && wanted.includes(String(p.id))).map(withCategory);
}
