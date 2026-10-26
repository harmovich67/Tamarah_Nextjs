'use client';

import { useLocale } from '@/components/LocaleProvider';

/** Country codes the backend accepts for `phone_code` (Saudi Arabia only for now). */
export const PHONE_CODES = [['966', '🇸🇦 +966']];
export const DEFAULT_PHONE_CODE = PHONE_CODES[0][0];

/**
 * The country-code chip shown in front of the mobile number (registration and sign-in): flag + code, on its own tinted
 * background so it reads as a part of the number, not as another field.
 * @param {{ registration: object }} props the spread of `register('phone_code')`
 */
export default function PhoneCodeSelect({ registration }) {
  const { tr } = useLocale();
  return (
    <select className="input select auth-code-select" aria-label={tr('رمز الدولة', 'Country code')} title={tr('رمز الدولة', 'Country code')} {...registration}>
      {PHONE_CODES.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}
