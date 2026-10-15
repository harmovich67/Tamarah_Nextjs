'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toFriendlyMessage, safeStorage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { OTP } from '@tamrna/shared/constants';
import { normalizeDigits } from '@tamrna/shared/utils';
import { verifyOtpSchema } from '@tamrna/shared/schemas';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { config } from '@/lib/config';
import { showToast } from '@/store/toastStore';
import AuthShell, { DemoNotice } from './AuthShell';
import { PENDING_PHONE_KEY } from './RegisterForm';

function Form() {
  const { locale, tr } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [phone, setPhone] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(OTP.RESEND_SECONDS);
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
    const parsed = verifyOtpSchema(locale).safeParse({ phone, otp: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || '');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const session = await authService.verifyOtp({ phone, otp: parsed.data.otp });
      setSession(session);
      safeStorage.remove(PENDING_PHONE_KEY);
      qc.invalidateQueries();
      if (['super_admin', 'store_manager'].includes(session.user.role_name)) window.location.assign(`${config.dashboardUrl}/`);
      else router.replace('/profile?welcome=1');
    } catch (err) {
      setError(toFriendlyMessage(err, locale));
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
      showToast(tr('تمت إعادة إرسال رمز التحقق بنجاح!', 'Verification code sent again!'), 'success');
    } catch (err) {
      setError(toFriendlyMessage(err, locale));
    }
  };

  const notice = noticeKey === 'registered'
    ? tr('هذا الجوال مسجل مسبقاً، تم إرسال رمز OTP لتسجيل دخولك السريع.', 'This mobile is already registered. A code was sent for quick sign-in.')
    : noticeKey === 'reset'
      ? tr('تم إرسال رمز التحقق إلى جوالك لاستعادة الوصول إلى حسابك.', 'A verification code was sent to your mobile to recover your account.')
      : '';

  return (
    <AuthShell title={tr('تأكيد رقم الجوال', 'Verify your mobile')} subtitle={tr('أدخل الرمز المكوّن من ٦ أرقام. صلاحيته ٥ دقائق.', 'Enter the 6-digit code. It expires in 5 minutes.')}>
      {notice ? <Flash type="info" className="auth-flash">{notice}</Flash> : null}
      {error ? <Flash type="error" className="auth-flash">{error}</Flash> : null}

      <form noValidate className="auth-form" id="otpForm" onSubmit={(e) => { e.preventDefault(); submit(code); }}>
        <fieldset disabled={busy}>
          <FormField id="auth-code" label={tr('رمز التحقق', 'Verification code')} required>
            <input id="auth-code" className="input otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={OTP.LENGTH} dir="ltr" placeholder="······" value={code} onChange={onChange} autoFocus />
          </FormField>

          <p className="auth-demo-code">
            {tr('رمز التجربة', 'Preview code')}: <bdi>{OTP.DEMO_CODE}</bdi>
          </p>

          <button type="submit" className="button button--primary auth-submit">
            {tr('تأكيد الرمز', 'Verify code')}
            <Icon name="arrow-left" size={20} className="directional-arrow" />
          </button>
        </fieldset>
      </form>

      <div className="auth-verification-actions">
        <button type="button" id="auth-resend" className="button button--ghost" disabled={left > 0} onClick={resend}>
          {tr('إعادة إرسال الرمز', 'Resend code')}
          <span id="auth-countdown" suppressHydrationWarning>{left > 0 ? ` (${left})` : ''}</span>
        </button>
        <Link href="/register">{tr('تعديل رقم الجوال', 'Change mobile number')}</Link>
      </div>

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
