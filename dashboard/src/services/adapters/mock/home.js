import { db, latency, fail, requireRole, storeUpload, logActivity } from './db';

/** Mock adapter for the homepage CMS (HomeSectionsController + BannersController). */

const parseSettings = (s) => {
  try {
    return s.settings_json ? JSON.parse(s.settings_json) : {};
  } catch {
    return {};
  }
};
const byOrder = (a, b) => a.order_index - b.order_index || a.id - b.id;

export async function getHomeContent() {
  await latency(180);
  requireRole('super_admin');
  return {
    sections: db.all('home_sections').slice().sort(byOrder).map((s) => ({ ...s, settings: parseSettings(s) })),
    banners: db.all('banners').slice().sort(byOrder),
  };
}

const str = (v) => String(v ?? '').trim();

export async function updateSection(id, v) {
  await latency(300);
  requireRole('super_admin');
  const sec = db.find('home_sections', id);
  if (!sec) fail('القسم غير موجود', 404);
  const upload = await storeUpload(v.image_file);
  return db.update('home_sections', id, {
    title_ar: str(v.title_ar), title_en: str(v.title_en),
    subtitle_ar: str(v.subtitle_ar), subtitle_en: str(v.subtitle_en),
    badge_ar: str(v.badge_ar), badge_en: str(v.badge_en),
    button_text_ar: str(v.button_text_ar), button_text_en: str(v.button_text_en),
    button_url: str(v.button_url), style: str(v.style) || sec.style || 'default',
    image: upload || str(v.image_url) || sec.image,
    custom_content_ar: str(v.content_ar), custom_content_en: str(v.content_en),
  });
}

export async function updateFeatures(id, v) {
  await latency(300);
  requireRole('super_admin');
  const sec = db.find('home_sections', id);
  if (!sec) fail('القسم غير موجود', 404);
  const cards = (v.cards || [])
    .filter((c) => str(c.title_ar) || str(c.title_en))
    .map((c) => ({ icon: str(c.icon) || 'award', title_ar: str(c.title_ar), title_en: str(c.title_en), desc_ar: str(c.desc_ar), desc_en: str(c.desc_en) }));
  return db.update('home_sections', id, {
    title_ar: str(v.title_ar), title_en: str(v.title_en), badge_ar: str(v.badge_ar), badge_en: str(v.badge_en),
    settings_json: JSON.stringify({ ...parseSettings(sec), cards }),
  });
}

export async function updateTestimonials(id, v) {
  await latency(300);
  requireRole('super_admin');
  const sec = db.find('home_sections', id);
  if (!sec) fail('القسم غير موجود', 404);
  const reviews = (v.reviews || [])
    .filter((r) => (str(r.name) || str(r.name_en)) && (str(r.comment) || str(r.comment_en)))
    .map((r) => ({
      name: str(r.name), name_en: str(r.name_en), city: str(r.city) || 'المملكة', city_en: str(r.city_en) || 'KSA',
      rating: Math.max(1, Math.min(5, Number(r.rating) || 5)), comment: str(r.comment), comment_en: str(r.comment_en),
      product_name: str(r.product_name) || 'تمور ملكية فاخرة', product_name_en: str(r.product_name_en) || 'Royal Luxury Dates',
    }));
  return db.update('home_sections', id, {
    title_ar: str(v.title_ar), title_en: str(v.title_en), badge_ar: str(v.badge_ar), badge_en: str(v.badge_en),
    settings_json: JSON.stringify({ ...parseSettings(sec), reviews }),
  });
}

export async function updateNewsletter(id, v) {
  await latency(300);
  requireRole('super_admin');
  const sec = db.find('home_sections', id);
  if (!sec) fail('القسم غير موجود', 404);
  return db.update('home_sections', id, {
    title_ar: str(v.title_ar), title_en: str(v.title_en), subtitle_ar: str(v.subtitle_ar), subtitle_en: str(v.subtitle_en),
    badge_ar: str(v.badge_ar), badge_en: str(v.badge_en), button_text_ar: str(v.button_text_ar), button_text_en: str(v.button_text_en),
    settings_json: JSON.stringify({ ...parseSettings(sec), coupon_code: str(v.coupon_code) || 'TAMRNA10', discount_percent: str(v.discount_percent) || '10' }),
  });
}

export async function createCustomSection(v) {
  await latency(300);
  requireRole('super_admin');
  if (!str(v.title_ar) && !str(v.title_en)) fail('يرجى كتابة عنوان القسم', 422, { title_ar: ['يرجى كتابة عنوان القسم'] });
  const upload = await storeUpload(v.image_file);
  const max = db.all('home_sections').reduce((m, s) => Math.max(m, s.order_index || 0), 0);
  const title_ar = str(v.title_ar) || str(v.title_en);
  const title_en = str(v.title_en) || title_ar;
  return db.insert('home_sections', {
    section_key: `custom_${Math.random().toString(16).slice(2, 18)}`, name_ar: title_ar, name_en: title_en, is_custom: 1, title_ar, title_en,
    subtitle_ar: str(v.subtitle_ar), subtitle_en: str(v.subtitle_en), badge_ar: null, badge_en: null, style: str(v.style) || 'centered',
    custom_content_ar: String(v.content_ar ?? ''), custom_content_en: String(v.content_en ?? ''), image: upload || str(v.image_url) || null,
    button_text_ar: str(v.button_text_ar), button_text_en: str(v.button_text_en), button_url: str(v.button_url), settings_json: null, style_options: null,
    order_index: max + 1, status: 'active',
  });
}

export async function deleteCustomSection(id) {
  await latency(200);
  requireRole('super_admin');
  const sec = db.find('home_sections', id);
  if (sec?.is_custom) db.remove('home_sections', id);
  return { success: true };
}

export async function toggleSection(id) {
  await latency(120);
  requireRole('super_admin');
  const s = db.find('home_sections', id);
  if (!s) fail('القسم غير موجود', 404);
  return db.update('home_sections', id, { status: s.status === 'active' ? 'inactive' : 'active' });
}

function swap(table, id, direction) {
  const rows = db.all(table).slice().sort(byOrder);
  const i = rows.findIndex((r) => String(r.id) === String(id));
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const a = rows[i];
  const b = rows[j];
  const ao = a.order_index;
  db.update(table, a.id, { order_index: b.order_index });
  db.update(table, b.id, { order_index: ao });
}

export async function moveSection({ id, direction }) {
  await latency(120);
  requireRole('super_admin');
  swap('home_sections', id, direction);
  return { success: true };
}

// ---------------------------------------------------------------------------------------------- banners
async function bannerFields(v, current) {
  const upload = await storeUpload(v.image_file);
  if (!str(v.title_ar) && !current) fail('عنوان الشريحة مطلوب', 422, { title_ar: ['عنوان الشريحة بالعربية مطلوب'] });
  return {
    badge_ar: str(v.badge_ar), badge_en: str(v.badge_en), title_ar: str(v.title_ar), title_en: str(v.title_en),
    subtitle_ar: str(v.subtitle_ar), subtitle_en: str(v.subtitle_en), cta_ar: str(v.cta_ar) || 'تسوق الآن', cta_en: str(v.cta_en) || 'Shop Now',
    link: str(v.link) || '/catalog',
    image: upload || str(v.image_url) || current?.image || 'assets/images/saudi_dates_hero_1787053884267.jpg',
  };
}

export async function createBanner(v) {
  await latency(300);
  requireRole('super_admin');
  const max = db.all('banners').reduce((m, b) => Math.max(m, b.order_index || 0), 0);
  const banner = db.insert('banners', { ...(await bannerFields(v)), order_index: max + 1, status: 'active' });
  logActivity('info', 'admin', 'Banner created');
  return banner;
}
export async function updateBanner(id, v) {
  await latency(300);
  requireRole('super_admin');
  const current = db.find('banners', id);
  if (!current) fail('الشريحة غير موجودة', 404);
  return db.update('banners', id, await bannerFields(v, current));
}
export async function deleteBanner(id) {
  await latency(200);
  requireRole('super_admin');
  db.remove('banners', id);
  return { success: true };
}
export async function toggleBanner(id) {
  await latency(120);
  requireRole('super_admin');
  const b = db.find('banners', id);
  if (!b) fail('الشريحة غير موجودة', 404);
  return db.update('banners', id, { status: b.status === 'active' ? 'inactive' : 'active' });
}
export async function moveBanner({ id, direction }) {
  await latency(120);
  requireRole('super_admin');
  swap('banners', id, direction);
  return { success: true };
}
