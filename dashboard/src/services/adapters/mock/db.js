import { createMockDb, mockLatency } from '@tamrna/shared/mocks';
import { ApiError, ERROR_CODES } from '@tamrna/shared/api';
import { getStoredUser } from '@/lib/session';
import { nowSql } from '@tamrna/shared/utils';

/** Dashboard mock "database" (own localStorage namespace, same seed as the storefront). */
export const db = createMockDb({ namespace: 'tamrna-admin' });
export const latency = mockLatency;

export function fail(message, status = 400, errors = {}) {
  const code = status === 404 ? ERROR_CODES.NOT_FOUND : status === 403 ? ERROR_CODES.FORBIDDEN : status === 422 ? ERROR_CODES.VALIDATION : status === 409 ? ERROR_CODES.CONFLICT : ERROR_CODES.HTTP;
  throw new ApiError({ status, code, message, errors, data: { success: false, message } });
}

/** Server-side authorization of the mock API (the Laravel backend must do the same). */
const LEVEL = { customer: 0, store_manager: 1, super_admin: 2 };
export function requireRole(role = 'store_manager') {
  const user = getStoredUser();
  if (!user) fail('Unauthenticated', 401);
  if ((LEVEL[user.role_name] ?? -1) < LEVEL[role]) fail('Forbidden', 403);
  return user;
}

/** Append to the activity log (storage/logs equivalent). */
export function logActivity(level, channel, message, context = {}) {
  db.insert('security_logs', { level, channel, message, context, created_at: nowSql() });
}

/** Persist a File chosen in a form. Mock mode only: stored as a data URL so the demo survives reloads. */
export function storeUpload(file) {
  if (!file || typeof file === 'string') return Promise.resolve(file || null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
