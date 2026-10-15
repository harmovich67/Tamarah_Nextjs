import { slugify, nowSql } from '@tamrna/shared/utils';
import { db, latency, fail, requireRole, storeUpload } from './db';

/**
 * Mock adapter for the CMS domain: pages, posts, custom (ACF) field groups and menus.
 * Ports PagesController, PostsController, FieldGroupsController, CustomFields and MenuController.
 */

// ---------------------------------------------------------------------------------------- field groups
/** Groups whose target matches an entity (CustomFields::getGroupsFor + buildTargetFilters). */
export function groupsFor(targetType, entityId, subType) {
  const filters = ['all', entityId ? `id:${entityId}` : null, subType ? `type:${subType}` : null].filter(Boolean);
  return db
    .all('custom_field_groups')
    .filter((g) => g.status === 'active' && g.target_type === targetType && filters.includes(g.target_filter))
    .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
}

/** Field groups to render under a page / post form (CustomFields::renderMetaBox). */
export async function getFieldGroups({ entityType, entityId = null, subType = null }) {
  await latency(80);
  requireRole('super_admin');
  return groupsFor(entityType, entityId, subType);
}

export async function listCustomFieldGroups() {
  await latency(150);
  requireRole('super_admin');
  return db.all('custom_field_groups').slice().sort((a, b) => a.order_index - b.order_index || b.id - a.id).map((g) => ({ ...g, fields_count: (g.fields || []).length }));
}

export async function getCustomFieldGroup(id) {
  await latency(120);
  requireRole('super_admin');
  const group = db.find('custom_field_groups', id);
  if (!group) fail('المجموعة غير موجودة', 404);
  return group;
}

const cleanName = (n) => String(n || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

function groupFields(values, current) {
  const title_ar = String(values.title_ar || '').trim();
  const title_en = String(values.title_en || '').trim();
  if (!title_ar && !title_en) fail('يرجى إدخال اسم المجموعة', 422, { title_ar: ['يرجى إدخال اسم المجموعة'] });
  let key = String(values.key_name || '').trim();
  if (!key) key = `group_${cleanName(title_en || title_ar)}_${100 + Math.floor(Math.random() * 900)}`;
  if (db.all('custom_field_groups').some((g) => g.key_name === key && g.id !== current?.id)) key += `_${10 + Math.floor(Math.random() * 90)}`;
  let idx = 0;
  const fields = (values.fields || [])
    .filter((f) => String(f.name || '').trim())
    .map((f) => {
      idx += 1;
      const type = f.type || 'text';
      let options = null;
      if (type === 'repeater') {
        options = (f.sub_fields || [])
          .filter((sf) => String(sf.name || '').trim())
          .map((sf) => ({ name: cleanName(sf.name), label: sf.label_ar || sf.label || sf.name, label_ar: sf.label_ar || sf.label || sf.name, label_en: sf.label_en || '', type: sf.type || 'text' }));
      } else if (type === 'select' && f.options) {
        try {
          options = typeof f.options === 'string' ? JSON.parse(f.options) : f.options;
        } catch {
          fail('صيغة خيارات القائمة غير صحيحة (JSON)', 422, { options: ['صيغة خيارات القائمة غير صحيحة (JSON)'] });
        }
      }
      return {
        id: f.id || Date.now() + idx,
        label_ar: String(f.label_ar || f.name).trim(),
        label_en: String(f.label_en || f.label_ar || f.name).trim(),
        name: cleanName(f.name),
        type,
        instructions_ar: f.instructions_ar || '',
        instructions_en: f.instructions_en || '',
        required: f.required ? 1 : 0,
        default_value: f.default_value || '',
        options,
        order_index: idx,
      };
    });
  return {
    title_ar: title_ar || title_en,
    title_en: title_en || title_ar,
    key_name: key,
    target_type: values.target_type || 'page',
    target_filter: values.target_filter || 'all',
    position: values.position || 'normal',
    order_index: Number(values.order_index) || 0,
    status: values.status || 'active',
    fields,
  };
}

export async function createCustomFieldGroup(values) {
  await latency(300);
  requireRole('super_admin');
  return db.insert('custom_field_groups', groupFields(values));
}
export async function updateCustomFieldGroup(id, values) {
  await latency(300);
  requireRole('super_admin');
  const current = db.find('custom_field_groups', id);
  if (!current) fail('المجموعة غير موجودة', 404);
  return db.update('custom_field_groups', id, groupFields(values, current));
}
export async function deleteCustomFieldGroup(id) {
  await latency(200);
  requireRole('super_admin');
  db.remove('custom_field_groups', id);
  return { success: true };
}

/** Assignable targets for the `target_filter` dropdown (FieldGroupsController::apiTargets). */
export async function getCustomFieldTargets(type = 'page') {
  await latency(80);
  requireRole('super_admin');
  const t = (p) => (p ? [p.title_ar || p.title_en || `#${p.id}`, p.title_en || p.title_ar || `#${p.id}`] : []);
  if (type === 'page') {
    return [{ value: 'all', label: ['الكل (كل الصفحات)', 'All Pages'] }, ...db.all('pages').map((p) => ({ value: `id:${p.id}`, label: t(p) }))];
  }
  if (type === 'post') {
    return [
      { value: 'all', label: ['الكل (كل أنواع المنشورات)', 'All Posts (any type)'] },
      { value: 'type:post', label: ['كل مقالات المدونة', 'All Blog Posts'], group: ['أنواع المنشورات', 'Post Types'] },
      { value: 'type:announcement', label: ['كل الإعلانات', 'All Announcements'], group: ['أنواع المنشورات', 'Post Types'] },
      { value: 'type:faq', label: ['كل الأسئلة الشائعة', 'All FAQs'], group: ['أنواع المنشورات', 'Post Types'] },
      ...db.all('posts').map((p) => ({ value: `id:${p.id}`, label: t(p), group: ['منشورات فردية', 'Individual Posts'] })),
    ];
  }
  if (type === 'product') {
    return [{ value: 'all', label: ['الكل (كل المنتجات)', 'All Products'] }, ...db.all('products').map((p) => ({ value: `id:${p.id}`, label: [p.name_ar, p.name_en || p.name_ar] }))];
  }
  if (type === 'category') {
    return [{ value: 'all', label: ['الكل (كل أصناف التمور)', 'All Date Categories'] }, ...db.all('categories').map((c) => ({ value: `id:${c.id}`, label: [c.name_ar, c.name_en || c.name_ar] }))];
  }
  return [{ value: 'all', label: ['الكل', 'All'] }];
}

// ------------------------------------------------------------------------------------------ pages / posts
async function cleanFields(entityType, entityId, subType, raw = {}) {
  const defs = groupsFor(entityType, entityId, subType).flatMap((g) => g.fields || []);
  const out = {};
  for (const def of defs) {
    let v = raw[def.name];
    if (def.type === 'boolean') v = v && v !== '0' ? '1' : '0';
    else if (def.type === 'repeater') {
      const rows = (Array.isArray(v) ? v : []).filter((r) => r && Object.values(r).some((x) => x !== '' && x != null));
      v = rows.length ? rows : null;
    } else if (def.type === 'image') v = (await storeUpload(v)) || null;
    if (v !== undefined && v !== null && v !== '') out[def.name] = v;
  }
  return out;
}

function entityApi(table, label, { slugBase }) {
  const view = (row) => row;
  const unique = (slug, currentId) => {
    let s = slug || 'item';
    if (db.all(table).some((r) => r.slug === s && r.id !== currentId)) s += `-${100 + Math.floor(Math.random() * 900)}`;
    return s;
  };
  const build = async (values, current) => {
    const title_ar = String(values.title_ar || '').trim();
    const title_en = String(values.title_en || '').trim();
    if (!title_ar && !title_en) fail(`يرجى إدخال عنوان ${label}`, 422, { title_ar: [`يرجى إدخال عنوان ${label}`] });
    const base = String(values.slug || '').trim() || slugBase(title_en || title_ar);
    const upload = await storeUpload(values.image_file);
    return {
      title_ar: title_ar || title_en,
      title_en: title_en || title_ar,
      slug: unique(base, current?.id),
      content_ar: values.content_ar || '',
      content_en: values.content_en || '',
      excerpt_ar: values.excerpt_ar || '',
      excerpt_en: values.excerpt_en || '',
      featured_image: upload || (values.featured_image ? String(values.featured_image).trim() : current?.featured_image) || null,
      status: values.status || 'published',
    };
  };
  return {
    async list() {
      await latency(150);
      requireRole('super_admin');
      return db.all(table).slice().sort((a, b) => b.id - a.id).map(view);
    },
    async get(id) {
      await latency(120);
      requireRole('super_admin');
      const row = db.find(table, id);
      if (!row) fail(`${label} غير موجود`, 404);
      return row;
    },
    async create(values, extra = () => ({})) {
      await latency(350);
      requireRole('super_admin');
      const base = await build(values);
      const row = db.insert(table, { ...base, ...extra(values), fields: {}, updated_at: nowSql() });
      const fields = await cleanFields(table === 'pages' ? 'page' : 'post', row.id, row.post_type, values.fields);
      return db.update(table, row.id, { fields });
    },
    async update(id, values, extra = () => ({})) {
      await latency(350);
      requireRole('super_admin');
      const current = db.find(table, id);
      if (!current) fail(`${label} غير موجود`, 404);
      const base = await build(values, current);
      const merged = { ...base, ...extra(values), slug: base.slug || current.slug };
      const fields = await cleanFields(table === 'pages' ? 'page' : 'post', current.id, merged.post_type ?? current.post_type, values.fields);
      return db.update(table, id, { ...merged, fields, updated_at: nowSql() });
    },
    async remove(id) {
      await latency(200);
      requireRole('super_admin');
      db.remove(table, id);
      return { success: true };
    },
  };
}

const pagesApi = entityApi('pages', 'الصفحة', { slugBase: slugify });
const postsApi = entityApi('posts', 'المنشور', { slugBase: slugify });
const pageExtra = (v) => ({
  template: v.template || 'default',
  meta_title_ar: v.meta_title_ar || '',
  meta_title_en: v.meta_title_en || '',
  meta_desc_ar: v.meta_desc_ar || '',
  meta_desc_en: v.meta_desc_en || '',
});
const postExtra = (v) => ({ post_type: v.post_type || 'post' });

export const listPages = () => pagesApi.list();
export const getPage = (id) => pagesApi.get(id);
export const createPage = (v) => pagesApi.create(v, pageExtra);
export const updatePage = (id, v) => pagesApi.update(id, v, pageExtra);
export const deletePage = (id) => pagesApi.remove(id);
export async function togglePageStatus(id) {
  await latency(120);
  requireRole('super_admin');
  const page = db.find('pages', id);
  if (!page) fail('Page not found', 404);
  return { new_status: db.update('pages', id, { status: page.status === 'published' ? 'draft' : 'published', updated_at: nowSql() }).status };
}

export const listPosts = () => postsApi.list();
export const getPost = (id) => postsApi.get(id);
export const createPost = (v) => postsApi.create(v, postExtra);
export const updatePost = (id, v) => postsApi.update(id, v, postExtra);
export const deletePost = (id) => postsApi.remove(id);

// ------------------------------------------------------------------------------------------------ menus
export async function listMenus() {
  await latency(150);
  requireRole('super_admin');
  const pages = db.all('pages');
  const items = db
    .all('menu_items')
    .slice()
    .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
    .map((m) => {
      const page = m.link_type === 'page' ? pages.find((p) => p.id === m.page_id) : null;
      return { ...m, label_ar: m.label_ar ?? m.title_ar, label_en: m.label_en ?? m.title_en, page_slug: page?.slug || null };
    });
  return {
    header: items.filter((i) => i.location === 'header'),
    footer: items.filter((i) => i.location === 'footer'),
    pages: pages.map((p) => ({ id: p.id, title_ar: p.title_ar, title_en: p.title_en, slug: p.slug })),
  };
}

function menuFields(v) {
  const label_ar = String(v.label_ar || '').trim();
  const label_en = String(v.label_en || '').trim();
  if (!label_ar && !label_en) fail('يرجى كتابة اسم العنصر', 422, { label_ar: ['يرجى كتابة اسم العنصر'] });
  const link_type = v.link_type === 'page' ? 'page' : 'custom';
  return {
    location: v.location === 'footer' ? 'footer' : 'header',
    label_ar: label_ar || label_en,
    label_en: label_en || label_ar,
    title_ar: label_ar || label_en,
    title_en: label_en || label_ar,
    link_type,
    page_id: link_type === 'page' ? Number(v.page_id) || null : null,
    custom_url: link_type === 'custom' ? String(v.custom_url || '').trim() : null,
    icon: String(v.icon || '').trim() || null,
    open_new_tab: v.open_new_tab ? 1 : 0,
    order_index: Number(v.order_index) || 0,
    status: v.status === 'inactive' ? 'inactive' : 'active',
  };
}

export async function createMenuItem(values) {
  await latency(250);
  requireRole('super_admin');
  return db.insert('menu_items', menuFields(values));
}
export async function updateMenuItem(id, values) {
  await latency(250);
  requireRole('super_admin');
  return db.update('menu_items', id, menuFields(values));
}
export async function deleteMenuItem(id) {
  await latency(200);
  requireRole('super_admin');
  db.remove('menu_items', id);
  return { success: true };
}
