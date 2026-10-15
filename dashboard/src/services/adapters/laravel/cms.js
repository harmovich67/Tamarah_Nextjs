import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';

/** Laravel adapter for the CMS domain (same function names / shapes as adapters/mock/cms.js). */
const multipartUpdate = (url, values) => api.post(url, toFormData({ ...values, _method: 'PUT' }));

export const getFieldGroups = async ({ entityType, entityId, subType }) =>
  unwrap(await api.get(e.customFields.list, { entity_type: entityType, entity_id: entityId, sub_type: subType, active: 1, with_fields: 1 }));
export const listCustomFieldGroups = async () => unwrap(await api.get(e.customFields.list));
export const getCustomFieldGroup = async (id) => unwrap(await api.get(e.customFields.item(id)));
export const createCustomFieldGroup = async (v) => unwrap(await api.post(e.customFields.list, v));
export const updateCustomFieldGroup = async (id, v) => unwrap(await api.put(e.customFields.item(id), v));
export const deleteCustomFieldGroup = async (id) => api.delete(e.customFields.item(id));
export const getCustomFieldTargets = async (type) => unwrap(await api.get(e.customFieldTargets, { type }));

export const listPages = async () => unwrap(await api.get(e.pages.list));
export const getPage = async (id) => unwrap(await api.get(e.pages.item(id)));
export const createPage = async (v) => unwrap(await api.post(e.pages.list, toFormData(v)));
export const updatePage = async (id, v) => unwrap(await multipartUpdate(e.pages.item(id), v));
export const deletePage = async (id) => api.delete(e.pages.item(id));
export const togglePageStatus = async (id) => unwrap(await api.post(e.pageStatus(id)));

export const listPosts = async () => unwrap(await api.get(e.posts.list));
export const getPost = async (id) => unwrap(await api.get(e.posts.item(id)));
export const createPost = async (v) => unwrap(await api.post(e.posts.list, toFormData(v)));
export const updatePost = async (id, v) => unwrap(await multipartUpdate(e.posts.item(id), v));
export const deletePost = async (id) => api.delete(e.posts.item(id));

export const listMenus = async () => unwrap(await api.get(e.menus.list)); // -> { header, footer, pages }
export const createMenuItem = async (v) => unwrap(await api.post(e.menus.list, v));
export const updateMenuItem = async (id, v) => unwrap(await api.put(e.menus.item(id), v));
export const deleteMenuItem = async (id) => api.delete(e.menus.item(id));
