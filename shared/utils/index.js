/**
 * Pure helpers shared across both applications.
 * Ports of the PHP helpers: lang_get(), localized(), fnd_money(), currency(), asset(), etc.
 */

/** Join class names, skipping falsy values. */
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ');
}

/** @param {string} locale */
export const currency = (locale) => (locale === 'ar' ? 'ر.س' : 'SAR');

/** PHP number_format($n, $decimals) with "," thousands and "." decimal separators. */
export function numberFormat(n, decimals = 2) {
  const value = Number(n) || 0;
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** fnd_money(): no decimals for whole numbers, 2 otherwise, then the currency. */
export function formatMoney(amount, locale) {
  const n = Number(amount) || 0;
  const decimals = Math.floor(n) === n ? 0 : 2;
  return `${numberFormat(n, decimals)} ${currency(locale)}`;
}

/** number_format($n, 2) + currency, used by cart/checkout summaries. */
export function formatMoney2(amount, locale) {
  return `${numberFormat(amount, 2)} ${currency(locale)}`;
}

/**
 * lang_get(): read `${field}_${locale}` with fallbacks to the plain field and the other locale.
 * @param {Record<string, any> | null | undefined} data
 * @param {string} field
 * @param {'ar'|'en'} locale
 * @param {any} [fallback]
 */
export function pickLang(data, field, locale, fallback = '') {
  if (!data) return fallback;
  const primary = data[`${field}_${locale}`];
  if (primary) return primary;
  if (data[field]) return data[field];
  const other = data[`${field}_${locale === 'en' ? 'ar' : 'en'}`];
  if (other) return other;
  return fallback;
}

/** localized(): the value for the locale, falling back to the other language when empty. */
export function localized(ar, en, locale) {
  const a = ar ?? '';
  const e = en ?? '';
  if (locale === 'en') return e !== '' ? e : a;
  return a !== '' ? a : e;
}

/** Effective (selling) price of a product or variant. */
export function effectivePrice(item) {
  const sale = Number(item?.sale_price) || 0;
  return sale > 0 ? sale : Number(item?.price) || 0;
}

/** Struck-through price, or null when no discount applies. */
export function oldPrice(item) {
  const sale = Number(item?.sale_price) || 0;
  return sale > 0 ? Number(item?.price) || 0 : null;
}

export function discountPercent(item) {
  const old = oldPrice(item);
  const now = effectivePrice(item);
  return old && old > now ? Math.round(((old - now) / old) * 100) : 0;
}

/** English display of Arabic weight strings (product card behaviour). */
export function weightToEnglish(text) {
  const map = [
    ['كرتون مبرد', 'chilled carton'],
    ['كرتون', 'carton'],
    ['مبرد', 'chilled'],
    ['علبة', 'box'],
    ['كجم', 'kg'],
    ['كيلو', 'kg'],
    ['جرام', 'g'],
    ['غرام', 'g'],
  ];
  return map.reduce((acc, [from, to]) => acc.split(from).join(to), String(text ?? ''));
}

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Arabic-Indic / Persian digits -> latin digits (OTP and phone inputs). */
export function normalizeDigits(value) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_INDIC.indexOf(d)));
}

/** Latin digits -> Arabic-Indic digits, with the Arabic decimal separator (ar-SA reference). */
export function toArabicDigits(text) {
  return String(text ?? '')
    .replace(/(\d)\.00(?!\d)/g, '$1')
    .replace(/(\d)\.(\d)/g, '$1٫$2')
    .replace(/[0-9]/g, (d) => ARABIC_INDIC.charAt(Number(d)));
}

/** Resolve an asset path stored in the database ("assets/images/x.webp", "uploads/...", full URL). */
export function assetUrl(path, base = '') {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const cleanBase = String(base || '').replace(/\/$/, '');
  return `${cleanBase}/${String(path).replace(/^\//, '')}`;
}

export function debounce(fn, wait = 300) {
  let t;
  const debounced = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(t);
  return debounced;
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Saudi mobile: 05xxxxxxxx, +9665xxxxxxxx, 9665xxxxxxxx, 5xxxxxxxx. */
export function isSaudiMobile(value) {
  return /^(\+?966|0)?5\d{8}$/.test(normalizeDigits(value).replace(/[\s-]+/g, ''));
}

export function initialsOf(name) {
  const words = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.replace(/\.+$/, '').length > 1);
  const first = words[0] ?? String(name ?? '');
  let second = words[1] ?? '';
  if (second.slice(0, 2) === 'ال' && second.length > 3) second = second.slice(2);
  return (first.slice(0, 1) + second.slice(0, 1)).trim();
}

export function nl2br(text) {
  return String(text ?? '').split(/\r?\n/);
}

export function safeJsonParse(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function pad(n, size = 2) {
  return String(n).padStart(size, '0');
}

/** YYYY-MM-DD in the local timezone. */
export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nowSql(date = new Date()) {
  return `${todayISO(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * OtpService::cleanPhone(): +9665…, 009665…, 9665…, 5… -> 05XXXXXXXX
 * @param {string} phone
 */
export function cleanSaudiPhone(phone) {
  let p = normalizeDigits(String(phone ?? '').trim()).replace(/[^\d+]/g, '');
  if (p.startsWith('+966')) p = `0${p.slice(4)}`;
  else if (p.startsWith('00966')) p = `0${p.slice(5)}`;
  else if (p.startsWith('966')) p = `0${p.slice(3)}`;
  else if (p.startsWith('5') && p.length === 9) p = `0${p}`;
  return p;
}

/** Pseudo-random alphanumeric token (mock layer only). */
export function randomToken(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export { pickupNotes, readPickup } from './pickup.js';
