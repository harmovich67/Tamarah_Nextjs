import { MOCK_PASSWORDS } from '@tamrna/shared/mocks';
import { safeStorage } from '@tamrna/shared/api';
import { cleanSaudiPhone } from '@tamrna/shared/utils';
import { getStoredUser } from '@/lib/session';
import { db, latency, fail, logActivity } from './db';

const RATE_KEY = 'tamrna.admin.rate.login';

function publicUser(row) {
  const role = db.find('roles', row.role_id);
  const { password, otp_code, ...user } = row; // eslint-disable-line no-unused-vars
  return { ...user, role_name: role?.name || 'customer', role_ar: role?.display_name_ar, role_en: role?.display_name_en };
}

/** POST /admin/login (AuthController::login with the 6-attempts / 5-minutes rate limit). */
export async function login({ identity, password }) {
  await latency(250);
  const now = Date.now();
  const state = safeStorage.getJson(RATE_KEY, { count: 0, resetAt: 0 });
  const cur = state.resetAt > now ? state : { count: 0, resetAt: now + 300000 };
  if (cur.count >= 6) fail(`تم حظر محاولات الدخول مؤقتاً. يرجى الانتظار ${Math.ceil((cur.resetAt - now) / 1000)} ثانية.`, 429);
  safeStorage.setJson(RATE_KEY, { ...cur, count: cur.count + 1 });

  const id = String(identity || '').trim();
  const phone = cleanSaudiPhone(id);
  const row = db.all('users').find((u) => (id.includes('@') ? u.email?.toLowerCase() === id.toLowerCase() : u.phone === phone));
  const valid = row && (row.password ?? MOCK_PASSWORDS[row.email]) === password;
  if (!valid) {
    logActivity('warning', 'security', 'Failed password login attempt', { identifier: id });
    fail('بيانات الدخول غير صحيحة.', 401);
  }
  if (row.status !== 'active') fail('هذا الحساب موقوف.', 403);
  const user = publicUser(row);
  if (!['super_admin', 'store_manager'].includes(user.role_name)) fail('هذا الحساب لا يملك صلاحية دخول لوحة التحكم.', 403);
  safeStorage.remove(RATE_KEY);
  logActivity('info', 'auth', 'User logged in via password', { id: row.id, email: row.email });
  return { token: `mock.admin.${row.id}.${Date.now().toString(36)}`, user };
}

export async function logout() {
  await latency(60);
  return { success: true };
}

export async function currentUser() {
  await latency(60);
  const stored = getStoredUser();
  const row = stored && db.find('users', stored.id);
  if (!row || row.status !== 'active') fail('Unauthenticated', 401);
  return publicUser(row);
}

export async function refresh() {
  return { token: `mock.admin.refresh.${Date.now().toString(36)}` };
}

export { publicUser };
