import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';

const COPY = (isRtl) => ({
  403: [isRtl ? 'لا تملك صلاحية الوصول' : 'Access denied', isRtl ? 'ليست لديك صلاحية لفتح هذه الصفحة.' : 'You do not have permission to open this page.'],
  404: [isRtl ? 'الصفحة غير موجودة' : 'Page not found', isRtl ? 'ربما تغيّر الرابط أو لم تعد الصفحة متاحة.' : 'The link may have changed or the page is no longer available.'],
  500: [isRtl ? 'حدث خطأ غير متوقع' : 'Something went wrong', isRtl ? 'نعمل على إصلاح المشكلة، يرجى المحاولة لاحقًا.' : 'We are looking into it. Please try again shortly.'],
});

/** Friendly error screen (resources/views/storefront/error.php). Usable from server and client components. */
export default function ErrorCard({ code = 500, locale = 'ar', onRetry }) {
  const isRtl = locale === 'ar';
  const [title, text] = COPY(isRtl)[code] || [isRtl ? 'حدث خطأ' : 'Something went wrong', ''];
  return (
    <section className="commerce-page error-page">
      <div className="container">
        <div className="account-gate error-card" role="alert">
          <span className="error-card-icon"><Icon name="shield-alert" size={48} stroke={1.4} /></span>
          <p className="error-card-code" dir="ltr">{code}</p>
          <h1>{title}</h1>
          {text ? <p>{text}</p> : null}
          <div className="error-card-actions">
            {onRetry ? (
              <button type="button" className="button button--primary" onClick={onRetry}>{isRtl ? 'إعادة المحاولة' : 'Try again'}</button>
            ) : (
              <Link href="/" className="button button--primary">{isRtl ? 'العودة للرئيسية' : 'Back to home'}</Link>
            )}
            <Link href="/catalog" className="button button--outline">{isRtl ? 'تصفح المنتجات' : 'Browse products'}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
