'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat, pickLang } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { checkoutService } from '@/services';
import { asset } from '@/lib/asset';

/** Order confirmation (resources/views/storefront/order_success.php). */
export default function OrderSuccess({ orderNumber }) {
  const { locale, isRtl, tr, currency } = useLocale();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['order', orderNumber], queryFn: () => checkoutService.getOrder(orderNumber) });

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={refetch} message={tr('الطلب غير موجود', 'Order not found')} />;
  const { order, items } = data;
  const money = (n) => `${numberFormat(n, 2)} ${currency}`;

  return (
    <section className="commerce-page checkout-success">
      <div className="container">
        <div className="checkout-success-card">
          <div className="checkout-success-icon"><Icon name="check" size={42} /></div>
          <p className="commerce-kicker" style={{ justifyContent: 'center' }}>
            <Icon name="sparkles" size={14} />
            {tr('تم استلام وتأكيد طلبك بنجاح', 'Order received & confirmed')}
          </p>
          <h1>{tr('شكراً لثقتكم باختيار تمرنا', 'Thank you for choosing Tamrna')}</h1>
          <p>
            {isRtl ? 'تم تسجيل طلبك رقم ' : 'Your order '}
            <strong dir="ltr">{order.order_number}</strong>
            {isRtl ? ' وسيتم تجهيز التمور بعناية فائقة ونقلها مبردة إلى عنوانك المعتمد.' : ' has been placed. Our packers are preparing your dates for chilled delivery.'}
          </p>

          <dl>
            <div><dt>{tr('رقم الطلب', 'Order #')}</dt><dd dir="ltr">{order.order_number}</dd></div>
            {order.created_at ? <div><dt>{tr('تاريخ الطلب', 'Order date')}</dt><dd>{String(order.created_at).slice(0, 10)}</dd></div> : null}
            <div><dt>{tr('طريقة الدفع', 'Payment method')}</dt><dd>{String(order.payment_method || '').toUpperCase()}</dd></div>
            <div><dt>{tr('حالة الطلب', 'Order status')}</dt><dd>{tr('جاري التجهيز والشحن المبرد', 'Processing & cold shipping')}</dd></div>
          </dl>

          <div className="checkout-success-actions">
            <button type="button" className="button button--outline" onClick={() => window.print()}>{tr('طباعة الفاتورة', 'Print invoice')}</button>
            <Link href="/catalog" className="button button--primary">{tr('متابعة التسوق', 'Continue shopping')}</Link>
          </div>
        </div>

        <div className="checkout-card order-details-card" style={{ maxWidth: 850, margin: '28px auto 0' }}>
          <h2>{tr('تفاصيل الطلب والشحن', 'Order & shipping details')}</h2>
          <div className="checkout-delivery-summary" style={{ marginTop: 0 }}>
            <small>{tr('بيانات المستلم والعنوان', 'Recipient & shipping address')}</small>
            <strong>{order.customer_name} — <span dir="ltr">{order.customer_phone}</span></strong>
            <span>{order.shipping_address}</span>
          </div>

          <div className="checkout-items" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
            <h3>{tr('الأصناف المطلوبة', 'Ordered items')}</h3>
            <ul className="account-lines">
              {items.map((item) => {
                const name = pickLang(item, 'product_name', locale, item.product_name);
                let size = pickLang(item, 'size_name', locale, item.size_name || '');
                if (!isRtl) size = String(size).replace(/كجم|كيلو/g, 'kg');
                return (
                  <li key={item.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset(item.featured_image || 'assets/images/home/ajwa.webp')} alt="" />
                    <div><strong>{name}</strong><small>{size} × {item.quantity}</small></div>
                    <strong>{money(item.subtotal)}</strong>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={{ maxWidth: '20rem', marginInlineStart: 'auto', width: '100%' }}>
            <div className="summary-row"><span>{tr('المجموع الفرعي', 'Subtotal')}</span><strong>{money(order.subtotal)}</strong></div>
            {order.discount > 0 && <div className="summary-row summary-row--discount"><span>{tr('الخصم', 'Discount')}</span><strong>- {money(order.discount)}</strong></div>}
            <div className="summary-row"><span>{tr('رسوم الشحن والتوصيل', 'Shipping fee')}</span><strong>{Number(order.shipping_fee) === 0 ? tr('مجاناً', 'FREE') : money(order.shipping_fee)}</strong></div>
            <div className="summary-row summary-row--total"><span>{tr('الإجمالي المدفوع', 'Total amount')}</span><strong>{money(order.total)}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
