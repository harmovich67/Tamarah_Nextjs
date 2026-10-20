import { clearSession, getStoredUser } from '@/lib/session';
import { api, form, guestToken, localPhone, PHONE_CODE, t, toUser, unsupported, unwrap } from './http';

/**
 * Customer authentication against the Tamrna backend (`/client/*`):
 *   login            POST /client/login            { auth, password, phone_code, device_token, type }  (?guest_token merges the guest cart)
 *   register         POST /client/register         -> the backend sends an OTP, then
 *   verify           POST /client/verify           { auth, code, phone_code, device_token, type }      -> token
 *   resend           POST /client/resend-otp       { phone_code, phone }
 *   forgot / reset   POST /client/forget-password  { auth, password, phone_code }, then POST /client/reset-password { ..., code }
 *   logout           POST /client/logout           { device_token, type }
 * There is no "sign in with a code only" flow, so `loginWithOtp` is not offered.
 */
// Held in memory only (never persisted): it survives the client-side navigation to the code screen, not a page reload.
let pendingReset = null;
const DEVICE = { device_token: 'web', type: 'web' };
const isEmail = (v) => String(v).includes('@');
// The collection sends `user-type: client` on registration and code verification.
const CLIENT = { headers: { 'user-type': 'client' } };

/** `{ token, user }` from a login / verify response. */
function sessionFrom(res, fallback) {
  const data = unwrap(res);
  const token = data?.token ?? data?.access_token;
  if (!token) throw unsupported(t('تعذر إكمال تسجيل الدخول (لم يصل رمز الجلسة)', 'Could not sign in (no session token was returned)'));
  return { token, user: toUser(data, fallback) };
}

export async function login({ identity, password }) {
  const id = String(identity || '').trim();
  const body = form({ auth: isEmail(id) ? id : localPhone(id), password, phone_code: isEmail(id) ? undefined : PHONE_CODE, ...DEVICE });
  const res = await api.post(`/client/login?guest_token=${encodeURIComponent(guestToken())}`, body);
  return sessionFrom(res, isEmail(id) ? { email: id } : { phone: localPhone(id) });
}

export async function loginWithOtp() {
  throw unsupported(t('الدخول برمز الهاتف غير متاح. استخدم رقم الجوال وكلمة المرور.', 'Phone-code sign-in is not available. Use your mobile number and password.'));
}

/** Registration is confirmed with the OTP the backend sends; `verifyOtp` finishes it. */
export async function register(input) {
  const phone = localPhone(input.phone);
  const body = form({
    first_name: input.first,
    last_name: input.last,
    email: String(input.email || '').trim() || undefined,
    phone,
    phone_code: PHONE_CODE,
    password: input.password,
    password_confirmation: input.confirm ?? input.password,
    ...DEVICE,
  });
  await api.post('/client/register', body, CLIENT);
  pendingReset = null;
  return { phone: input.phone, notice: null };
}

/** Confirms a registration code, or (after "forgot password") sets the new password and signs in. */
export async function verifyOtp({ phone, otp }) {
  const reset = pendingReset;
  if (reset && reset.phone === phone) {
    await api.post(
      '/client/reset-password',
      form({ phone_code: PHONE_CODE, auth: localPhone(phone), password: reset.password, password_confirmation: reset.password, code: otp }),
    );
    pendingReset = null;
    return login({ identity: phone, password: reset.password });
  }
  const res = await api.post(
    `/client/verify?guest_token=${encodeURIComponent(guestToken())}`,
    form({ auth: localPhone(phone), code: otp, phone_code: PHONE_CODE, ...DEVICE }),
    CLIENT,
  );
  return sessionFrom(res, { phone: localPhone(phone) });
}

export async function resendOtp({ phone }) {
  await api.post('/client/resend-otp', form({ phone_code: PHONE_CODE, phone: localPhone(phone) }));
  return { phone, expires_in: 300 };
}

/** The backend wants the new password up front; it is applied by `reset-password` once the code is confirmed. */
export async function forgotPassword({ phone, password }) {
  if (!password) throw unsupported(t('أدخل كلمة المرور الجديدة', 'Enter the new password'));
  await api.post('/client/forget-password', form({ auth: localPhone(phone), password, phone_code: PHONE_CODE }));
  pendingReset = { phone, password };
  return { phone };
}

export async function logout() {
  try {
    await api.post('/client/logout', form(DEVICE));
  } finally {
    pendingReset = null;
    clearSession();
  }
  return { success: true };
}

/** Re-read the profile (e.g. after an update); the stored user is returned when the call fails. */
export async function currentUser() {
  const stored = getStoredUser();
  if (!stored) return null;
  try {
    return toUser(unwrap(await api.get('/client/profile')), stored);
  } catch {
    return stored;
  }
}
