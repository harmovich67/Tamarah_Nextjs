import { db, latency, withSettings, fail } from './db';

/** @returns {Promise<Record<string,string>>} the `settings` table as a key/value map */
export async function getSettings() {
  await latency(0);
  return { ...db.getSettings() };
}

function buildMenus() {
  const rows = db
    .where('menu_items', (m) => m.status === 'active')
    .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  const resolve = (m) => {
    let href = m.custom_url || '';
    if (m.link_type === 'page') {
      const page = m.page_id ? db.find('pages', m.page_id) : null;
      href = page?.slug ? `/page/${page.slug}` : '';
    }
    return {
      id: m.id,
      location: m.location,
      title_ar: m.title_ar,
      title_en: m.title_en,
      label_ar: m.label_ar,
      label_en: m.label_en,
      href,
      open_new_tab: !!m.open_new_tab,
    };
  };
  const all = rows.map(resolve).filter((m) => m.href);
  return { header: all.filter((m) => m.location === 'header'), footer: all.filter((m) => m.location === 'footer') };
}

/** Everything the storefront shell (header / footer) needs, in one call. */
export async function getShellData() {
  await latency(0);
  const sections = db.where('home_sections', (s) => s.status === 'active');
  const hasHeroSection = sections.some((s) => s.section_key === 'hero');
  const hasBanners = db.where('banners', (b) => b.status === 'active').length > 0;
  return { settings: { ...db.getSettings() }, menus: buildMenus(), hasHero: hasHeroSection && hasBanners };
}

const withCategory = (p) => {
  const c = db.find('categories', p.category_id);
  return { ...p, category_name_ar: c?.name_ar, category_name_en: c?.name_en, category_slug: c?.slug };
};

export async function getHomeData() {
  await latency(0);
  const published = db.where('products', (p) => p.status === 'published');
  const categories = db
    .all('categories')
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((c) => ({ ...c, count: published.filter((p) => p.category_id === c.id).length }));
  const banners = db.where('banners', (b) => b.status === 'active').sort((a, b) => a.order_index - b.order_index);
  const products = published
    .slice()
    .sort((a, b) => b.is_featured - a.is_featured || a.id - b.id)
    .slice(0, 8)
    .map(withCategory);
  const preorderProducts = published.filter((p) => p.is_preorder).sort((a, b) => a.id - b.id).map(withCategory);
  const bestsellers = published
    .filter((p) => p.is_bestseller)
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 4)
    .map(withCategory);
  const homeSections = db
    .where('home_sections', (s) => s.status === 'active')
    .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
    .map(withSettings);
  return { banners, categories, products, preorderProducts, bestsellers, homeSections };
}

export async function getPage(slug) {
  await latency(0);
  const page = db.all('pages').find((p) => p.slug === slug);
  if (!page) fail('الصفحة المطلوبة غير موجودة (404 Not Found)', 404);
  if (page.status !== 'published') fail('الصفحة غير منشورة (403 Forbidden)', 403);
  return page;
}

export async function getPost(slug) {
  await latency(0);
  const post = db.all('posts').find((p) => p.slug === slug);
  if (!post) fail('المنشور المطلوب غير موجود (404 Not Found)', 404);
  if (post.status !== 'published') fail('المنشور غير متاح حالياً (403 Forbidden)', 403);
  return post;
}

export async function getSitemapEntries() {
  await latency(0);
  const pick = (rows) => rows.map((r) => ({ slug: r.slug, updated_at: r.updated_at || r.created_at }));
  return {
    products: pick(db.where('products', (p) => p.status === 'published')),
    categories: db.all('categories').map((c) => ({ slug: c.slug })),
    pages: pick(db.where('pages', (p) => p.status === 'published')),
    posts: pick(db.where('posts', (p) => p.status === 'published')),
  };
}

export async function subscribeNewsletter({ email }) {
  await latency();
  if (!db.all('newsletter_subscribers').find((r) => r.email === email)) db.insert('newsletter_subscribers', { email });
  return { success: true };
}

export async function sendContactMessage(payload) {
  await latency(350);
  db.insert('contact_messages', { ...payload, status: 'new' });
  return { success: true };
}
