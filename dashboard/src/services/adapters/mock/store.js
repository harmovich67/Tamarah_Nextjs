import { nowSql, slugify } from '@tamrna/shared/utils';
import { db, latency, fail, requireRole, storeUpload, logActivity } from './db';

/**
 * Mock store-management adapter: dashboard KPIs, products (+ variants), categories, warehouses and orders.
 * Ports DashboardController, ProductsController, StructureController and OrdersController.
 */

// ---------------------------------------------------------------------------------------------- dashboard
export async function getDashboardStats() {
  await latency(200);
  requireRole('store_manager');
  const orders = db.all('orders');
  const products = db.where('products', (p) => p.status === 'published');
  const customers = db.where('users', (u) => u.role_id === 3);
  const lowStockVariants = db
    .where('product_variants', (v) => v.stock_quantity <= 20)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 6)
    .map((v) => {
      const p = db.find('products', v.product_id);
      return { ...v, product_name_ar: p?.name_ar, product_name_en: p?.name_en, featured_image: p?.featured_image };
    });
  const recentOrders = [...orders].sort((a, b) => b.id - a.id).slice(0, 6).map((o) => ({ ...o, items_count: db.where('order_items', (i) => i.order_id === o.id).length }));
  const categoriesCount = db
    .all('categories')
    .map((c) => ({ name_ar: c.name_ar, name_en: c.name_en, slug: c.slug, products_count: db.where('products', (p) => p.category_id === c.id).length }))
    .sort((a, b) => b.products_count - a.products_count);
  return {
    totalSales: orders.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total), 0),
    totalOrders: orders.length,
    totalProducts: products.length,
    totalCustomers: customers.length || db.all('users').length,
    lowStockVariants,
    recentOrders,
    categoriesCount,
  };
}

// ---------------------------------------------------------------------------------------------- products
const productRow = (p) => {
  const variants = db.where('product_variants', (v) => v.product_id === p.id);
  const c = db.find('categories', p.category_id);
  const prices = variants.map((v) => Number(v.price));
  return {
    ...p,
    category_name_ar: c?.name_ar,
    category_name_en: c?.name_en,
    variants_count: variants.length,
    total_stock: variants.length ? variants.reduce((s, v) => s + Number(v.stock_quantity), 0) : p.stock_quantity,
    min_price: prices.length ? Math.min(...prices) : p.price,
    max_price: prices.length ? Math.max(...prices) : p.price,
  };
};

/** @param {{ cat?: string }} [params] */
export async function listProducts({ cat } = {}) {
  await latency(200);
  requireRole('store_manager');
  let rows = db.all('products');
  if (cat) {
    const c = db.all('categories').find((x) => x.slug === cat || String(x.id) === String(cat));
    rows = rows.filter((p) => c && p.category_id === c.id);
  }
  return rows.map(productRow).sort((a, b) => b.id - a.id);
}

export async function getProduct(id) {
  await latency(150);
  requireRole('store_manager');
  const product = db.find('products', id);
  if (!product) fail('المنتج غير موجود', 404);
  return { product, variants: db.where('product_variants', (v) => v.product_id === product.id), categories: db.all('categories').slice().sort((a, b) => a.order_index - b.order_index) };
}

export async function listProductFormOptions() {
  await latency(80);
  requireRole('store_manager');
  return { categories: db.all('categories').slice().sort((a, b) => a.order_index - b.order_index) };
}

function validateProduct(v) {
  const errors = {};
  if (!String(v.name_ar || '').trim()) errors.name_ar = ['اسم الصنف بالعربية مطلوب'];
  if (!(Number(v.price) >= 0) || v.price === '' || v.price == null) errors.price = ['السعر مطلوب'];
  if (v.sale_price && Number(v.sale_price) >= Number(v.price)) errors.sale_price = ['سعر العرض يجب أن يكون أقل من السعر الأساسي'];
  if (Object.keys(errors).length) fail('بعض الحقول غير صحيحة', 422, errors);
}

async function applyVariants(productId, values, fallback) {
  const rows = (values.variants || []).filter((v) => String(v.size_name || '').trim());
  db.removeWhere('product_variants', (v) => v.product_id === productId);
  if (!rows.length) {
    db.insert('product_variants', { product_id: productId, size_name: fallback.weight || 'عبوة 1 كجم', size_name_en: '1kg Pack', sku: `${fallback.sku}-01`, price: fallback.price, sale_price: fallback.sale_price, stock_quantity: fallback.stock_quantity, weight_kg: 1 });
    return;
  }
  rows.forEach((v, i) =>
    db.insert('product_variants', {
      product_id: productId,
      size_name: v.size_name,
      size_name_en: v.size_name_en || null,
      sku: v.sku || `${fallback.sku}-${i + 1}`,
      price: Number(v.price ?? fallback.price),
      sale_price: v.sale_price ? Number(v.sale_price) : null,
      stock_quantity: Number(v.stock_quantity ?? fallback.stock_quantity),
      weight_kg: 1,
    }),
  );
}

const productFields = (v, image) => ({
  category_id: Number(v.category_id) || 1,
  name_ar: String(v.name_ar).trim(),
  name_en: String(v.name_en || '').trim() || String(v.name_ar).trim(),
  description_ar: String(v.description_ar || '').trim(),
  description_en: String(v.description_en || '').trim(),
  price: Number(v.price) || 0,
  sale_price: v.sale_price ? Number(v.sale_price) : null,
  weight: String(v.weight || '1 كجم').trim(),
  stock_quantity: Number(v.stock_quantity ?? 50),
  sku: String(v.sku || '').trim() || `TUM-${100 + Math.floor(Math.random() * 900)}`,
  badge: String(v.badge || '').trim(),
  badge_en: String(v.badge_en || '').trim(),
  is_preorder: v.is_preorder ? 1 : 0,
  preorder_date: String(v.preorder_date || '').trim(),
  is_fragile: v.is_fragile ? 1 : 0,
  featured_image: image,
});

export async function createProduct(values) {
  await latency(400);
  requireRole('store_manager');
  validateProduct(values);
  const upload = await storeUpload(values.image_file);
  const image = upload || String(values.featured_image || '').trim() || 'assets/images/ajwa_luxury_box_1787053900509.jpg';
  const fields = productFields(values, image);
  const slug = `${slugify(fields.name_en || fields.name_ar) || 'date-product'}-${100 + Math.floor(Math.random() * 900)}`;
  const product = db.insert('products', {
    ...fields, slug, status: 'published', rating: 0, rating_count: 0, sales_count: 0, is_featured: 0, is_bestseller: 0, gallery: JSON.stringify([image]), school_id: 1, stage_id: 1,
  });
  await applyVariants(product.id, values, fields);
  logActivity('info', 'admin', `Product created: ${fields.name_ar}`);
  return product;
}

export async function updateProduct(id, values) {
  await latency(400);
  requireRole('store_manager');
  const current = db.find('products', id);
  if (!current) fail('المنتج غير موجود', 404);
  validateProduct(values);
  const upload = await storeUpload(values.image_file);
  const image = upload || String(values.featured_image || current.featured_image).trim();
  const fields = productFields({ ...current, ...values }, image);
  const updated = db.update('products', id, { ...fields, status: values.status || current.status });
  await applyVariants(Number(id), values, fields);
  return updated;
}

export async function deleteProduct(id) {
  await latency(250);
  requireRole('store_manager');
  db.removeWhere('product_variants', (v) => String(v.product_id) === String(id));
  db.remove('products', id);
  return { success: true };
}

export async function updateStock({ variantId, stock }) {
  await latency(150);
  requireRole('store_manager');
  const v = db.update('product_variants', variantId, { stock_quantity: Math.max(0, Number(stock) || 0) });
  if (!v) fail('Variant not found', 404);
  return { stock: v.stock_quantity };
}

// -------------------------------------------------------------------------------------------- categories
export async function listCategories() {
  await latency(150);
  requireRole('store_manager');
  return db.all('categories').slice().sort((a, b) => a.id - b.id).map((c) => ({ ...c, products_count: db.where('products', (p) => p.category_id === c.id).length }));
}

/** Same shape as the laravel adapter's `listCategoriesPage` (demo data paged in the browser). */
export async function listCategoriesPage({ page = 1, per_page = 12, search = '' } = {}) {
  const all = await listCategories();
  const term = String(search).trim().toLowerCase();
  const filtered = all.filter((c) => !term || `${c.name_ar} ${c.name_en} ${c.slug}`.toLowerCase().includes(term));
  return { rows: filtered.slice((page - 1) * per_page, page * per_page), page, lastPage: Math.max(1, Math.ceil(filtered.length / per_page)), total: filtered.length, perPage: per_page };
}

export async function getCategory(id) {
  await latency(80);
  requireRole('store_manager');
  const category = db.find('categories', id);
  if (!category) fail('التصنيف غير موجود', 404);
  return category;
}

async function categoryFields(values, current) {
  const name_ar = String(values.name_ar || '').trim();
  if (!name_ar) fail('اسم التصنيف مطلوب', 422, { name_ar: ['اسم التصنيف بالعربية مطلوب'] });
  const name_en = String(values.name_en || '').trim() || name_ar;
  let slug = String(values.slug || '').trim() || slugify(name_en || name_ar);
  const clash = db.all('categories').some((c) => c.slug === slug && c.id !== current?.id);
  if (!slug || clash) slug = `${slug || 'category'}-${100 + Math.floor(Math.random() * 900)}`;
  const uploaded = await storeUpload(values.image_file);
  return { name_ar, name_en, slug, icon: String(values.icon || 'tag').trim() || 'tag', image: uploaded || current?.image || '' };
}

export async function createCategory(values) {
  await latency(300);
  requireRole('store_manager');
  return db.insert('categories', { ...(await categoryFields(values)), order_index: db.all('categories').length + 1 });
}

export async function updateCategory(id, values) {
  await latency(300);
  requireRole('store_manager');
  const current = db.find('categories', id);
  if (!current) fail('التصنيف غير موجود', 404);
  return db.update('categories', id, await categoryFields(values, current));
}

export async function deleteCategory(id) {
  await latency(250);
  requireRole('super_admin');
  db.remove('categories', id);
  return { success: true };
}

// --------------------------------------------------------------------------------------------- warehouses
export async function listWarehouses() {
  await latency(150);
  requireRole('store_manager');
  const totalInventory = db.all('products').reduce((s, p) => s + Number(p.stock_quantity || 0), 0);
  return db.all('warehouses').map((w) => ({ ...w, products_count: db.all('products').length, total_inventory: totalInventory }));
}

function warehouseFields(v) {
  const name_ar = String(v.name_ar || '').trim();
  if (!name_ar) fail('اسم المستودع مطلوب', 422, { name_ar: ['اسم المستودع بالعربية مطلوب'] });
  return { name_ar, name_en: String(v.name_en || '').trim() || name_ar, code: String(v.code || '').trim(), location: String(v.location || '').trim(), phone: String(v.phone || '').trim(), status: v.status || 'active' };
}

export async function createWarehouse(values) {
  await latency(250);
  requireRole('store_manager');
  return db.insert('warehouses', warehouseFields(values));
}
export async function updateWarehouse(id, values) {
  await latency(250);
  requireRole('store_manager');
  return db.update('warehouses', id, warehouseFields(values));
}
export async function deleteWarehouse(id) {
  await latency(250);
  requireRole('super_admin');
  db.remove('warehouses', id);
  return { success: true };
}

// -------------------------------------------------------------------------------------------------- orders
export async function listOrders() {
  await latency(200);
  requireRole('store_manager');
  return db.all('orders').slice().sort((a, b) => b.id - a.id).map((o) => {
    const items = db.where('order_items', (i) => i.order_id === o.id);
    return { ...o, items_count: items.length, items_summary: [...new Set(items.map((i) => db.find('products', i.product_id)?.name_ar || i.product_name))].join('، ') };
  });
}

export async function getOrder(id) {
  await latency(150);
  requireRole('store_manager');
  const order = db.find('orders', id);
  if (!order) fail('الطلب غير موجود', 404);
  const items = db.where('order_items', (i) => i.order_id === order.id).map((i) => {
    const p = db.find('products', i.product_id);
    const c = p && db.find('categories', p.category_id);
    return { ...i, featured_image: p?.featured_image, product_name_ar: p?.name_ar, product_name_en: p?.name_en, category_name_ar: c?.name_ar };
  });
  return { order, items };
}

export async function updateOrderStatus({ id, shipping_status, payment_status }) {
  await latency(250);
  requireRole('store_manager');
  const patch = {};
  if (shipping_status) patch.shipping_status = shipping_status;
  if (payment_status) patch.payment_status = payment_status;
  const order = db.update('orders', id, patch);
  if (!order) fail('الطلب غير موجود', 404);
  if (payment_status === 'paid') db.where('gift_cards', (g) => g.order_id === order.id && g.status === 'pending').forEach((g) => db.update('gift_cards', g.id, { status: 'active' }));
  logActivity('info', 'order', `Order ${order.order_number} updated`, patch);
  return { order, message: 'تم تحديث حالة الطلب بنجاح' };
}

export async function generateWaybill(id) {
  await latency(700);
  requireRole('store_manager');
  const order = db.find('orders', id);
  if (!order) fail('Order not found', 404);
  const tracking_number = `TMR${Date.now().toString().slice(-9)}`;
  const waybill_id = `WB-${Math.floor(100000 + Math.random() * 900000)}`;
  db.update('orders', id, { tracking_number, waybill_id, shipping_status: 'shipped', updated_at: nowSql() });
  return { tracking_number, waybill_id, tracking_url: `https://bosta.co/tracking-shipments?shipment-number=${tracking_number}`, message: 'تم إصدار بوليصة الشحن المبرد بنجاح!' };
}
