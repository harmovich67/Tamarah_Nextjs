import { db, latency, fail, requireRole, logActivity } from './db';

/** Mock adapter for coupons and Saudi shipping zones (CouponsController / ShippingZonesController). */

// ------------------------------------------------------------------------------------------------ coupons
export async function listCoupons() {
  await latency(150);
  requireRole('super_admin');
  return db.all('coupons').slice().sort((a, b) => b.id - a.id);
}

function couponFields(v, currentId) {
  const code = String(v.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!code) fail('يرجى كتابة رمز الكوبون بشكل صحيح', 422, { code: ['يرجى كتابة رمز الكوبون بشكل صحيح'] });
  if (db.all('coupons').some((c) => c.code === code && c.id !== currentId)) {
    fail('رمز الكوبون مسجل مسبقاً، يرجى اختيار رمز آخر', 422, { code: ['رمز الكوبون مسجل مسبقاً، يرجى اختيار رمز آخر'] });
  }
  return {
    code,
    discount_type: v.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discount_value: Math.max(0.01, Number(v.discount_value) || 0),
    min_order_amount: Math.max(0, Number(v.min_order_amount) || 0),
    usage_limit: v.usage_limit ? Math.max(1, Math.floor(Number(v.usage_limit))) : null,
    start_date: v.start_date || null,
    end_date: v.end_date || null,
    is_active: v.is_active ? 1 : 0,
  };
}

export async function createCoupon(values) {
  await latency(250);
  requireRole('super_admin');
  const fields = couponFields(values);
  const row = db.insert('coupons', { ...fields, times_used: 0 });
  logActivity('info', 'admin', `New coupon created: ${fields.code}`);
  return row;
}
export async function updateCoupon(id, values) {
  await latency(250);
  requireRole('super_admin');
  return db.update('coupons', id, couponFields(values, Number(id)));
}
export async function deleteCoupon(id) {
  await latency(200);
  requireRole('super_admin');
  db.remove('coupons', id);
  return { success: true };
}
export async function toggleCoupon(id) {
  await latency(120);
  requireRole('super_admin');
  const c = db.find('coupons', id);
  if (!c) fail('الكوبون غير موجود', 404);
  const updated = db.update('coupons', id, { is_active: c.is_active ? 0 : 1 });
  return { is_active: updated.is_active, message: updated.is_active ? 'تم تفعيل الكوبون' : 'تم إيقاف الكوبون' };
}

// ------------------------------------------------------------------------------------------ shipping zones
export async function listShippingZones() {
  await latency(150);
  requireRole('super_admin');
  return db.all('shipping_zones').slice().sort((a, b) => b.is_active - a.is_active || a.shipping_fee - b.shipping_fee || a.id - b.id);
}

function zoneFields(v, currentId) {
  const city_name_ar = String(v.city_name_ar || '').trim();
  if (!city_name_ar) fail('يرجى إدخال اسم المدينة بالعربية', 422, { city_name_ar: ['يرجى إدخال اسم المدينة بالعربية'] });
  if (db.all('shipping_zones').some((z) => z.city_name_ar === city_name_ar && z.id !== currentId)) {
    fail('هذه المدينة مسجلة مسبقاً في مناطق الشحن', 422, { city_name_ar: ['هذه المدينة مسجلة مسبقاً في مناطق الشحن'] });
  }
  return {
    city_name_ar,
    city_name_en: String(v.city_name_en || '').trim() || city_name_ar,
    shipping_fee: Math.max(0, Number(v.shipping_fee) || 0),
    estimated_delivery: String(v.estimated_delivery || '').trim() || 'توصيل مبرد خلال 24-48 ساعة',
    is_cold_shipping: v.is_cold_shipping ? 1 : 0,
    is_active: v.is_active ? 1 : 0,
  };
}

export async function createShippingZone(values) {
  await latency(250);
  requireRole('super_admin');
  return db.insert('shipping_zones', zoneFields(values));
}
export async function updateShippingZone(id, values) {
  await latency(250);
  requireRole('super_admin');
  return db.update('shipping_zones', id, zoneFields(values, Number(id)));
}
export async function deleteShippingZone(id) {
  await latency(200);
  requireRole('super_admin');
  db.remove('shipping_zones', id);
  return { success: true };
}
export async function toggleShippingZone(id) {
  await latency(120);
  requireRole('super_admin');
  const z = db.find('shipping_zones', id);
  if (!z) fail('المدينة غير موجودة', 404);
  const updated = db.update('shipping_zones', id, { is_active: z.is_active ? 0 : 1 });
  return { is_active: updated.is_active, message: updated.is_active ? 'تم تفعيل التوصيل للمدينة' : 'تم إيقاف التوصيل للمدينة' };
}
