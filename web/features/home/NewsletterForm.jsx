'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newsletterSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField } from '@/components/ui/FormField';
import { contentService } from '@/services';
import { showToast } from '@/store/toastStore';

/** Home newsletter box. The PHP form only toasted a coupon code; here the e-mail goes through contentService. */
export default function NewsletterForm({ title, subtitle, buttonText, couponCode = 'TAMRNA10' }) {
  const { locale, isRtl, tr } = useLocale();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(newsletterSchema(locale)), defaultValues: { email: '' } });

  const onSubmit = async (values) => {
    try {
      await contentService.subscribeNewsletter(values);
      showToast(
        isRtl
          ? `تم اشتراكك بنجاح في نادي تمرنا الملكي! استخدم كود الخصم: ${couponCode}`
          : `You have successfully joined the Tumurna VIP Club! Use promo code: ${couponCode}`,
        'success',
      );
      reset();
    } catch (error) {
      showToast(toFriendlyMessage(error, locale), 'error');
    }
  };

  return (
    <section className="home-newsletter">
      <Icon name="tree-palm" size={220} className="palm-decoration newsletter-palm newsletter-palm-start" stroke={1.1} />
      <form className="newsletter home-newsletter-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <h3>{title || tr('كن دائمًا على اطلاع', 'Always stay in the loop')}</h3>
        <p className="newsletter-description">
          {subtitle || tr('اشترك في نشرتنا البريدية ليصلك كل جديد من منتجاتنا وعروضنا', 'Subscribe to our newsletter for everything new in our products and offers')}
        </p>
        <div className="newsletter-fields">
          <FormField id="home-news-email" label={tr('البريد الإلكتروني', 'Email')} required error={errors.email?.message}>
            <input
              id="home-news-email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder={tr('أدخل بريدك الإلكتروني', 'Enter your email')}
              aria-invalid={errors.email ? 'true' : undefined}
              {...register('email')}
            />
          </FormField>
          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {buttonText || tr('اشتراك', 'Subscribe')}
          </button>
        </div>
      </form>
      <Icon name="tree-palm" size={220} className="palm-decoration newsletter-palm newsletter-palm-end" stroke={1.1} />
    </section>
  );
}
