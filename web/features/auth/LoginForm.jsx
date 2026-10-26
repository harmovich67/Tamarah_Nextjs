'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/lib/config';
import { safeRedirect } from '@/lib/redirect';
import AuthShell, { DemoNotice, PasswordInput, SocialButtons } from './AuthShell';
import PhoneCodeSelect, { DEFAULT_PHONE_CODE } from './PhoneCodeSelect';

function Form() {
  const { locale, tr } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const { user, hydrated } = useAuth();
  const [serverError, setServerError] = useState('');
  const [notice, setNotice] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema(locale)), defaultValues: { identity: '', password: '', phone_code: DEFAULT_PHONE_CODE } });

  // Already signed in -> same redirects as AuthController::showLogin()
  useEffect(() => {
    if (!hydrated || !user) return;
    if (['super_admin', 'store_manager'].includes(user.role_name)) window.location.replace(`${config.dashboardUrl}/`);
    else router.replace(safeRedirect(params.get('redirect'), '/profile'));
  }, [hydrated, user, router, params]);

  const registered = params.get('registered');
  const requiredLogin = params.get('required_login');

  const onSubmit = async (values) => {
    setServerError('');
    try {
      // `phone_code` is not part of the validation schema (it would be stripped): read it from the form directly.
      const session = await authService.login({ ...values, phone_code: getValues('phone_code') || DEFAULT_PHONE_CODE });
      setSession(session);
      qc.invalidateQueries();
      if (['super_admin', 'store_manager'].includes(session.user.role_name)) {
        window.location.assign(`${config.dashboardUrl}/`);
        return;
      }
      router.replace(safeRedirect(params.get('redirect'), '/profile'));
    } catch (error) {
      setServerError(toFriendlyMessage(error, locale));
    }
  };

  return (
    <AuthShell title={tr('تسجيل الدخول', 'Sign in')} subtitle={tr('مرحبًا بعودتك، سجّل الدخول لمتابعة رحلتك.', 'Welcome back. Sign in to continue your journey.')}>
      {requiredLogin ? <Flash type="info" icon="lock" className="auth-flash">{tr('يرجى تسجيل الدخول أو إنشاء حساب جديد لإتمام طلب التمور الفاخرة (سلتك ومشترياتك محفوظة بالكامل).', 'Please sign in or create an account to complete your order (your cart is saved).')}</Flash> : null}
      {serverError ? <Flash type="error" className="auth-flash">{serverError}</Flash> : null}
      {registered ? <Flash type="success" className="auth-flash">{tr('تم إنشاء حسابك بنجاح! يمكنك تسجيل الدخول الآن.', 'Your account was created! You can sign in now.')}</Flash> : null}
      {notice ? <div id="authNotice" className="auth-feedback" style={{ marginBottom: 12 }}>{notice}</div> : null}

      <form noValidate className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting}>
          <FormField id="auth-identity" label={tr('رقم الجوال أو البريد الإلكتروني', 'Mobile number or email')} required error={errors.identity?.message}>
            {/* The backend asks for the country code with every sign-in (also with an e-mail), so it is always next to the field. */}
            <div className="auth-phone-row" dir="ltr">
              <PhoneCodeSelect registration={register('phone_code')} />
              <div className="auth-input-wrap">
                <Icon name="user-round" size={19} />
                <input id="auth-identity" className="input" placeholder={tr('رقم الجوال أو البريد الإلكتروني', 'Mobile number or email')} autoComplete="username" maxLength={254} aria-invalid={errors.identity ? 'true' : undefined} {...register('identity')} />
              </div>
            </div>
          </FormField>

          <FormField id="auth-password" label={tr('كلمة المرور', 'Password')} required error={errors.password?.message}>
            <PasswordInput id="auth-password" placeholder={tr('كلمة المرور', 'Password')} autoComplete="current-password" invalid={!!errors.password} registration={register('password')} />
          </FormField>

          <Link className="auth-forgot-link" href="/forgot-password">{tr('نسيت كلمة المرور؟', 'Forgot password?')}</Link>

          {config.apiMode !== 'laravel' ? (
            <button type="button" className="button button--outline auth-demo-fill" onClick={() => { setValue('identity', 'demo@tamrna.test'); setValue('password', 'Tmrna2026'); }}>
              {tr('تعبئة بيانات تجريبية', 'Fill demo details')}
            </button>
          ) : null}

          <button type="submit" className="button button--primary auth-submit">
            {tr('تسجيل الدخول', 'Sign in')}
            <Icon name="arrow-left" size={20} className="directional-arrow" />
          </button>
        </fieldset>
      </form>

      <SocialButtons onUnavailable={setNotice} />

      <p className="auth-switch">
        {tr('ليس لديك حساب؟', 'New to Tamrna?')} <Link href="/register">{tr('إنشاء حساب جديد', 'Create account')}</Link>
      </p>
      <Link className="auth-back" href="/">{tr('العودة للمتجر', 'Return to the store')}</Link>
      <DemoNotice />
    </AuthShell>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  );
}
