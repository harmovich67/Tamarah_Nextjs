'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage, safeStorage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { authService } from '@/services';
import AuthShell, { DemoNotice } from './AuthShell';
import { PENDING_PHONE_KEY } from './RegisterForm';

export default function ForgotPasswordForm() {
  const { locale, tr } = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema(locale)), defaultValues: { phone: '' } });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const res = await authService.forgotPassword(values);
      safeStorage.set(PENDING_PHONE_KEY, res.phone);
      router.push('/verify-otp?notice=reset');
    } catch (error) {
      setServerError(toFriendlyMessage(error, locale));
    }
  };

  return (
    <AuthShell title={tr('نسيت كلمة المرور؟', 'Forgot password?')} subtitle={tr('أدخل جوالك المسجّل. إذا كان الحساب موجودًا، سيصلك رمز التحقق.', 'Enter your registered mobile. If the account exists, a verification code will be sent.')}>
      {serverError ? <Flash type="error" className="auth-flash">{serverError}</Flash> : null}
      <form noValidate className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting}>
          <FormField id="auth-phone" label={tr('رقم الجوال', 'Mobile number')} required error={errors.phone?.message}>
            <div className="auth-input-wrap">
              <Icon name="phone" size={19} />
              <input id="auth-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" className="input" placeholder="05xxxxxxxx" maxLength={20} aria-invalid={errors.phone ? 'true' : undefined} {...register('phone')} />
            </div>
          </FormField>
          <button type="submit" className="button button--primary auth-submit">
            {tr('إرسال رمز التحقق', 'Send verification code')}
            <Icon name="arrow-left" size={20} className="directional-arrow" />
          </button>
        </fieldset>
      </form>
      <Link className="auth-back" href="/login">{tr('العودة لتسجيل الدخول', 'Back to sign in')}</Link>
      <DemoNotice />
    </AuthShell>
  );
}
