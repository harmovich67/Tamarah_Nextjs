'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { Flash } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { accountService } from '@/services';
import { showToast } from '@/store/toastStore';
import { asset, FALLBACK_IMAGE } from '@/lib/asset';
import { config } from '@/lib/config';
import AccountShell from './AccountShell';

const STEP1 = ['pending', 'قيد المراجعة', ''];
const STEP2 = ['processing', 'ready_for_pickup', 'confirmed', 'قيد التجهيز', 'تم التأكيد'];
const STEP3 = ['shipped', 'out_for_delivery', 'in_transit', 'تم الشحن', 'خرج للتوصيل'];
const STEP4 = ['delivered', 'completed', 'تم التسليم'];

/** POST /client/reviews { order_id, rate, comment }: offered once an order is completed (real backend only). */
function ReviewForm({ order }) {
  const { locale, tr } = useLocale();
  const [rate, setRate] = useState(5);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const send = useMutation({
    mutationFn: () => accountService.submitReview({ orderId: order.id, rate, comment: comment.trim() }),
    onSuccess: () => {
      setSent(true);
      showToast(tr('شكراً لتقييمك!', 'Thank you for your review!'), 'success');
    },
    onError: (e) => showToast(toFriendlyMessage(e, locale), 'error'),
  });
  if (sent) return <Flash type="success">{tr('تم إرسال تقييمك. شكراً لك!', 'Your review was sent. Thank you!')}</Flash>;
  return (
    <section className="account-card">
      <header><span><Icon name="star" size={21} /></span><h2>{tr('قيّم طلبك', 'Rate your order')}</h2></header>
      <form className="account-form" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
        <label className="field">
          <span>{tr('التقييم', 'Rating')}</span>
          <select className="input select" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{tr('تعليقك', 'Your comment')}</span>
          <textarea className="input" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <button type="submit" className="button button--primary" disabled={send.isPending}>{tr('إرسال التقييم', 'Send review')}</button>
      </form>
    </section>
  );
}

function Body({ data: d, cancel: c }) {
  const { tr, currency } = useLocale();
  const { order, items, settings } = d;
  const shippingStatus = String(order.shipping_status || 'pending').toLowerCase();
  let step = 1;
  if (STEP2.includes(shippingStatus)) step = 2;
  else if (STEP3.includes(shippingStatus)) step = 3;
  else if (STEP4.includes(shippingStatus)) step = 4;
  const showStepper = String(settings.enable_order_tracking_stepper ?? '1') === '1';
  const allowCancel = settings.allow_customer_order_cancellation && STEP1.includes(shippingStatus) && order.payment_status !== 'paid';
  const money = (n) => `${numberFormat(n, 2)} ${currency}`;
  const isDeliveryType =
    order.shipping_type === 'delivery' ||
    order.shipping_type === 'home_delivery' ||
    order.delivery_type === 'delivery';

  const isBranch = Boolean(
    !isDeliveryType && (
      order.is_branch === true ||
      order.shipping_type === 'branch_pickup' ||
      order.shipping_type === 'branch' ||
      order.delivery_type === 'branch' ||
      order.shipping_type === 'pickup' ||
      order.delivery_type === 'pickup' ||
      order.is_pickup ||
      (order.branch_id && String(order.branch_id) !== '0') ||
      order.shipping_status === 'ready' ||
      String(order.shipping_address || '').includes('استلام من الفرع') ||
      String(order.notes || '').includes('استلام من الفرع')
    )
  );

  const deliverySteps = [
    ['check', tr('تم استلام الطلب', 'Order Confirmed'), tr('تم تسجيل وتأكيد الطلب', 'Order recorded in system')],
    ['package', tr('التجهيز والتغليف المبرد', 'Cold Packaging'), tr('فرز وتغليف التمور الفاخرة', 'Fresh sorting and sealing')],
    ['truck', tr('خرج للشحن المبرد', 'Out for Delivery'), tr('مع مندوب الشحن المبرد', 'In refrigerated transit')],
    ['tree-palm', tr('تم التسليم', 'Delivered'), tr('بالصحة والعافية', 'Enjoy your royal dates')],
  ];

  const branchSteps = [
    ['check', tr('تم استلام الطلب', 'Order Confirmed'), tr('تم تسجيل وتأكيد الطلب', 'Order recorded in system')],
    ['package', tr('التجهيز بالفرع', 'Boutique Packaging'), tr('فرز وتجهيز التمور الفاخرة', 'Fresh sorting and packaging')],
    ['store', tr('جاهز للاستلام بالفرع', 'Ready for Pickup'), tr('الطلب بانتظار استلامكم من الفرع', 'Awaiting your pickup at boutique')],
    ['tree-palm', tr('تم الاستلام', 'Picked Up'), tr('بالصحة والعافية', 'Enjoy your royal dates')],
  ];

  const steps = isBranch ? branchSteps : deliverySteps;
  const paidOnline = ['mada', 'apple_pay', 'tamara', 'tabby', 'card', 'paymob', 'credit_card'].includes(order.payment_method);
  const methodLabel = paidOnline
    ? order.payment_method === 'apple_pay' ? 'أبل باي Apple Pay' : order.payment_method === 'tamara' ? 'تمارا Tamara' : order.payment_method === 'tabby' ? 'تابي Tabby' : 'مدى / بطاقة بنكية'
    : order.payment_method === 'bank_transfer' ? tr('تحويل بنكي', 'Bank Transfer') : tr('الدفع عند الاستلام', 'Cash On Delivery');

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {allowCancel && (
          <button type="button" className="button button--danger" disabled={c.isPending} onClick={() => window.confirm(tr('هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟', 'Are you sure you want to cancel this order?')) && c.mutate()}>
            <Icon name="x-circle" size={18} />{tr('إلغاء الطلب', 'Cancel Order')}
          </button>
        )}
        <button type="button" className="button button--outline" onClick={() => window.print()}>
          <Icon name="file-text" size={18} />{tr('طباعة الفاتورة', 'Print Invoice')}
        </button>
      </div>

      {showStepper && shippingStatus !== 'cancelled' ? (
        <section className="account-card">
          <header><span><Icon name={isBranch ? 'store' : 'snowflake'} size={21} /></span><h2>{isBranch ? tr('مراحل تجهيز واستلام الطلب من الفرع', 'Boutique Pickup Tracking Timeline') : tr('مراحل تجهيز وشحن الطلب المبرد', 'Cold Freight Tracking Timeline')}</h2></header>
          <ol className="order-steps">
            {steps.map(([icon, title, desc], i) => (
              <li key={title} className={`${step >= i + 1 ? 'is-done' : ''} ${step === i + 1 ? 'is-current' : ''}`.trim()}>
                <span><Icon name={icon} size={22} /></span>
                <strong>{title}</strong>
                <small>{desc}</small>
              </li>
            ))}
          </ol>
        </section>
      ) : shippingStatus === 'cancelled' ? (
        <Flash type="error" icon="alert-octagon"><strong>{tr('تم إلغاء هذا الطلب بناء على طلب العميل أو الإدارة.', 'This order has been cancelled.')}</strong></Flash>
      ) : null}

      {config.apiMode === 'laravel' && (shippingStatus === 'delivered' || shippingStatus === 'completed') ? <ReviewForm order={order} /> : null}

      <div className="account-order-detail-grid">
        <section className="account-card">
          <header><span><Icon name="package" size={21} /></span><h2>{tr('أصناف التمور المطلوبة', 'Order Items')} ({items.length})</h2></header>
          <ul className="account-lines">
            {items.map((item) => (
              <li key={item.id}>
                {item.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset(item.product_image || FALLBACK_IMAGE)} alt={item.product_name} />
                ) : (
                  <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 72, borderRadius: 8, background: '#eee5d8', color: '#174a37' }}><Icon name="package" size={26} /></span>
                )}
                <div>
                  <strong>{item.product_name}</strong>
                  <small>{item.size_name ? `${item.size_name} · ` : ''}{tr('الكمية', 'Quantity')}: {item.quantity}</small>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <strong>{money(item.subtotal)}</strong>
                  <small>{numberFormat(item.unit_price, 2)} × {item.quantity}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <section className="account-card">
            <header><span><Icon name={isBranch ? 'store' : 'map-pin'} size={21} /></span><h2>{isBranch ? tr('فرع الاستلام المعتمد', 'Pickup Boutique') : tr('عنوان التوصيل الوطني', 'Delivery Address')}</h2></header>
            <div className="account-address-grid" style={{ gridTemplateColumns: '1fr' }}>
              <article style={{ minHeight: 0 }}>
                <h3>{order.customer_name}</h3>
                <p dir="ltr" style={{ textAlign: 'start' }}>{order.customer_phone}</p>
                {isBranch ? (
                  <>
                    <p style={{ fontWeight: 700, color: '#174a37', marginTop: 4 }}>
                      🏪 {order.branch_name || tr('فرع تمرنا المعتمد', 'Authorized Tamrna Boutique')} {order.city ? `(${order.city})` : ''}
                    </p>
                    <small style={{ color: '#4b5563', display: 'block', marginTop: 2 }}>
                      {order.branch_address || tr('استلام مباشر من الفرع خلال ساعات العمل الرسمية', 'Direct pickup during business hours')}
                    </small>
                  </>
                ) : (
                  <>
                    <p>{order.shipping_address}</p>
                    <small>{order.city || 'المملكة العربية السعودية'}</small>
                  </>
                )}
              </article>
            </div>
            {order.notes ? <div className="account-review-note" style={{ margin: '12px 0 0' }}><b>{tr('ملاحظات الطلب', 'Order Notes')}:</b> {order.notes}</div> : null}
          </section>

          <section className="account-card">
            <header><span><Icon name="file-text" size={21} /></span><h2>{tr('ملخص الدفع والحساب', 'Payment Summary')}</h2></header>
            <div className="summary-row"><span>{tr('مجموع المنتجات', 'Subtotal')}</span><strong>{money(order.subtotal)}</strong></div>
            <div className="summary-row"><span>{isBranch ? tr('طريقة الاستلام (الفرع)', 'Fulfillment (Boutique pickup)') : tr('رسوم الشحن المبرد', 'Cold Express Delivery')}</span><strong>{isBranch || Number(order.shipping_fee) === 0 ? tr('مجاناً', 'Free') : money(order.shipping_fee)}</strong></div>
            {Number(order.discount) > 0 && <div className="summary-row summary-row--discount"><span>{tr('خصم خاص', 'Special Discount')}</span><strong>-{money(order.discount)}</strong></div>}
            <div className="summary-row summary-row--total"><span>{tr('المبلغ الإجمالي الكلي', 'Grand Total')}</span><strong>{money(order.total)}</strong></div>
            <div className="checkout-delivery-summary">
              <small>{tr('طريقة الدفع', 'Payment Method')}</small>
              <strong>{methodLabel}</strong>
              <small>{tr('حالة السداد', 'Payment Status')}</small>
              <strong style={{ color: order.payment_status === 'paid' ? '#176044' : '#71501c' }}>
                {order.payment_status === 'paid' ? tr('تم السداد بنجاح', 'Paid Online') : tr('بانتظار التحصيل عند الاستلام', 'Awaiting Payment')}
              </strong>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** Order detail with the cold-freight tracking stepper (profile/order_detail.php). */
export default function OrderDetailPage({ orderNumber }) {
  const { locale, tr, currency } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['account', 'order', orderNumber], queryFn: () => accountService.getOrder(orderNumber), retry: false });

  const cancel = useMutation({
    mutationFn: () => accountService.cancelOrder(orderNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] });
      showToast(tr('تم إلغاء الطلب بنجاح.', 'Order was successfully cancelled.'), 'success');
    },
    onError: (e) => showToast(toFriendlyMessage(e, locale), 'error'),
  });

  const heading = `${tr('طلب رقم', 'Order')}: ${orderNumber}`;

  useEffect(() => {
    if (isError && error?.status === 404) router.replace('/profile/orders');
  }, [isError, error, router]);

  return (
    <AccountShell active="orders" heading={heading}>
      {isLoading ? <LoadingState rows={2} /> : isError ? <ErrorState onRetry={refetch} /> : <Body data={data} cancel={cancel} />}
    </AccountShell>
  );
}
