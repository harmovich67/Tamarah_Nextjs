'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { checkoutService } from '@/services';

/** Sandbox gateway screen (payment_simulator.php): success -> callback route, cancel -> back to checkout. */
function Simulator() {
  const { tr, currency } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const orderNumber = params.get('order_number') || '';
  const provider = params.get('provider') || 'moyasar';
  const method = params.get('method') || 'mada';
  const { data: order, isLoading, isError, refetch } = useQuery({ queryKey: ['payment-session', orderNumber], queryFn: () => checkoutService.getPaymentSession(orderNumber), enabled: !!orderNumber });

  if (!orderNumber || isError) return <ErrorState onRetry={refetch} message={tr('الطلب غير موجود', 'Order not found')} />;
  if (isLoading || !order) return <LoadingState />;

  return (
    <section className="commerce-page">
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="checkout-card">
          <header className="checkout-review-heading">
            <div>
              <span className="commerce-kicker"><Icon name="shield-check" size={16} />Sandbox Payment Simulator</span>
              <h2>{provider.toUpperCase()} Gateway</h2>
            </div>
            <span className="badge badge--preorder">{tr('بيئة تجريبية واختبار', 'Test Mode')}</span>
          </header>

          <div className="flash flash--info">
            <Icon name="info" size={20} />
            <div>
              <strong>{tr('ملاحظة للمطور والمدير:', 'Developer Notice:')}</strong>
              <br />
              {tr(
                `أنت الآن في محاكي الدفع التجريبي لأن مفاتيح بوابة ${provider.toUpperCase()} المدخلة في لوحة التحكم تجريبية أو لم يتم وضع مفاتيح حية بعد. يمكنك تجربة إتمام الدفع أو إلغائه، وبمجرد وضع المفاتيح الحية في لوحة التحكم سيتم التوجيه تلقائياً لموقع البوابة الرسمي الحقيقي.`,
                `You are in the test simulator because the credentials for ${provider.toUpperCase()} are in test mode. Placing real keys in Admin Settings will automatically route to the real live gateway.`,
              )}
            </div>
          </div>

          <div className="checkout-review">
            <dl>
              <div><dt>{tr('رقم الطلب', 'Order Number')}</dt><dd dir="ltr">{order.order_number}</dd></div>
              <div><dt>{tr('العميل', 'Customer')}</dt><dd>{order.customer_name}</dd></div>
              <div><dt>{tr('طريقة الدفع المختارة', 'Payment Method')}</dt><dd>{method}</dd></div>
              <div><dt>{tr('المبلغ المطلوب سداده', 'Total Amount to Pay')}</dt><dd><strong>{numberFormat(order.total, 2)} {currency}</strong></dd></div>
            </dl>
          </div>

          <button type="button" className="button button--primary commerce-primary-action" onClick={() => router.push(`/checkout/payment/callback/${provider}?order_number=${encodeURIComponent(orderNumber)}&status=paid`)}>
            <Icon name="check-circle" size={20} />
            {tr('محاكاة: تأكيد الدفع بنجاح (Success)', 'Simulate: Payment Successful')}
          </button>
          <button type="button" className="button button--danger" style={{ width: '100%' }} onClick={() => router.push(`/checkout/payment/cancel?order_number=${encodeURIComponent(orderNumber)}&provider=${provider}`)}>
            <Icon name="x-circle" size={18} />
            {tr('محاكاة: إلغاء عملية الدفع (Cancel / Decline)', 'Simulate: Cancel Payment')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function PaymentSimulator() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Simulator />
    </Suspense>
  );
}
