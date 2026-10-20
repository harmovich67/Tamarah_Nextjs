import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';
import { fetchAll, isOn, tx, withFormErrors } from './tamrna';

/**
 * Admin accounts + roles of the Tamrna backend (`/admin/admins`, `/admin/roles`, `/admin/role-not-paginated`), shaped for the
 * Users screen (same function names / shapes as adapters/mock/access.js). Backend roles are the ones created in the
 * backend: the screen lists them as they come. Customers are a separate resource (`/admin/clients`).
 */
const PHONE_CODE = '966';
const localPhone = (p) => String(p || '').replace(/\D/g, '').replace(/^(966|0)/, '');

const roleRow = (ar, en) => ({
  id: ar.id,
  name: ar.slug || ar.key || `role_${ar.id}`,
  display_name_ar: tx(ar, 'name', 'ar') || ar.name || '',
  display_name_en: tx(en || ar, 'name', 'en') || en?.name || ar.name || '',
});

async function listRoles() {
  const get = (lang) => api.get(e.roleList, undefined, { headers: { 'Accept-Language': lang } }).then((r) => (Array.isArray(unwrap(r)) ? unwrap(r) : unwrap(r)?.data ?? []));
  const [ar, en] = await Promise.all([get('ar'), get('en').catch(() => [])]);
  const enById = new Map(en.map((r) => [r.id, r]));
  return ar.map((r) => roleRow(r, enById.get(r.id)));
}

function userRow(a, roles) {
  const roleId = a.role?.id ?? a.role_id ?? null;
  const role = roles.find((r) => r.id === roleId);
  return {
    id: a.id,
    name: a.full_name || a.name || [a.first_name, a.last_name].filter(Boolean).join(' '),
    email: a.email || '',
    phone: a.phone ? `0${localPhone(a.phone)}` : '',
    role_id: roleId,
    role_name: role?.name || (typeof a.role === 'object' ? a.role?.name : '') || 'admin',
    role_ar: role?.display_name_ar || (typeof a.role === 'object' ? a.role?.name : '') || '—',
    role_en: role?.display_name_en || (typeof a.role === 'object' ? a.role?.name : '') || '—',
    status: a.is_active === undefined || isOn(a.is_active) ? 'active' : 'rejected',
    customer_city: null,
    orders_count: 0,
  };
}

export async function listUsers() {
  const [admins, roles] = await Promise.all([fetchAll(e.admins.list), listRoles()]);
  return { users: admins.map((a) => userRow(a, roles)).sort((a, b) => b.id - a.id), roles };
}

const bodyOf = (v) => ({
  full_name: String(v.name || '').trim(),
  email: String(v.email || '').trim(),
  phone: localPhone(v.phone) || undefined,
  phone_code: PHONE_CODE,
  role_id: v.role_id,
  ...(v.password ? { password: v.password } : {}),
});
const ERRORS = [[/^full_name$/, () => 'name']];

export const createUser = (v) =>
  withFormErrors(
    // `user_name` is part of the create form in the collection: derive it from the email.
    api.post(e.admins.list, toFormData({ ...bodyOf(v), user_name: String(v.email || '').split('@')[0] })).then((r) => unwrap(r)),
    ERRORS,
  );

export async function updateUser(id, v) {
  const res = await withFormErrors(api.post(e.admins.item(id), toFormData({ ...bodyOf(v), _method: 'PUT' })).then((r) => unwrap(r)), ERRORS);
  // The account status is a separate toggle endpoint: flip it only when the form asks for another state.
  const wantActive = (v.status || 'active') === 'active';
  const current = unwrap(await api.get(e.admins.item(id)));
  if (current && current.is_active !== undefined && isOn(current.is_active) !== wantActive) await api.post(e.adminStatus(id));
  return res;
}

export const deleteUser = async (id) => api.delete(e.admins.item(id));
