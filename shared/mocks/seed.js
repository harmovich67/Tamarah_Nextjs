/**
 * Mock database seed.
 *
 * Source of truth: the legacy `Database\Migrator::seed()` (exported to seed.raw.json by running the
 * real PHP migrator against SQLite). The rows keep the legacy column names so the Laravel API can
 * return the same shapes. A few corrections/additions are applied on top and are marked `// MOCK:`.
 *
 * This file is only used by the mock adapters. It is never imported when API_MODE=laravel.
 */
import raw from './seed.raw.json';
import { adminSeed } from './seed.admin.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Category images follow the Foundation design (assets/images/categories/*.webp). */
const CATEGORY_IMAGES = {
  ajwa: 'assets/images/categories/ajwa.webp',
  sukari: 'assets/images/categories/sukkari.webp',
  khalas: 'assets/images/home/sukkari.webp',
  sagae: 'assets/images/categories/stuffed.webp',
  medjool: 'assets/images/categories/medjool.webp',
  'gift-boxes': 'assets/images/categories/gift-boxes.webp',
};

/**
 * The legacy seed stores some `sale_price` values *higher* than `price`
 * (e.g. 220 vs 180), which renders as a negative discount. MOCK: the higher value is the regular
 * price and the lower one the sale price.
 */
function fixPricing(row) {
  const price = Number(row.price) || 0;
  const sale = row.sale_price == null ? null : Number(row.sale_price);
  if (sale && sale > price) return { ...row, price: sale, sale_price: price };
  return row;
}

const DEMO_PASSWORDS = {
  'admin@tumurna.com': 'Admin@12345',
  'manager@tumurna.com': 'Manager@12345',
  'demo@tamrna.test': 'Tmrna2026',
  'sara@example.com': 'Sara@12345',
  'fahad@example.com': 'Fahad@12345',
};

/** Passwords for the mock auth adapter (never shipped with a real API). */
export const MOCK_PASSWORDS = DEMO_PASSWORDS;

export function buildSeed() {
  const src = clone(raw);

  const categories = src.categories.map((c) => ({ ...c, image: CATEGORY_IMAGES[c.slug] || c.image }));

  const products = src.products.map((p) => fixPricing(p));
  const product_variants = src.product_variants.map((v) => fixPricing(v));

  const roles = src.roles;

  // MOCK: the legacy seed only creates the admin; add a store manager and customers so every
  // role-based flow (permissions, orders, profile) can be exercised.
  const users = [
    { ...src.users[0], id: 1, role_id: 1, name: 'مدير متجر تمرنا', email: 'admin@tumurna.com', phone: '0555000000' },
    { id: 2, role_id: 2, name: 'سلطان المنصور', email: 'manager@tumurna.com', phone: '0555111222', status: 'active', phone_verified: 1, created_at: '2026-09-01 09:00:00' },
    { id: 3, role_id: 3, name: 'سارة التميمي', email: 'demo@tamrna.test', phone: '0555123456', status: 'active', phone_verified: 1, created_at: '2026-09-10 12:20:00' },
    { id: 4, role_id: 3, name: 'سارة العتيبي', email: 'sara@example.com', phone: '0555987654', status: 'active', phone_verified: 1, created_at: '2026-09-18 15:05:00' },
    { id: 5, role_id: 3, name: 'فهد الناصر', email: 'fahad@example.com', phone: '0555443300', status: 'active', phone_verified: 1, created_at: '2026-09-22 18:45:00' },
  ].map((u) => ({ school_id: 1, otp_expires_at: null, ...u }));

  // MOCK: link seeded orders to customers + add orders for the demo account.
  const orders = src.orders.map((o) => {
    const links = { 'TUM-2026-8910': 5, 'TUM-2026-8911': 4 };
    return { ...o, user_id: links[o.order_number] ?? o.user_id, coupon_code: null, updated_at: o.created_at };
  });
  orders.push(
    {
      id: 4, order_number: 'ORD-20261001-4812', user_id: 3, customer_name: 'سارة التميمي', customer_phone: '0555123456',
      customer_email: 'demo@tamrna.test', shipping_address: 'المدينة: الرياض | الحي: الملقا | العنوان: طريق أنس بن مالك، فيلا 12',
      governorate: 'الرياض', city: 'الرياض', district: 'الملقا', shipping_type: 'home_delivery', subtotal: 370, shipping_fee: 0,
      discount: 0, coupon_code: null, total: 370, payment_method: 'mada', payment_status: 'paid', payment_reference: 'PAY-77120',
      shipping_service: 'cold_freight', shipping_status: 'delivered', notes: null, created_at: '2026-10-01 11:30:00', updated_at: '2026-10-03 16:00:00',
    },
    {
      id: 5, order_number: 'ORD-20261010-2290', user_id: 3, customer_name: 'سارة التميمي', customer_phone: '0555123456',
      customer_email: 'demo@tamrna.test', shipping_address: 'المدينة: الرياض | الحي: الملقا | العنوان: طريق أنس بن مالك، فيلا 12',
      governorate: 'الرياض', city: 'الرياض', district: 'الملقا', shipping_type: 'home_delivery', subtotal: 240, shipping_fee: 20,
      discount: 0, coupon_code: null, total: 260, payment_method: 'cod', payment_status: 'pending', payment_reference: null,
      shipping_service: 'cold_freight', shipping_status: 'pending', notes: 'يرجى الاتصال قبل الوصول', created_at: '2026-10-10 09:10:00', updated_at: '2026-10-10 09:10:00',
    },
  );

  const order_items = [
    ...src.order_items.map((i) => ({ ...i, price: i.unit_price })),
    { id: 4, order_id: 4, product_id: 1, variant_id: 2, product_name: 'عجوة المدينة المنورة العالية الملكية', size_name: 'صندوق 1 كجم فاخر', unit_price: 180, price: 180, quantity: 1, subtotal: 180 },
    { id: 5, order_id: 4, product_id: 2, variant_id: 4, product_name: 'سكري القصيم مفتل درجة أولى - صندوق فاخر', size_name: 'عبوة 1 كجم', unit_price: 95, price: 95, quantity: 2, subtotal: 190 },
    { id: 6, order_id: 5, product_id: 4, variant_id: 8, product_name: 'صندوق تمور صقعي محشوة باللوز والبيكان والكراميل (طبق كريستال)', size_name: 'طبق كريستال 1.2 كجم', unit_price: 240, price: 240, quantity: 1, subtotal: 240 },
  ];

  const gift_cards = src.gift_cards.map((g) => ({ ...g, order_number: null }));

  const settings = Object.fromEntries(src.settings.map((s) => [s.key, s.value]));

  const menu_items = src.menu_items;
  const home_sections = src.home_sections;
  const banners = src.banners;
  const warehouses = src.warehouses;
  const coupons = src.coupons;
  const shipping_zones = src.shipping_zones;

  return {
    roles,
    users,
    categories,
    products,
    product_variants,
    banners,
    orders,
    order_items,
    gift_cards,
    wishlists: [],
    user_addresses: [],
    settings,
    menu_items,
    home_sections,
    warehouses,
    coupons,
    shipping_zones,
    ...clone(adminSeed),
  };
}
