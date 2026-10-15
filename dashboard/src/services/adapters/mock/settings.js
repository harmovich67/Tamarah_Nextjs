import { publishSettingsToStorefront } from '@tamrna/shared/mocks';
import { config } from '@/lib/config';
import { db, latency, fail, requireRole, storeUpload, logActivity } from './db';

/** Mock adapter for the `settings` table screens (payment gateways + store identity). */

export const PAYMENT_KEYS = [
  'gateway_provider', 'gateway_mode', 'gateway_publishable_key', 'gateway_secret_key',
  'enable_mada', 'enable_apple_pay', 'enable_credit_card',
  'enable_paymob', 'paymob_api_key', 'paymob_integration_id', 'paymob_iframe_id', 'paymob_hmac', 'paymob_mode',
  'enable_tamara', 'tamara_merchant_token', 'tamara_public_key', 'tamara_mode',
  'enable_tabby', 'tabby_public_key', 'tabby_secret_key', 'tabby_mode',
  'enable_cod', 'cod_fee',
  'enable_bank_transfer', 'bank_name', 'bank_account_name', 'bank_iban',
  'shipping_standard_fee', 'shipping_free_threshold', 'enable_branch_pickup',
  'allow_guest_checkout',
];

export const SITE_KEYS = [
  'site_name_ar', 'site_name_en', 'site_tagline_ar', 'site_tagline_en', 'site_logo',
  'announcement_text_ar', 'announcement_text_en',
  'contact_phone', 'contact_whatsapp', 'contact_email', 'contact_address', 'contact_address_ar', 'contact_address_en',
  'social_facebook', 'social_instagram', 'footer_text_ar', 'footer_text_en',
];

/** Mock mode: make the storefront (another origin, own localStorage) see the saved settings. Never blocks or fails a save. */
export const syncSettingsToStorefront = () => publishSettingsToStorefront(config.storefrontUrl, db.getSettings()).catch(() => false);

const pick = (all, keys) => Object.fromEntries(keys.map((k) => [k, all[k] ?? '']));

export async function getPaymentSettings() {
  await latency(150);
  requireRole('super_admin');
  return pick(db.getSettings(), PAYMENT_KEYS);
}

export async function updatePaymentSettings(values) {
  await latency(350);
  requireRole('super_admin');
  const patch = {};
  PAYMENT_KEYS.forEach((k) => {
    if (values[k] !== undefined && values[k] !== null) patch[k] = String(values[k]);
  });
  db.setSettings(patch);
  logActivity('info', 'admin', 'Payment settings updated');
  await syncSettingsToStorefront();
  return pick(db.getSettings(), PAYMENT_KEYS);
}

const PLACEHOLDER = /sample|demo|mock|tumurna|fake|your_/i;
const isPlaceholder = (v) => !String(v || '').trim() || PLACEHOLDER.test(String(v));

/** POST /api/admin/payment/test-connection — validates the (unsaved) credentials in the form. */
export async function testPaymentConnection({ provider, config = {} }) {
  await latency(900);
  requireRole('super_admin');
  if (!provider) fail('يرجى تحديد بوابة الدفع للاختبار', 400);
  const rules = {
    paymob: [config.paymob_api_key, config.paymob_integration_id, config.paymob_iframe_id],
    moyasar: [config.gateway_secret_key],
    stripe: [config.gateway_secret_key],
    tabby: [config.tabby_secret_key],
    tamara: [config.tamara_merchant_token],
  }[provider];
  if (!rules) fail('بوابة غير معروفة', 400);
  const ok = rules.every((v) => !isPlaceholder(v));
  return ok
    ? { success: true, message: 'تم الاتصال بالبوابة بنجاح (بيئة المحاكاة): المفاتيح تبدو صحيحة.' }
    : { success: false, message: 'المفاتيح المدخلة تجريبية أو ناقصة. أدخل مفاتيح البوابة الحقيقية ثم أعد الاختبار.' };
}

export async function getSiteSettings() {
  await latency(150);
  requireRole('super_admin');
  return pick(db.getSettings(), SITE_KEYS);
}

export async function updateSiteSettings(values) {
  await latency(350);
  requireRole('super_admin');
  const patch = {};
  SITE_KEYS.forEach((k) => {
    if (values[k] !== undefined && values[k] !== null) patch[k] = String(values[k]);
  });
  if (patch.contact_address_ar && values.contact_address === undefined) patch.contact_address = patch.contact_address_ar;
  const logo = await storeUpload(values.logo_file);
  if (logo) patch.site_logo = logo;
  db.setSettings(patch);
  logActivity('info', 'admin', 'Site settings updated');
  await syncSettingsToStorefront();
  return pick(db.getSettings(), SITE_KEYS);
}
