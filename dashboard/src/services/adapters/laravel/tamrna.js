import { ApiError, ERROR_CODES } from '@tamrna/shared/api';
import { slugify } from '@tamrna/shared/utils';
import { apiClient as api, getAdminLocale } from '@/lib/apiClient';
import { config } from '@/lib/config';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';

/**
 * Helpers for the real Tamrna backend (see the Postman collection `tomorona`). The API stores every text in
 * `en[...]` / `ar[...]` blocks, references images by media id (uploaded first through /general/attachment) and
 * addresses admin routes under /admin. These functions translate between that shape and the flat shape the screens use
 * (`name_ar`, `name_en`, `image`...). Response shapes are read defensively because the collection has no examples.
 */

const str = (v) => (typeof v === 'string' ? v : '');

/** Absolute URL for a path returned by the API (the dashboard runs on another origin than the backend). */
export function absUrl(p) {
  if (!p) return '';
  if (/^(https?:|data:|blob:)/.test(p)) return p;
  let origin = '';
  try {
    origin = new URL(config.apiUrl).origin;
  } catch {
    /* relative VITE_API_URL: keep the path as is */
  }
  return `${origin}/${String(p).replace(/^\/+/, '')}`;
}

/** Text of `field` in `lang`: `{ ar: { name } }`, `translations: [...] | {...}`, `name_ar`, `{ name: { ar } }` or the plain localized value. */
export function tx(item, field, lang) {
  if (!item) return '';
  let v = str(item[lang]?.[field]);
  if (!v && item.translations) {
    const t = item.translations;
    v = Array.isArray(t) ? str(t.find((r) => (r.locale || r.lang || r.language) === lang)?.[field]) : str(t[lang]?.[field]);
  }
  if (!v) v = str(item[`${field}_${lang}`]);
  if (!v && item[field] && typeof item[field] === 'object') v = str(item[field][lang]);
  if (!v && lang === getAdminLocale()) v = str(item[field]);
  return v;
}

/** Arabic / English pair for list screens: a missing language falls back to the other so nothing renders blank. */
export function txPair(item, field) {
  const ar = tx(item, field, 'ar');
  const en = tx(item, field, 'en');
  const plain = str(item?.[field]);
  return { ar: ar || en || plain, en: en || ar || plain };
}

/** `{ id, url }` from a media object, a bare URL or a bare id. */
export function mediaOf(m) {
  if (m === null || m === undefined || m === '') return null;
  if (typeof m === 'number') return { id: m, url: '' };
  if (typeof m === 'string') return { id: null, url: absUrl(m) };
  // With no upload the backend answers a placeholder (`id: null`, /assets/images/image.png): treat it as no image.
  const url = m.url ?? m.full_url ?? m.path ?? m.src ?? '';
  if ((m.id ?? null) === null && /\/assets\/images\/[\w-]+\.png$/.test(url)) return null;
  return { id: m.id ?? null, url: absUrl(url) };
}

export const mediaList = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(mediaOf).filter(Boolean);

export const isOn = (v) => v === true || v === 1 || v === '1' || v === 'true';

const rowsOf = (res) => {
  const d = unwrap(res);
  if (Array.isArray(d)) return d;
  return d?.data ?? d?.items ?? d?.results ?? [];
};
const lastPageOf = (res) => res?.meta?.last_page ?? res?.data?.meta?.last_page ?? res?.data?.last_page ?? res?.last_page ?? 1;

/**
 * Admin lists are paginated; the screens filter and sort client side, so walk every page.
 * `lang` sets Accept-Language for this call: list endpoints answer in that one language only.
 */
export async function fetchAll(path, params = {}, lang) {
  const out = [];
  const opts = lang ? { headers: { 'Accept-Language': lang } } : undefined;
  for (let page = 1; page <= 50; page += 1) {
    const res = await api.get(path, { ...params, page, per_page: 100 }, opts);
    const rows = rowsOf(res);
    out.push(...rows);
    if (!rows.length || page >= lastPageOf(res)) break;
  }
  return out;
}

/**
 * List endpoints return `name` / `categories` in the Accept-Language language only ("ar,en" is read as "ar"), so the
 * list is fetched once per language and merged by id. Each row gets `ar: { name }` / `en: { name }` (what `tx` reads) plus
 * `categories_ar` / `categories_en` when the row lists category names (`ar` / `en` are the full row in that language).
 */
export async function fetchAllBilingual(path, params = {}) {
  const [ar, en] = await Promise.all([fetchAll(path, params, 'ar'), fetchAll(path, params, 'en')]);
  const enById = new Map(en.map((r) => [r.id, r]));
  return ar.map((row) => {
    const other = enById.get(row.id) || row;
    return { ...row, ar: row, en: other, categories_ar: row.categories, categories_en: other.categories };
  });
}

/** Upload a File through /general/attachment and return its media id. */
export async function uploadMedia(file, { model, option = 'image', type = 'image' }) {
  const res = unwrap(await api.post(e.media.upload, toFormData({ media_type: type, option, model, file }), { headers: { user_type: 'admin' } }));
  const id = res?.id ?? res?.media?.id ?? res?.attachment?.id ?? res?.data?.id;
  if (id === undefined || id === null) {
    throw new ApiError({ status: 0, code: ERROR_CODES.HTTP, message: 'The upload endpoint did not return a media id', data: res });
  }
  return id;
}

/** Slugs for both languages. Mirrors the Postman sample (`slug` / `slug-ar`): the two must differ. */
export function slugPair({ slug, name_en, name_ar }) {
  const given = slugify(String(slug || ''));
  if (given) return { en: given, ar: `${given}-ar` };
  const en = slugify(name_en || name_ar || '');
  const ar = slugify(name_ar || name_en || '');
  return { en, ar: ar === en ? `${ar}-ar` : ar };
}

/**
 * Laravel reports validation errors per API field (`en.name`, `category_ids.0`, `variants.0.base_price`);
 * rewrite them to the form's field names so React Hook Form can show them next to the inputs.
 */
const FIELD_MAP = [
  [/^(ar|en)\.(name|description)$/, (_, l, f) => `${f}_${l}`],
  [/^(ar|en)\.slug$/, () => 'slug'],
  [/^category_ids(\.\d+)?$/, () => 'category_id'],
  [/^barcode$/, () => 'sku'],
  [/^(gallery|image)(\..*)?$/, () => 'image_file'],
  [/^variants\.(\d+)\.base_price$/, (_, i) => `variants.${i}.price`],
  [/^variants\.(\d+)\.discount_value$/, (_, i) => `variants.${i}.discount_percent`],
];
const formField = (key) => {
  for (const [re, to] of FIELD_MAP) if (re.test(key)) return key.replace(re, to);
  return key;
};

export async function withFormErrors(promise, extraMap = []) {
  try {
    return await promise;
  } catch (error) {
    if (error?.status === 422 && error.errors) {
      const rename = (key) => {
        for (const [re, to] of extraMap) if (re.test(key)) return key.replace(re, to);
        return formField(key);
      };
      error.errors = Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [rename(k), v]));
    }
    throw error;
  }
}
