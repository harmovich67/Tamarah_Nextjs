'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toFriendlyMessage, safeStorage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { OTP } from '@tamrna/shared/constants';
import { isSaudiMobile, normalizeDigits } from '@tamrna/shared/utils';
import { verifyOtpSchema } from '@tamrna/shared/schemas';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { config } from '@/lib/config';
import { showToast } from '@/store/toastStore';
import AuthShell, { DemoNotice } from './AuthShell';
import { PENDING_PHONE_KEY } from './RegisterForm';

// The Tamrna backend's code is 4–6 digits (the collection shows both `1111` and `111111`): accept that range and
// auto-submit once six digits are typed; shorter codes are sent with the button. The mock keeps its fixed 6 digits.
const LIVE = config.apiMode === 'laravel';
const MIN_LENGTH = LIVE ? 4 : OTP.LENGTH;

function Form() {
  const { locale, tr } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const codeInput = useRef(null);
  const [phone, setPhone] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(OTP.RESEND_SECONDS);
  const [editing, setEditing] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const noticeKey = params.get('notice');

  useEffect(() => {
    const p = params.get('phone') || safeStorage.get(PENDING_PHONE_KEY);
    if (!p) router.replace('/register');
    else setPhone(p);
  }, [params, router]);

  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const submit = async (value) => {
    const digits = normalizeDigits(value).replace(/\D/g, '');
    let otp = digits;
    if (LIVE) {
      if (digits.length < MIN_LENGTH) {
        setError(tr('يرجى إدخال رمز التحقق كاملاً', 'Enter the full verification code'));
        return;
      }
    } else {
      const parsed = verifyOtpSchema(locale).safeParse({ phone, otp: value });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message || '');
        return;
      }
      otp = parsed.data.otp;
    }
    setBusy(true);
    setError('');
    try {
      const session = await authService.verifyOtp({ phone, otp });
      setSession(session);
      safeStorage.remove(PENDING_PHONE_KEY);
      qc.invalidateQueries();
      if (['super_admin', 'store_manager'].includes(session.user.role_name)) window.location.assign(`${config.dashboardUrl}/`);
      else router.replace('/profile?welcome=1');
    } catch (err) {
      // Wrong / expired code: show the backend's own message and let the visitor type it again.
      setError(toFriendlyMessage(err, locale));
      setCode('');
      setTimeout(() => codeInput.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  };

  const onChange = (e) => {
    const val = normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, OTP.LENGTH);
    setCode(val);
    if (val.length === OTP.LENGTH) submit(val);
  };

  const resend = async () => {
    try {
      await authService.resendOtp({ phone });
      setLeft(OTP.RESEND_SECONDS);
      setError('');
      showToast(tr('تمت إعادة إرسال رمز التحقق بنجاح!', 'Verification code sent again!'), 'success');
    } catch (err) {
      setError(toFriendlyMessage(err, locale));
    }
  };

  // A wrong mobile typed at registration: only the number changes, the rest of the registration is kept by the backend.
  const savePhone = async (e) => {
    e.preventDefault();
    setPhoneError('');
    if (!isSaudiMobile(newPhone)) {
      setPhoneError(tr('يرجى إدخال رقم جوال سعودي صحيح (مثال: 0555123456)', 'Enter a valid Saudi mobile number (e.g. 0555123456)'));
      return;
    }
    setBusy(true);
    try {
      const res = await authService.changePhone({ phone, newPhone });
      safeStorage.set(PENDING_PHONE_KEY, res.phone);
      setPhone(res.phone);
      setEditing(false);
      setNewPhone('');
      setCode('');
      setError('');
      setLeft(OTP.RESEND_SECONDS);
      showToast(tr('تم تغيير رقم الجوال وإرسال رمز جديد', 'Mobile number changed and a new code sent'), 'success');
    } catch (err) {
      setPhoneError(toFriendlyMessage(err, locale));
    } finally {
      setBusy(false);
    }
  };

  const notice = noticeKey === 'registered'
    ? tr('هذا الجوال مسجل مسبقاً، تم إرسال رمز OTP لتسجيل دخولك السريع.', 'This mobile is already registered. A code was sent for quick sign-in.')
    : noticeKey === 'reset'
      ? tr('تم إرسال رمز التحقق إلى جوالك لاستعادة الوصول إلى حسابك.', 'A verification code was sent to your mobile to recover your account.')
      : '';

  const subtitle = LIVE
    ? tr('أدخل رمز التحقق الذي وصلك على جوالك.', 'Enter the verification code sent to your mobile.')
    : tr('أدخل الرمز المكوّن من ٦ أرقام. صلاحيته ٥ دقائق.', 'Enter the 6-digit code. It expires in 5 minutes.');

  return (
    <AuthShell title={tr('تأكيد رقم الجوال', 'Verify your mobile')} subtitle={subtitle}>
      {notice ? <Flash type="info" className="auth-flash">{notice}</Flash> : null}
      {error ? <Flash type="error" className="auth-flash">{error}</Flash> : null}

      <form noValidate className="auth-form" id="otpForm" onSubmit={(e) => { e.preventDefault(); submit(code); }}>
        <fieldset disabled={busy}>
          <FormField id="auth-code" label={tr('رمز التحقق', 'Verification code')} required>
            <input ref={codeInput} id="auth-code" className="input otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={OTP.LENGTH} dir="ltr" placeholder="······" value={code} onChange={onChange} autoFocus />
          </FormField>
          {LIVE && phone ? <p className="auth-password-hint" dir="ltr" style={{ textAlign: 'center' }}>{phone}</p> : null}

          {!LIVE ? (
            <p className="auth-demo-code">
              {tr('رمز التجربة', 'Preview code')}: <bdi>{OTP.DEMO_CODE}</bdi>
            </p>
          ) : null}

          <button type="submit" className="button button--primary auth-submit">
            {tr('تأكيد الرمز', 'Verify code')}
            <Icon name="arrow-left" size={20} className="directional-arrow" />
          </button>
        </fieldset>
      </form>

      <div className="auth-verification-actions">
        <button type="button" id="auth-resend" className="button button--ghost" disabled={left > 0 || busy} onClick={resend}>
          {tr('إعادة إرسال الرمز', 'Resend code')}
          <span id="auth-countdown" suppressHydrationWarning>{left > 0 ? ` (${left})` : ''}</span>
        </button>
        {noticeKey !== 'reset' ? (
          <button type="button" className="button button--ghost" onClick={() => { setEditing((v) => !v); setPhoneError(''); }}>
            {tr('تعديل رقم الجوال', 'Change mobile number')}
          </button>
        ) : null}
      </div>

      {editing ? (
        <form noValidate className="auth-form" onSubmit={savePhone}>
          <fieldset disabled={busy}>
            <FormField id="auth-new-phone" label={tr('رقم الجوال الجديد', 'New mobile number')} required error={phoneError}>
              <div className="auth-input-wrap">
                <Icon name="phone" size={19} />
                <input id="auth-new-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" className="input" placeholder="05xxxxxxxx" maxLength={20} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} autoFocus />
              </div>
            </FormField>
            <p className="auth-password-hint">{tr(`الرقم الحالي: ${phone}. بياناتك المسجّلة محفوظة وسيصلك رمز جديد على الرقم الجديد.`, `Current number: ${phone}. Your details are kept and a new code is sent to the new number.`)}</p>
            <button type="submit" className="button button--primary auth-submit">{tr('حفظ وإرسال الرمز', 'Save & send code')}</button>
          </fieldset>
        </form>
      ) : null}

      <Link className="auth-back" href="/login">{tr('العودة لتسجيل الدخول', 'Back to sign in')}</Link>
      <DemoNotice />
    </AuthShell>
  );
}

export default function VerifyOtpForm() {
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  );
}
