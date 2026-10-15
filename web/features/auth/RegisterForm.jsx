'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage, safeStorage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { authService } from '@/services';
import AuthShell, { DemoNotice, PasswordInput, SocialButtons } from './AuthShell';

export const PENDING_PHONE_KEY = 'tamrna.web.pending_phone';

export default function RegisterForm() {
  const { locale, tr } = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [notice, setNotice] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema(locale)),
    defaultValues: { first: '', last: '', phone: '', email: '', password: '', confirm: '', terms: true },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const res = await authService.register(values);
      safeStorage.set(PENDING_PHONE_KEY, res.phone);
      router.push(`/verify-otp${res.notice ? `?notice=${res.notice}` : ''}`);
    } catch (error) {
      if (error?.errors) Object.entries(error.errors).forEach(([field, msgs]) => setError(field, { message: [].concat(msgs)[0] }));
      setServerError(toFriendlyMessage(error, locale));
    }
  };

  const fillDemo = () => {
    const rnd = String(Math.floor(10000000 + Math.random() * 90000000));
    setValue('first', tr('سارة', 'Sarah'));
    setValue('last', tr('التميمي', 'Al-Tamimi'));
    setValue('phone', `05${rnd.slice(0, 8)}`);
    setValue('email', `demo+${rnd.slice(0, 4)}@tamrna.test`);
    setValue('password', 'Tmrna2026');
    setValue('confirm', 'Tmrna2026');
    setValue('terms', true);
  };

  const icon = (name) => <Icon name={name} size={19} />;

  return (
    <AuthShell title={tr('إنشاء حساب جديد', 'Create an account')} subtitle={tr('ابدأ رحلتك معنا واستمتع بتجربة تسوق فريدة', 'Begin your journey with a unique shopping experience.')}>
      {serverError ? <Flash type="error" className="auth-flash">{serverError}</Flash> : null}
      {notice ? <div id="authNotice" className="auth-feedback" style={{ marginBottom: 12 }}>{notice}</div> : null}

      <form noValidate className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting}>
          <div className="auth-name-row">
            <FormField id="auth-first" label={tr('الاسم الأول', 'First name')} required error={errors.first?.message}>
              <div className="auth-input-wrap">{icon('user-round')}<input id="auth-first" className="input" placeholder={tr('الاسم الأول', 'First name')} autoComplete="given-name" maxLength={50} aria-invalid={errors.first ? 'true' : undefined} {...register('first')} /></div>
            </FormField>
            <FormField id="auth-last" label={tr('اسم العائلة', 'Family name')} required error={errors.last?.message}>
              <div className="auth-input-wrap">{icon('user-round')}<input id="auth-last" className="input" placeholder={tr('اسم العائلة', 'Family name')} autoComplete="family-name" maxLength={49} aria-invalid={errors.last ? 'true' : undefined} {...register('last')} /></div>
            </FormField>
          </div>

          <FormField id="auth-phone" label={tr('رقم الجوال', 'Mobile number')} required error={errors.phone?.message}>
            <div className="auth-input-wrap">{icon('phone')}<input id="auth-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" className="input" placeholder="05xxxxxxxx" maxLength={20} aria-invalid={errors.phone ? 'true' : undefined} {...register('phone')} /></div>
          </FormField>

          <FormField id="auth-email" label={tr('البريد الإلكتروني (اختياري)', 'Email address (optional)')} error={errors.email?.message}>
            <div className="auth-input-wrap">{icon('mail')}<input id="auth-email" type="email" className="input" placeholder={tr('البريد الإلكتروني (اختياري)', 'Email address (optional)')} autoComplete="email" maxLength={254} aria-invalid={errors.email ? 'true' : undefined} {...register('email')} /></div>
          </FormField>

          <FormField id="auth-password" label={tr('كلمة المرور', 'Password')} required error={errors.password?.message}>
            <PasswordInput id="auth-password" placeholder={tr('كلمة المرور', 'Password')} autoComplete="new-password" invalid={!!errors.password} registration={register('password')} />
          </FormField>
          <p className="auth-password-hint">{tr('استخدم ٨ أحرف على الأقل، تشمل حرفًا ورقمًا (حتى ١٢٨ حرفًا).', 'Use 8–128 characters, including a letter and a number.')}</p>

          <FormField id="auth-confirm" label={tr('تأكيد كلمة المرور', 'Confirm password')} required error={errors.confirm?.message}>
            <PasswordInput id="auth-confirm" placeholder={tr('تأكيد كلمة المرور', 'Confirm password')} autoComplete="new-password" invalid={!!errors.confirm} registration={register('confirm')} />
          </FormField>

          <label className="choice">
            <input type="checkbox" id="auth-terms" {...register('terms')} />
            <span>{tr('أوافق على الشروط والأحكام وسياسة الاستخدام', 'I agree to the terms and conditions and usage policy')}</span>
          </label>
          {errors.terms ? <span className="field-error" role="alert">{errors.terms.message}</span> : null}

          <details className="auth-policy">
            <summary>{tr('الوثائق القانونية', 'Legal documents')}</summary>
            <p>{tr('يمكنك مراجعة الشروط والأحكام وسياسة الاستخدام من الروابط الموجودة أسفل الموقع.', 'Review the terms and conditions and usage policy from the links in the site footer.')}</p>
          </details>

          <button type="button" className="button button--outline auth-demo-fill" onClick={fillDemo}>{tr('تعبئة بيانات تجريبية', 'Fill demo details')}</button>

          <button type="submit" className="button button--primary auth-submit">
            {tr('إنشاء الحساب', 'Create account')}
            <Icon name="arrow-left" size={20} className="directional-arrow" />
          </button>
        </fieldset>
      </form>

      <SocialButtons onUnavailable={setNotice} />

      <p className="auth-switch">
        {tr('لديك حساب بالفعل؟', 'Already have an account?')} <Link href="/login">{tr('تسجيل الدخول', 'Sign in')}</Link>
      </p>
      <Link className="auth-back" href="/">{tr('العودة للمتجر', 'Return to the store')}</Link>
      <DemoNotice />
    </AuthShell>
  );
}
