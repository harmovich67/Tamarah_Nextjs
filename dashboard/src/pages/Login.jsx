import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon, PasswordField, TextField, Alert, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAuthStore } from '@/store/authStore';
import { useLocaleStore } from '@/store/localeStore';
import { authService } from '@/services';
import { config } from '@/lib/config';

/**
 * Modern Administration Portal Login for Tamrna
 */
export default function Login() {
  const { locale, isRtl, tr } = useT();
  const setLocale = useLocaleStore((s) => s.setLocale);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema(locale)), defaultValues: { identity: '', password: '' } });

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const session = await authService.login(values);
      setSession(session);
      navigate(location.state?.from || '/', { replace: true });
    } catch (error) {
      setServerError(toFriendlyMessage(error, locale));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07160f] text-white font-sans selection:bg-emerald-500/20 selection:text-emerald-300" dir={isRtl ? 'rtl' : 'ltr'}>
      <img
        src="/assets/images/home/hero.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover -z-20 opacity-40"
        style={{ objectPosition: '22% center', filter: 'saturate(.85) contrast(1.1)' }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(16,117,72,0.25) 0%, transparent 60%), linear-gradient(180deg, rgba(7,22,15,0.78) 0%, rgba(5,15,10,0.94) 100%)',
        }}
      />

      <header className="flex items-center justify-between px-5 sm:px-10 py-5">
        <a href={config.storefrontUrl} className="flex items-center" aria-label="Tamrna">
          <img src="/assets/brand/tamrna-logo-light.svg" alt="" width="64" height="90" className="h-16 w-auto" />
        </a>
        <div className="flex items-center gap-3">
          <a
            href={config.storefrontUrl}
            className="px-3.5 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-xs font-semibold transition-all inline-flex items-center gap-2 backdrop-blur-xs"
          >
            <span>{tr('العودة للمتجر', 'Back to store')}</span>
            <Icon name="arrow-left" className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
          </a>
          <button
            type="button"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition"
          >
            {locale === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      <main className="grid lg:grid-cols-[minmax(0,490px)_1fr] gap-12 items-center max-w-[1400px] mx-auto px-5 sm:px-10 pb-12 min-h-[calc(100vh-120px)]">
        <section
          className="w-full max-w-[480px] justify-self-center lg:justify-self-start bg-white/95 backdrop-blur-md text-slate-900 border border-white/30 rounded-2xl px-6 sm:px-9 py-9 shadow-2xl"
          aria-labelledby="admin-login-title"
        >
          <header className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/70 mb-3 shadow-2xs">
              <Icon name="crown" className="w-6 h-6" />
            </div>
            <h1 id="admin-login-title" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {tr('تسجيل دخول الإدارة', 'Administration Portal')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              {tr('أدخل بيانات حساب الإدارة للوصول إلى لوحة تحكم المتجر', 'Enter your credentials to access the store management dashboard')}
            </p>
          </header>

          {serverError ? <Alert type="error" className="mb-4">{serverError}</Alert> : null}

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
            <fieldset disabled={isSubmitting} className="space-y-4">
              <TextField
                label={tr('رقم الجوال أو البريد الإلكتروني', 'Mobile number or email')}
                required
                placeholder={tr('مثال: name@example.com أو 0555123456', 'e.g. name@example.com or 0555123456')}
                autoComplete="username"
                maxLength={254}
                error={errors.identity?.message}
                prefix={<Icon name="user" className="w-4 h-4" />}
                {...register('identity')}
              />
              <PasswordField
                label={tr('كلمة المرور', 'Password')}
                placeholder={tr('أدخل كلمة المرور', 'Enter your password')}
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <button
                type="button"
                onClick={() => {
                  if (config.apiMode === 'laravel') {
                    setValue('identity', 'admin@info.com');
                    setValue('password', '123456789');
                  } else {
                    setValue('identity', 'admin@tumurna.com');
                    setValue('password', 'Admin@12345');
                  }
                }}
                className="w-full h-10 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 font-semibold text-xs transition active:scale-[0.98] shadow-2xs"
              >
                {config.apiMode === 'laravel'
                  ? tr('تعبئة بيانات الإدارة الحية (admin@info.com)', 'Fill live admin details (admin@info.com)')
                  : tr('تعبئة بيانات تجريبية (Admin Demo)', 'Fill demo details (Admin Demo)')}
              </button>

              <button
                type="submit"
                className={cx(
                  'w-full h-12 rounded-xl bg-gradient-to-b from-[#137547] to-[#0e5c37] hover:from-[#0e5c37] hover:to-[#0a472a] text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98]',
                  isSubmitting && 'opacity-70',
                )}
              >
                {isSubmitting ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : null}
                <span>{tr('تسجيل الدخول', 'Sign in')}</span>
                <Icon name="arrow-left" className="w-4 h-4 ltr:rotate-180" />
              </button>
            </fieldset>
          </form>

          {config.apiMode !== 'laravel' && (
            <p className="text-[11px] leading-relaxed text-slate-400 text-center mt-6 pt-4 border-t border-slate-100">
              {tr(
                'وضع تجربة محلي: استخدم بيانات اختبار فقط. لا تُرسل رسائل SMS، وتُحفظ الحسابات في هذا المتصفح فقط.',
                'Local preview: use test data only. No SMS is sent. Accounts are stored in this browser only.',
              )}
            </p>
          )}
        </section>

        <aside className="hidden lg:block text-slate-100 text-center px-8" style={{ textShadow: '0 2px 20px rgba(0,0,0,.6)' }}>
          <h2 className="text-4xl xl:text-5xl leading-tight font-black tracking-tight">
            {tr('أكثر من تمر ..', 'More than dates ..')}
            <br />
            <span className="text-amber-300 font-extrabold">{tr('هي قصة أرض وهُويّة', 'a story of land and identity')}</span>
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mt-4 max-w-lg mx-auto text-slate-200/90 font-medium">
            {tr(
              'لوحة إدارة متجر تمرنا: إدارة المنتجات، تتبع الطلبات، المستودعات المبردة، والتسويق في مكان واحد متكامل.',
              'The Tamrna store control center: orders, catalog, cold storage and marketing all in one unified place.',
            )}
          </p>
        </aside>
      </main>
    </div>
  );
}
