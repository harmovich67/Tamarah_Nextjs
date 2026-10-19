import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { ApiError, ERROR_CODES } from '@tamrna/shared/api';
import { toFormData, unwrap } from './helpers';
import { fetchAllBilingual, isOn, listFilters, mediaOf, tx, uploadMedia, withFormErrors } from './tamrna';

/** Laravel adapter for the homepage CMS (same function names / shapes as adapters/mock/home.js). */
export const getHomeContent = async () => unwrap(await api.get(e.homeSections)); // -> { sections, banners }
export const updateSection = async (id, v) => unwrap(await api.post(e.homeSection(id), toFormData({ ...v, _method: 'PUT' })));
export const updateFeatures = async (id, v) => unwrap(await api.put(e.homeFeatures, { id, ...v }));
export const updateTestimonials = async (id, v) => unwrap(await api.put(e.homeTestimonials, { id, ...v }));
export const updateNewsletter = async (id, v) => unwrap(await api.put(e.homeNewsletter, { id, ...v }));
export const createCustomSection = async (v) => unwrap(await api.post(e.homeSections, toFormData(v)));
export const deleteCustomSection = async (id) => api.delete(e.homeSection(id));
export const toggleSection = async (id) => unwrap(await api.post(e.homeSectionToggle(id)));
export const moveSection = async ({ id, direction }) => unwrap(await api.post(e.homeSectionMove(id), { direction }));

// ------------------------------------------------------------------------------------------------ banners
// Tamrna backend: { placement, is_active, sort_order, image: <media id>, en|ar: { title, name, description } }.
// The slide form maps title -> title, badge -> name, subtitle -> description; the backend has no button text / link.
const BANNER_ERRORS = [
  [/^(ar|en).title$/, (_, l) => `title_${l}`],
  [/^(ar|en).name$/, (_, l) => `badge_${l}`],
  [/^(ar|en).description$/, (_, l) => `subtitle_${l}`],
  [/^image(..*)?$/, () => 'image_file'],
];

function toBanner(row) {
  const image = mediaOf(row.image ?? row.media);
  return {
    id: row.id,
    badge_ar: tx(row, 'name', 'ar'),
    badge_en: tx(row, 'name', 'en'),
    title_ar: tx(row, 'title', 'ar') || tx(row, 'title', 'en'),
    title_en: tx(row, 'title', 'en'),
    subtitle_ar: tx(row, 'description', 'ar'),
    subtitle_en: tx(row, 'description', 'en'),
    cta_ar: '',
    cta_en: '',
    link: '',
    placement: row.placement || 'home',
    image: image?.url || '',
    image_id: image?.id ?? '',
    is_active: row.is_active === undefined || isOn(row.is_active),
    status: row.is_active === undefined || isOn(row.is_active) ? 'active' : 'inactive',
    sort_order: row.sort_order ?? 0,
    order_index: row.sort_order ?? 0,
  };
}

/** The list only carries title/name in one language (no description), so read each full record (`translations`). Banners are few. */
async function withTranslations(row) {
  const full = unwrap(await api.get(e.banners.item(row.id)));
  return { ...row, ...full };
}

export async function listBanners(filters) {
  const rows = await fetchAllBilingual(e.banners.list, listFilters(filters));
  return (await Promise.all(rows.map(withTranslations))).map(toBanner).sort((a, b) => a.order_index - b.order_index || a.id - b.id);
}

// `placement`, `is_active` and `sort_order` travel inside the form values so an edit does not reset them.
async function bannerBody(v) {
  const body = {
    placement: v.placement || 'home',
    is_active: v.is_active ?? true,
    en: { title: (v.title_en || '').trim() || v.title_ar, name: (v.badge_en || '').trim() || v.badge_ar, description: (v.subtitle_en || '').trim() || v.subtitle_ar },
    ar: { title: v.title_ar, name: v.badge_ar, description: v.subtitle_ar },
  };
  if (v.sort_order !== undefined && v.sort_order !== null && v.sort_order !== '') body.sort_order = v.sort_order;
  if (v.image_file instanceof File) body.image = await uploadMedia(v.image_file, { model: 'Banner', option: 'image' });
  return body;
}

export const createBanner = (v) =>
  withFormErrors(bannerBody(v).then((body) => api.post(e.banners.list, toFormData(body)).then((r) => unwrap(r))), BANNER_ERRORS);
// Laravel cannot read multipart bodies on PUT: send POST with _method=PUT.
// The backend rejects an update without `image` (422) and DELETES the current image when its own id is sent back
// (checked on the live server), so an edit must come with a new file; fail here instead of silently losing the image.
export const updateBanner = (id, v) =>
  withFormErrors(
    (async () => {
      if (!(v.image_file instanceof File)) {
        throw new ApiError({
          status: 422,
          code: ERROR_CODES.VALIDATION,
          message: 'Image required',
          errors: { image_file: ['اختر صورة جديدة للحفظ (الباك اند يتطلب صورة عند التعديل) / Choose a new image to save (the backend requires one on update)'] },
        });
      }
      return bannerBody(v);
    })().then((body) => api.post(e.banners.item(id), toFormData({ ...body, _method: 'PUT' })).then((r) => unwrap(r))), BANNER_ERRORS);
export const deleteBanner = async (id) => api.delete(e.banners.item(id));
export const toggleBanner = async (id) => unwrap(await api.post(e.bannerToggle(id)));
/** The backend sorts with { order[id]: position }: swap the slide with its neighbour and send the whole order. */
export async function moveBanner({ id, direction }) {
  const banners = await listBanners();
  const i = banners.findIndex((b) => String(b.id) === String(id));
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= banners.length) return { success: true };
  [banners[i], banners[j]] = [banners[j], banners[i]];
  return api.post(e.bannerSortOrder, toFormData({ order: Object.fromEntries(banners.map((b, idx) => [b.id, idx + 1])) }));
}
