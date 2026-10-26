import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';
import { fetchAll, fetchPage, isOn, listFilters, tx, withFormErrors } from './tamrna';

/**
 * An order placed by the admin on behalf of a customer (Postman: `dashboard / cart` and `dashboard / orders / checkout`).
 * The admin has his own server-side cart (`/admin/cart`): products are added to it, then `POST /admin/checkout` turns it into
 * an order for a registered client (`user_id`) or for a guest customer (name, phone, city, district, street).
 * Checked on the live server: the cart endpoints work; an empty cart answers 422 "السلة فارغة"; `delivery_type` is one of
 * branch / delivery / private and `branch` also needs `branch_id`.
 */
const PHONE_CODE = '966';
const localPhone = (p) => String(p || '').replace(/\D/g, '').replace(/^(966|0)/, '');

const imageOf = (m) => (m && typeof m === 'object' ? m.path || m.url || '' : String(m || ''));

/** The cart answer as the screen reads it. */
function toCart(raw) {
  const items = (raw?.items || []).map((i) => ({
    id: i.id,
    productName: i.product?.name || '',
    image: imageOf(i.product?.image),
    variantId: i.variant?.id,
    weight: i.variant?.weight == null ? '' : `${Number(i.variant.weight)} ${i.variant.weight_unit ?? ''}`.trim(),
    unitPrice: Number(i.variant?.effective_price ?? i.variant?.base_price ?? 0),
    quantity: Number(i.quantity) || 0,
    total: Number(i.line_total) || 0,
  }));
  return { id: raw?.cart_id ?? null, items, count: Number(raw?.total_items) || items.reduce((n, i) => n + i.quantity, 0), subtotal: Number(raw?.subtotal) || 0, currency: raw?.currency || 'SAR' };
}

export const getCart = async () => toCart(unwrap(await api.get(e.adminCart)));
export const addToCart = async ({ variantId, quantity = 1 }) => toCart(unwrap(await api.post(e.adminCartAdd, toFormData({ product_variant_id: variantId, quantity }))));
export const updateCartItem = async ({ id, quantity }) => toCart(unwrap(await api.post(e.adminCartItem(id), toFormData({ quantity, _method: 'PUT' }))));
export const removeCartItem = async (id) => toCart(unwrap(await api.delete(e.adminCartItem(id))));
export const clearCart = async () => toCart(unwrap(await api.delete(e.adminCartClear)));

// ------------------------------------------------------------------------------------------------ pickers
/** Active products for the picker (one request per page, current language). */
export async function listProductChoices() {
  const rows = await fetchAll(e.products.list, listFilters({ is_active: true }));
  return rows.filter((p) => isOn(p.is_published ?? true) && p.availability !== 'unavailable').map((p) => ({ id: p.id, name: p.name || tx(p, 'name', 'ar') || `#${p.id}` }));
}

/** The packs (variants) of a product: `GET /admin/products/{id}` carries them. */
export async function listVariants(productId) {
  const raw = unwrap(await api.get(e.products.item(productId)));
  return (raw?.variants || []).map((v) => ({
    id: v.id,
    label: `${v.weight == null ? '' : Number(v.weight)} ${v.weight_unit ?? ''}`.trim() || `#${v.id}`,
    price: Number(v.effective_price ?? v.base_price ?? 0),
    stock: v.stock == null ? null : Number(v.stock),
    isDefault: isOn(v.is_default),
  }));
}

/** Registered clients matching a keyword (name / phone / e-mail), ten at a time (`keyword`, checked on the live server). */
export async function searchClients(keyword) {
  const { rows } = await fetchPage(e.clients.list, { ...(keyword ? { keyword } : {}), per_page: 10, page: 1 });
  return rows.map((c) => ({
    id: c.id,
    name: c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.phone,
    phone: [c.phone_code, c.phone].filter(Boolean).join(' '),
    email: c.email || '',
  }));
}

export async function listCities() {
  const rows = await fetchAll(e.cities.list);
  return rows.filter((c) => c.status === undefined || isOn(c.status)).map((c) => ({ id: c.id, name: c.name || `#${c.id}`, privateDelivery: isOn(c.has_private_delivery) }));
}

export async function listBranches() {
  const rows = await fetchAll(e.branches.list, listFilters({ is_active: true }));
  return rows.filter((b) => b.pickup_enabled !== false && b.pickup_enabled !== 0).map((b) => ({ id: b.id, name: b.name || `#${b.id}`, city: b.city?.name || '' }));
}

// ------------------------------------------------------------------------------------------------ checkout
/**
 * @param {{ customer: 'client' | 'guest', userId?: number|string, name?: string, phone?: string, cityId?: number|string, district?: string,
 *           street?: string, nationalAddress?: string, deliveryType: 'delivery' | 'branch' | 'private', branchId?: number|string, giftCardCode?: string }} v
 * @returns {Promise<{ id: number | null, orderNumber: string }>}
 */
export async function placeOrder(v) {
  const body = { delivery_type: v.deliveryType, gift_card_code: v.giftCardCode || '' };
  if (v.deliveryType === 'branch') body.branch_id = v.branchId;
  if (v.customer === 'client') body.user_id = v.userId;
  else Object.assign(body, { name: v.name, phone: localPhone(v.phone), phone_code: PHONE_CODE });
  // The address fields are what a guest order needs; for a registered client they are sent when filled in.
  if (v.cityId) body.city_id = v.cityId;
  if (v.district) body.district = v.district;
  if (v.street) body.street = v.street;
  if (v.nationalAddress) body.national_address = v.nationalAddress;
  // Laravel names the fields after the API (`name`, `phone`, `city_id`...): rewrite them to the form's names for the inputs.
  const map = [[/^phone$/, () => 'phone'], [/^city_id$/, () => 'cityId'], [/^user_id$/, () => 'userId'], [/^branch_id$/, () => 'branchId'], [/^delivery_type$/, () => 'deliveryType'], [/^gift_card_code$/, () => 'giftCardCode'], [/^national_address$/, () => 'nationalAddress']];
  const res = unwrap(await withFormErrors(api.post(e.adminCheckout, toFormData(body)), map));
  const order = res?.order ?? res ?? {};
  return { id: order.id ?? null, orderNumber: String(order.order_number ?? order.id ?? '') };
}
