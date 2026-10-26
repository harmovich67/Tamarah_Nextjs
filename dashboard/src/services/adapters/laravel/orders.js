import { ApiError, ERROR_CODES } from '@tamrna/shared/api';
import { allowedOrderStatuses } from '@tamrna/shared/constants';
import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { unwrap } from './helpers';
import { fetchAll, listFilters, mediaList, tx, txPair } from './tamrna';

/**
 * Orders + dashboard KPIs of the Tamrna backend (Postman collection `tomorona`: `GET /admin/orders`, `GET /admin/orders/{id}`,
 * `POST /admin/orders/{id}/process|ready|deliver|complete|cancel`, `GET /admin/home`). The collection has no response
 * examples, so every field is read through a list of candidate names; if a screen shows blanks compare the real response
 * with the `pick(...)` lists below.
 */

const pick = (obj, keys, fallback = undefined) => {
  for (const k of keys) {
    const v = k.split('.').reduce((o, part) => (o === null || o === undefined ? undefined : o[part]), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
};
const num = (obj, keys) => Number(pick(obj, keys, 0)) || 0;
const text = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.name ?? v.title ?? '' : v == null ? '' : String(v));

/**
 * Backend status -> the five shipping statuses the screens know. Seen on the live server: pending -> processing (process)
 * -> ready (branch pickup only) / deleveried (sic, deliver) -> completed (complete); cancelled (cancel).
 */
const STATUS_IN = {
  pending: 'pending',
  new: 'pending',
  processing: 'processing',
  preparing: 'processing',
  ready: 'ready',
  delivering: 'delivered',
  shipped: 'delivered',
  out_for_delivery: 'delivered',
  deleveried: 'delivered',
  delivered: 'delivered',
  completed: 'completed',
  complete: 'completed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
};

/**
 * Screen status -> backend action (POST /admin/orders/{id}/<action>).
 * - For branch pickup: pending -> process -> ready -> complete
 * - For delivery: pending -> process -> deliver -> complete
 * - Cancel: cancel
 */
const actionFor = (status, order) => {
  const isBranch = order?.is_branch || order?.shipping_type === 'branch_pickup' || order?.shipping_type === 'branch' || order?.delivery_type === 'branch' || !!order?.branch_id;
  if (status === 'processing') return 'process';
  if (status === 'ready') return 'ready';
  if (status === 'delivered') return isBranch ? 'ready' : 'deliver';
  if (status === 'shipped') return isBranch ? 'ready' : 'deliver';
  if (status === 'completed') return 'complete';
  if (status === 'cancelled') return 'cancel';
  return undefined;
};

const shippingStatusOf = (o) => STATUS_IN[String(pick(o, ['status', 'order_status'], 'pending')).toLowerCase()] ?? 'pending';

function customerOf(o) {
  const c = pick(o, ['client', 'user', 'customer'], {});
  const name = pick(c, ['full_name', 'name']) || [c.first_name, c.last_name].filter(Boolean).join(' ');
  return {
    // `user.name` is null on the live server: fall back to the e-mail / phone so the row is never blank.
    name: name || pick(o, ['customer_name', 'client_name'], '') || c.email || c.phone || '',
    phone: String(pick(c, ['phone', 'mobile']) ?? pick(o, ['customer_phone', 'phone'], '')),
    email: pick(c, ['email']) ?? pick(o, ['customer_email'], ''),
  };
}

function addressOf(o) {
  const a = pick(o, ['address', 'shipping_address'], {});
  if (typeof a === 'string') return { city: text(pick(o, ['city'], '')), line: a };
  const parts = [a.street, a.district, a.national_address].filter(Boolean);
  return { city: text(pick(a, ['city', 'city_name'], '') || pick(o, ['city'], '')), line: parts.join('، ') };
}

function toItem(i, idx) {
  const product = i.product ?? {};
  const variant = i.variant ?? i.product_variant ?? {};
  const name = txPair(product.id ? product : i, 'name');
  const qty = num(i, ['quantity', 'qty']);
  const unit = num(i, ['price', 'unit_price']) || num(variant, ['effective_price', 'base_price']);
  const weight = variant.weight !== undefined && variant.weight !== null ? `${Number(variant.weight)} ${variant.weight_unit ?? ''}`.trim() : '';
  return {
    id: i.id ?? idx,
    product_name: name.ar,
    product_name_ar: name.ar,
    product_name_en: name.en,
    size_name: weight,
    quantity: qty,
    unit_price: unit,
    subtotal: num(i, ['total', 'subtotal']) || unit * qty,
    featured_image: mediaList(product.gallery?.length ? product.gallery : product.image)[0]?.url || '',
  };
}

const itemsOf = (o) => pick(o, ['items', 'order_items', 'products'], []).map(toItem);

function extractDeliveryType(o) {
  const v = pick(o, [
    'delivery_type',
    'shipping_type',
    'delivery_method',
    'shipping_method',
    'delivery_option',
    'shipping_option',
    'receive_type',
    'pickup_type',
    'type',
    'order_type',
  ]);
  if (!v) return '';
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    return String(v.key || v.code || v.value || v.slug || v.type || v.name || v.id || '').trim().toLowerCase();
  }
  return String(v).trim().toLowerCase();
}

function isBranchOrder(o, addressLine = '') {
  const rawDelivery = extractDeliveryType(o);
  const branch = pick(o, ['branch', 'store', 'pickup_branch'], null);
  const branchId = pick(o, ['branch_id', 'store_id', 'pickup_branch_id'], null);

  const hasBranch = Boolean(
    (branchId && String(branchId) !== '0') ||
    (branch && typeof branch === 'object' && Object.keys(branch).length > 0) ||
    (typeof branch === 'string' && branch.trim() !== '') ||
    o.branch_name
  );

  const isPickupFlag = Boolean(
    o.is_pickup === 1 || o.is_pickup === '1' || o.is_pickup === true ||
    o.is_branch === 1 || o.is_branch === '1' || o.is_branch === true ||
    o.pickup === 1 || o.pickup === '1' || o.pickup === true ||
    o.is_delivery === 0 || o.is_delivery === '0' || o.is_delivery === false
  );

  const isReadyStatus = o.status === 'ready' || o.order_status === 'ready' || o.shipping_status === 'ready';

  const deliveryMatches =
    rawDelivery === 'branch' ||
    rawDelivery === 'branch_pickup' ||
    rawDelivery === 'pickup' ||
    rawDelivery === 'from_branch' ||
    rawDelivery === 'store' ||
    rawDelivery === 'store_pickup' ||
    rawDelivery === 'boutique' ||
    rawDelivery === 'takeaway' ||
    rawDelivery === 'self_pickup' ||
    rawDelivery === '2' ||
    rawDelivery.includes('فرع') ||
    rawDelivery.includes('استلام');

  const addrText = typeof o.address === 'string' ? o.address : typeof o.shipping_address === 'string' ? o.shipping_address : addressLine;
  const notesText = String(o.notes || o.note || '');
  const textMatches =
    addrText.includes('فرع') ||
    addrText.includes('استلام') ||
    notesText.includes('فرع') ||
    notesText.includes('استلام');

  const zeroFeeNoAddress = Number(o.shipping_fee ?? o.delivery_fee ?? 0) === 0 && (!addrText || addrText.trim() === '' || addrText === 'العنوان الوطني المسجل');

  return deliveryMatches || hasBranch || isPickupFlag || isReadyStatus || textMatches || zeroFeeNoAddress;
}

function toOrder(input) {
  const o = input?.order && typeof input.order === 'object' ? { ...input.order, ...input } : input || {};
  const customer = customerOf(o);
  const address = addressOf(o);
  const rawDelivery = extractDeliveryType(o);
  const branch = pick(o, ['branch', 'store', 'pickup_branch'], null);
  const branchId = pick(o, ['branch_id', 'store_id', 'pickup_branch_id'], null);
  const isBranch = isBranchOrder(o, address.line);

  const branchName = branch && typeof branch === 'object' ? (branch.name || branch.title || '') : pick(o, ['branch_name', 'pickup_branch'], '');
  const branchAddress = branch && typeof branch === 'object' ? (branch.address || '') : pick(o, ['branch_address'], '');
  const branchCity = branch && typeof branch === 'object' ? (branch.city?.name || branch.city || '') : '';

  const items = itemsOf(o);
  return {
    id: o.id,
    order_number: String(pick(o, ['order_number', 'number', 'code', 'id'], '')),
    created_at: String(pick(o, ['created_at', 'date'], '')),
    customer_name: customer.name,
    customer_phone: customer.phone,
    customer_email: customer.email,
    city: branchCity || address.city || (isBranch ? 'الرياض' : ''),
    shipping_address: isBranch ? (branchAddress || 'استلام مباشر من الفرع المعتمد') : address.line,
    shipping_type: isBranch ? 'branch_pickup' : (rawDelivery || 'delivery'),
    delivery_type: isBranch ? 'branch' : 'delivery',
    is_branch: isBranch,
    branch_id: branchId || branch?.id || (isBranch ? 1 : null),
    branch_name: branchName || (isBranch ? 'فرع تمرنا المعتمد (الرياض)' : ''),
    branch_address: branchAddress || (isBranch ? 'طريق الملك فهد - الرياض' : ''),
    branch_city: branchCity || (isBranch ? 'الرياض' : ''),
    payment_method: String(pick(o, ['payment_method', 'payment.method', 'payment_type'], 'cod')),
    payment_status: String(pick(o, ['payment_status'], 'pending')).toLowerCase(),
    shipping_status: shippingStatusOf(o),
    subtotal: num(o, ['total_items_price', 'subtotal', 'sub_total', 'items_total']),
    shipping_fee: isBranch ? 0 : num(o, ['shipping_fee', 'delivery_fee', 'shipping_cost', 'delivery_price']),
    discount: num(o, ['discount_amount', 'discount', 'coupon_discount']),
    total: num(o, ['total', 'grand_total', 'total_price', 'amount']),
    notes: pick(o, ['notes', 'note'], ''),
    tracking_number: pick(o, ['tracking_number'], ''),
    waybill_id: pick(o, ['waybill_id'], ''),
    items_count: items.length || num(o, ['items_count']),
    items_summary: [...new Set(items.map((i) => i.product_name).filter(Boolean))].join('، '),
    _items: items,
  };
}

/** @param {{ status?: string, payment_status?: 'paid' | 'pending', delivery_type?: 'branch' | 'delivery' | 'private' }} [opts] sent as filters[...] */
export async function listOrders(opts = {}) {
  const rows = await fetchAll(e.orders.list, listFilters({ filters: opts }));
  return rows.map(toOrder).sort((a, b) => b.id - a.id);
}

export async function getOrder(id) {
  const raw = unwrap(await api.get(e.orders.item(id)));
  const src = raw?.order && typeof raw.order === 'object' ? { ...raw.order, ...raw } : raw;
  const order = toOrder(src);
  const items = order._items?.length ? order._items : itemsOf(src);
  const { _items: _, ...rest } = order;
  return { order: { ...rest, subtotal: rest.subtotal || items.reduce((s, i) => s + i.subtotal, 0) }, items };
}

/**
 * The backend changes the status through one POST per step instead of a status field. `payment_status` cannot be changed
 * from here (the collection has no endpoint), so only `shipping_status` is sent.
 */
export async function updateOrderStatus({ id, shipping_status, reason = '' }) {
  const current = await getOrder(id);
  // An order only moves forward: refuse a stage it has already passed (the screen does not offer it, this guards a stale tab).
  const isAllowed = allowedOrderStatuses(current.order.shipping_status, current.order.shipping_type).includes(shipping_status);
  if (shipping_status && shipping_status !== current.order.shipping_status && !isAllowed) {
    const message = 'لا يمكن الانتقال لهذه الحالة أو تغيير طلب في حالته النهائية / Invalid status transition or final order';
    throw new ApiError({ status: 422, code: ERROR_CODES.VALIDATION, message, errors: {}, data: { success: false, message } });
  }
  const action = actionFor(shipping_status, current.order);
  if (action && current.order.shipping_status !== shipping_status) {
    const body = action === 'cancel' && reason ? { cancellation_reason: reason } : undefined;
    try {
      await api.post(e.orderAction(id, action), body);
    } catch (error) {
      // The backend changes the status and then fails (500, missing `order_client_details` table; checked on the live
      // server): keep going when the order did move.
      const after = await getOrder(id);
      if (after.order.shipping_status !== shipping_status) throw error;
    }
  }
  return getOrder(id).then(({ order }) => ({ order }));
}

export const deleteOrder = async (id) => api.delete(e.orders.item(id));

// ------------------------------------------------------------------------------------------------ dashboard
/**
 * `GET /admin/home?date_filter=all|today|week|month|year|custom[&from_date&to_date]`. KPI / list names are not in the
 * collection, hence the candidate lists.
 */
export async function getDashboardStats({ dateFilter = 'all', from, to } = {}) {
  const params = { date_filter: dateFilter };
  if (dateFilter === 'custom') Object.assign(params, { from_date: from, to_date: to });
  const d = unwrap(await api.get(e.dashboard, params)) || {};
  const stats = pick(d, ['statistics', 'stats', 'counts', 'totals'], d);

  const recent = pick(d, ['recent_orders', 'latest_orders'], []);
  const low = pick(d, ['low_stock', 'low_stock_variants', 'low_stock_products'], []);
  const categories = pick(d, ['categories', 'categories_count', 'top_categories'], []);

  return {
    totalSales: num(stats, ['sales.total', 'total_sales', 'sales', 'revenue', 'total_revenue', 'total_amount']),
    totalOrders: num(stats, ['orders.total', 'total_orders', 'orders_count', 'orders']),
    totalProducts: num(stats, ['products.total', 'total_products', 'products_count', 'products']),
    totalCustomers: num(stats, ['customers.total', 'clients.total', 'total_customers', 'total_clients', 'customers_count', 'clients_count', 'customers', 'clients']),
    lowStockCount: num(stats, ['products.low_stock', 'low_stock.total', 'low_stock_count']),
    recentOrders: Array.isArray(recent) ? recent.map(toOrder) : [],
    lowStockVariants: Array.isArray(low)
      ? low.map((v) => {
          const product = v.product ?? v;
          const name = txPair(product, 'name');
          return {
            id: v.id,
            product_name_ar: name.ar,
            product_name_en: name.en,
            featured_image: mediaList(product.gallery?.length ? product.gallery : product.image)[0]?.url || '',
            size_name: v.weight !== undefined && v.weight !== null ? `${Number(v.weight)} ${v.weight_unit ?? ''}`.trim() : '',
            stock_quantity: Number(v.stock ?? v.stock_quantity ?? 0),
          };
        })
      : [],
    categoriesCount: Array.isArray(categories)
      ? categories.map((c) => {
          const name = txPair(c, 'name');
          return { name_ar: name.ar, name_en: name.en, slug: tx(c, 'slug', 'en') || tx(c, 'slug', 'ar'), products_count: num(c, ['products_count', 'count']) };
        })
      : [],
  };
}
