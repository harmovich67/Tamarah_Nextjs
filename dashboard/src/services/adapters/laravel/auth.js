import { ApiError, ERROR_CODES } from '@tamrna/shared/api';
import { apiClient as api } from '@/lib/apiClient';
import { getStoredUser } from '@/lib/session';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';
import { mediaOf } from './tamrna';

/**
 * Laravel adapter for admin authentication (Bearer token; the token is stored by the auth store).
 * Backend contract: POST /admin/login (multipart) { auth, password, device_token, type } -> { data: { token, ... } }.
 * The backend has a single admin type, so every signed-in user gets the super_admin role in the dashboard.
 */
export async function login({ identity, password }) {
  const body = toFormData({ auth: identity, password, device_token: 'web', type: 'web' });
  const data = unwrap(await api.post(e.login, body, { headers: { user_type: 'admin' } }));
  const token = data?.token ?? data?.access_token;
  if (!token) throw new ApiError({ status: 0, code: ERROR_CODES.HTTP, message: 'The login response did not contain a token', data });

  const raw = data.user ?? data.admin ?? data.profile ?? data;
  const name = raw.full_name || raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(' ') || String(identity);
  return {
    token,
    user: {
      id: raw.id ?? 0,
      name,
      email: raw.email || (String(identity).includes('@') ? String(identity) : ''),
      phone: raw.phone ?? '',
      status: 'active',
      avatar: mediaOf(raw.avatar ?? raw.image)?.url || undefined,
      role_name: 'super_admin',
      role_ar: 'مدير النظام',
      role_en: 'Administrator',
    },
  };
}

export const logout = async () => api.post(e.logout);
// The backend has no /me or /refresh for admins: the stored session is the source of truth until a 401 comes back.
export const currentUser = async () => getStoredUser();
export const refresh = async () => ({});
