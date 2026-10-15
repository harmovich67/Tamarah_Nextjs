import { MOCK_PASSWORDS } from '@tamrna/shared/mocks';
import { safeStorage } from '@tamrna/shared/api';
import { OTP } from '@tamrna/shared/constants';
import { cleanSaudiPhone, nowSql } from '@tamrna/shared/utils';
import { getClientLocale } from '@/lib/locale-client';
import { getStoredUser } from '@/lib/session';
import { db, latency, fail } from './db';
import { clearCartState } from './cart';

/**
 * Mock auth adapter. Mirrors AuthController + OtpService: password login (rate limited), phone + OTP login,
 * registration, password reset, logout. The OTP demo code is the `otp_demo_code` setting (default 123456).
 */

const RATE_KEY = 'tamrna.web.rate.login';
const OTP_KEY = 'tamrna.web.otp';

const t = (ar, en) => (getClientLocale() === 'en' ? en : ar);

/** Strip secrets and attach the role name, exactly like Auth::user(). */
export function publicUser(row) {
  if (!row) return null;
  const role = db.find('roles', row.role_id);
  const { password, otp_code, ...user } = row; // eslint-disable-line no-unused-vars
  return { ...user, role_name: role?.name || 'customer' };
}

const passwordOf = (row) => row.password ?? MOCK_PASSWORDS[row.email];

function checkRateLimit() {
  const now = Date.now();
  const state = safeStorage.getJson(RATE_KEY, { count: 0, resetAt: 0 });
  const current = state.resetAt > now ? state : { count: 0, resetAt: now + 300000 };
  if (current.count >= 6) {
    const wait = Math.ceil((current.resetAt - now) / 1000);
    fail(
      t(`تم حظر محاولات الدخول مؤقتاً لتكرار المحاولات الخاطئة. يرجى الانتظار ${wait} ثانية.`, `Too many sign-in attempts. Please wait ${wait} seconds.`),
      429,
    );
  }
  safeStorage.setJson(RATE_KEY, { ...current, count: current.count + 1 });
}

const sessionFor = (row) => ({ token: `mock.${row.id}.${Date.now().toString(36)}`, user: publicUser(row) });

export async function login({ identity, password }) {
  await latency(250);
  checkRateLimit();
  const id = String(identity || '').trim();
  const phone = cleanSaudiPhone(id);
  const row = db.all('users').find((u) => (id.includes('@') ? u.email?.toLowerCase() === id.toLowerCase() : u.phone === phone));
  if (!row || passwordOf(row) !== password) {
    fail(t('بيانات الدخول غير صحيحة. تأكد من الجوال/البريد وكلمة المرور.', 'Incorrect sign-in details. Check your mobile/email and password.'), 401);
  }
  if (row.status && row.status !== 'active') fail(t('هذا الحساب موقوف. تواصل مع الدعم.', 'This account is suspended. Please contact support.'), 403);
  safeStorage.remove(RATE_KEY);
  return sessionFor(row);
}

function issueOtp(phone) {
  const code = db.getSetting('otp_demo_code', OTP.DEMO_CODE) || OTP.DEMO_CODE;
  const minutes = Number(db.getSetting('otp_expiry_minutes', OTP.TTL_MINUTES)) || OTP.TTL_MINUTES;
  safeStorage.setJson(OTP_KEY, { phone, code, expiresAt: Date.now() + minutes * 60000 });
  const row = db.all('users').find((u) => u.phone === phone);
  if (row) db.update('users', row.id, { otp_code: code });
  return { phone, expires_in: minutes * 60 };
}

const otpEnabled = () => String(db.getSetting('otp_enabled', '1')) === '1';

/** Phone + OTP login: creates the customer on first use, then sends the code. */
export async function loginWithOtp({ phone }) {
  await latency(250);
  if (!otpEnabled()) fail(t('الدخول برمز الهاتف غير متاح حالياً. استخدم البريد وكلمة المرور.', 'Phone-code sign-in is unavailable. Use email and password.'));
  const clean = cleanSaudiPhone(phone);
  if (clean.length < 9) fail(t('يرجى إدخال رقم جوال سعودي صحيح (مثال: 0555123456)', 'Enter a valid Saudi mobile number (e.g. 0555123456)'), 422, { phone: [t('رقم الجوال غير صحيح', 'Invalid mobile number')] });
  if (!db.all('users').find((u) => u.phone === clean)) {
    db.insert('users', { role_id: 3, name: t('عميل جديد', 'New customer'), email: `${clean}@tamrna.store`, phone: clean, status: 'active', phone_verified: 0 });
  }
  return issueOtp(clean);
}

export async function register(input) {
  await latency(300);
  if (!otpEnabled()) fail(t('التسجيل برمز الهاتف غير متاح حالياً.', 'Phone registration is unavailable.'));
  const name = `${input.first || ''} ${input.last || ''}`.trim() || input.name || '';
  const phone = cleanSaudiPhone(input.phone);
  const email = String(input.email || '').trim();
  if (!name || !phone) fail(t('يرجى إدخال الاسم ورقم الجوال السعودي', 'Please enter your name and Saudi mobile number'));
  if (phone.length < 9) fail(t('يرجى إدخال رقم جوال سعودي صحيح (مثال: 0555123456)', 'Enter a valid Saudi mobile number'));
  const existing = db.all('users').find((u) => u.phone === phone);
  if (existing && existing.phone_verified === 1) {
    issueOtp(phone);
    return { phone, notice: 'registered' };
  }
  if (email) {
    const clash = db.all('users').find((u) => u.email?.toLowerCase() === email.toLowerCase() && u.phone !== phone);
    if (clash) fail(t('البريد الإلكتروني مسجل بالفعل لمستخدم آخر', 'This email is already registered to another user'), 422, { email: [t('البريد الإلكتروني مسجل بالفعل', 'Email already registered')] });
  }
  const record = { name, email: email || `${phone}@tamrna.store`, password: input.password || `pass_${Math.random().toString(36).slice(2, 8)}`, phone };
  if (existing) db.update('users', existing.id, record);
  else db.insert('users', { role_id: 3, status: 'active', phone_verified: 0, ...record });
  issueOtp(phone);
  return { phone, notice: null };
}

export async function verifyOtp({ phone, otp }) {
  await latency(250);
  const clean = cleanSaudiPhone(phone);
  const submitted = String(otp || '').trim();
  const demo = db.getSetting('otp_demo_code', OTP.DEMO_CODE) || OTP.DEMO_CODE;
  const pending = safeStorage.getJson(OTP_KEY, null);
  const valid =
    submitted === demo || (pending && pending.phone === clean && pending.code === submitted && pending.expiresAt >= Date.now());
  if (!valid) {
    fail(t('رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى إدخال 123456 أو طلب رمز جديد.', 'The code is incorrect or expired. Enter 123456 or request a new code.'), 422, {
      otp: [t('رمز التحقق غير صحيح', 'Incorrect verification code')],
    });
  }
  const row = db.all('users').find((u) => u.phone === clean);
  if (!row) fail(t('لا يوجد حساب بهذا الرقم', 'No account found for this number'), 404);
  db.update('users', row.id, { phone_verified: 1, status: 'active', otp_code: null });
  safeStorage.remove(OTP_KEY);
  return sessionFor(db.find('users', row.id));
}

export async function resendOtp({ phone }) {
  await latency(250);
  return issueOtp(cleanSaudiPhone(phone));
}

export async function forgotPassword({ phone }) {
  await latency(300);
  const clean = cleanSaudiPhone(phone);
  if (clean.length < 9) fail(t('يرجى إدخال رقم جوال سعودي صحيح (مثال: 0555123456)', 'Enter a valid Saudi mobile number'), 422, { phone: [t('رقم الجوال غير صحيح', 'Invalid mobile number')] });
  if (!db.all('users').find((u) => u.phone === clean)) fail(t('رقم الجوال غير مسجل لدينا في تمرنا.', 'This mobile number is not registered with Tamrna.'), 404);
  return issueOtp(clean);
}

export async function logout() {
  await latency(60);
  // The PHP logout ran session_destroy(), which also dropped the session cart and coupon.
  clearCartState();
  return { success: true };
}

/** Re-read the signed-in user from the (mock) database, e.g. after a profile update. */
export async function currentUser() {
  await latency(0);
  const stored = getStoredUser();
  if (!stored) return null;
  const row = db.find('users', stored.id);
  return row && row.status === 'active' ? publicUser(row) : null;
}
