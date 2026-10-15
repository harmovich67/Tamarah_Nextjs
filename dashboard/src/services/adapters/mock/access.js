import { getStoredUser } from '@/lib/session';
import { db, latency, fail, requireRole, logActivity } from './db';

/** Mock adapter for users & roles (UsersController). */

export async function listUsers() {
  await latency(200);
  requireRole('super_admin');
  const roles = db.all('roles').slice().sort((a, b) => a.id - b.id);
  const users = db.all('users').slice().sort((a, b) => b.id - a.id).map((u) => {
    const role = roles.find((r) => r.id === u.role_id);
    const defaultAddress = db.all('user_addresses').find((a) => a.user_id === u.id && a.is_default);
    const { password, otp_code, ...safe } = u; // eslint-disable-line no-unused-vars
    return {
      ...safe,
      role_name: role?.name,
      role_ar: role?.display_name_ar,
      role_en: role?.display_name_en,
      customer_city: defaultAddress?.city || null,
      orders_count: db.all('orders').filter((o) => o.user_id === u.id).length,
    };
  });
  return { users, roles };
}

function fields(v, currentId) {
  const name = String(v.name || '').trim();
  const email = String(v.email || '').trim();
  if (!name || !email) fail('جميع الحقول الأساسية مطلوبة', 422, { name: !name ? ['الاسم مطلوب'] : undefined, email: !email ? ['البريد مطلوب'] : undefined });
  if (db.all('users').some((u) => u.email?.toLowerCase() === email.toLowerCase() && u.id !== currentId)) {
    fail('البريد الإلكتروني مسجل بالفعل', 422, { email: ['البريد الإلكتروني مسجل بالفعل'] });
  }
  return { name, email, phone: String(v.phone || '').trim(), role_id: Number(v.role_id) || 3, status: v.status || 'active' };
}

export async function createUser(values) {
  await latency(300);
  requireRole('super_admin');
  if (!values.password) fail('كلمة المرور مطلوبة', 422, { password: ['كلمة المرور مطلوبة'] });
  const user = db.insert('users', { ...fields(values), password: values.password, phone_verified: 1, school_id: 1 });
  logActivity('info', 'admin', `User created: ${user.email}`);
  return { id: user.id };
}

export async function updateUser(id, values) {
  await latency(300);
  requireRole('super_admin');
  const current = db.find('users', id);
  if (!current) fail('المستخدم غير موجود', 404);
  const patch = fields(values, Number(id));
  if (values.password) patch.password = values.password;
  db.update('users', id, patch);
  return { id };
}

export async function deleteUser(id) {
  await latency(250);
  requireRole('super_admin');
  if (Number(id) === getStoredUser()?.id) fail('لا يمكنك حذف حسابك الحالي المسجل به الدخول', 409);
  db.remove('users', id);
  return { success: true };
}
