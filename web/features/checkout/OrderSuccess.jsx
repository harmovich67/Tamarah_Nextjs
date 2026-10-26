'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat, pickLang } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { checkoutService } from '@/services';
import { asset } from '@/lib/asset';

/**
 * Premium Luxury Order Confirmation & Receipt (Tamrna Storefront).
 */
export default function OrderSuccess({ orderNumber }) {
  const { locale, isRtl, tr, currency } = useLocale();
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => checkoutService.getOrder(orderNumber),
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={refetch} message={tr('الطلب غير موجود', 'Order not found')} />;
  const { order, items } = data;
  const isBranch =
    order.shipping_type === 'branch_pickup' ||
    order.shipping_type === 'branch' ||
    order.delivery_type === 'branch' ||
    Boolean(order.branch_id) ||
    String(order.shipping_address || '').includes('استلام من الفرع');
  const currentStatus = order.shipping_status || 'pending';
  const money = (n) => `${numberFormat(n, 2)} ${currency}`;

  const copyOrderNumber = () => {
    if (!order?.order_number) return;
    navigator.clipboard?.writeText(order.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentLabel = (() => {
    const m = String(order.payment_method || '').toLowerCase();
    if (m === 'cod' || m.includes('cash') || m.includes('delivery')) return tr('الدفع عند الاستلام', 'Cash on delivery');
    if (m === 'wallet' || m.includes('wallet')) return tr('رصيد المحفظة', 'Tamrna Wallet');
    if (m === 'apple_pay' || m.includes('apple')) return 'Apple Pay';
    if (m === 'credit_card' || m.includes('card') || m.includes('mada')) return tr('بطاقة مدى / فيزا', 'Card / Mada');
    return String(order.payment_method || tr('الدفع عند الاستلام', 'Cash on delivery')).toUpperCase();
  })();

  return (
    <section className="commerce-page checkout-success order-success-section">
      <div className="container">
        <div className="order-success-wrapper">
          {/* Main Success Hero Card */}
          <div className="checkout-success-card order-success-hero">
            <div className="order-success-badge-icon">
              <Icon name="check" size={44} stroke={2.5} />
            </div>

            <div className="order-success-kicker">
              <Icon name="sparkles" size={15} />
              <span>{tr('تم تأكيد طلبك بنجاح', 'Order confirmed successfully')}</span>
            </div>

            <h1 className="order-success-title">{tr('شكراً لثقتكم باختيار تمرنا', 'Thank you for choosing Tamrna')}</h1>

            <p className="order-success-desc">
              {isRtl ? 'تم تسجيل وتأكيد طلبكم رقم ' : 'Your order '}
              <button
                type="button"
                onClick={copyOrderNumber}
                title={tr('انقر لنسخ رقم الطلب', 'Click to copy order #')}
                className="order-number-pill"
              >
                <span dir="ltr">{order.order_number}</span>
                <Icon name={copied ? 'check' : 'copy'} size={13} />
                {copied && <span style={{ fontSize: '11px', color: '#b7e0cb' }}>{tr('تم النسخ', 'Copied')}</span>}
              </button>
              {isBranch
                ? (isRtl
                    ? ' وسيتم تجهيز التمور الفاخرة بعناية فائقة لتكون جاهزة لاستلامكم من الفرع المعتمد.'
                    : ' has been placed. Your luxury dates will be prepared with utmost care for boutique pickup.')
                : (isRtl
                    ? ' وسيتم تجهيز التمور الفاخرة بعناية فائقة ونقلها مبردة للحفاظ على جودتها.'
                    : ' has been placed. Our packers are preparing your dates for chilled luxury delivery.')}
            </p>

            {/* Quick 4 Stats Grid */}
            <div className="order-stats-grid">
              <div className="order-stat-box">
                <span className="order-stat-label">
                  <Icon name="hash" size={14} />
                  <span>{tr('رقم الطلب', 'Order #')}</span>
                </span>
                <span className="order-stat-value" dir="ltr">{order.order_number}</span>
              </div>

              {order.created_at ? (
                <div className="order-stat-box">
                  <span className="order-stat-label">
                    <Icon name="calendar" size={14} />
                    <span>{tr('تاريخ الطلب', 'Order date')}</span>
                  </span>
                  <span className="order-stat-value">{String(order.created_at).slice(0, 10)}</span>
                </div>
              ) : null}

              <div className="order-stat-box">
                <span className="order-stat-label">
                  <Icon name="credit-card" size={14} />
                  <span>{tr('طريقة الدفع', 'Payment method')}</span>
                </span>
                <span className="order-stat-value">{paymentLabel}</span>
              </div>

              <div className="order-stat-box">
                <span className="order-stat-label">
                  <Icon name={isBranch ? 'store' : 'truck'} size={14} />
                  <span>{tr('حالة الطلب', 'Order status')}</span>
                </span>
                <span className="order-stat-value" style={{ color: '#174a37' }}>
                  {isBranch
                    ? (currentStatus === 'ready'
                        ? tr('جاهز للاستلام بالفرع', 'Ready for pickup')
                        : currentStatus === 'completed'
                        ? tr('تم الاستلام من الفرع', 'Picked up')
                        : currentStatus === 'cancelled'
                        ? tr('تم إلغاء الطلب', 'Cancelled')
                        : tr('جاري التجهيز بالفرع', 'Preparing at branch'))
                    : (currentStatus === 'delivered'
                        ? tr('تم التوصيل', 'Delivered')
                        : currentStatus === 'completed'
                        ? tr('تم التوصيل بنجاح', 'Delivered successfully')
                        : currentStatus === 'cancelled'
                        ? tr('تم إلغاء الطلب', 'Cancelled')
                        : tr('جاري التجهيز والشحن', 'Processing & cold shipping'))}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Step Order Tracker / Progress */}
          <div className="order-tracker-card" data-no-print>
            <h3 className="order-tracker-title">
              <Icon name={isBranch ? 'store' : 'package-check'} size={18} />
              <span>{isBranch ? tr('مسار تجهيز واستلام الطلب', 'Boutique pickup fulfillment status') : tr('مسار تجهيز وشحن الطلب', 'Order fulfillment status')}</span>
            </h3>

            {isBranch ? (
              <ol className="order-tracker-steps">
                <li className="order-tracker-step is-done">
                  <div className="order-tracker-step-circle">
                    <Icon name="check" size={18} stroke={3} />
                  </div>
                  <span className="order-tracker-step-label">{tr('تم الاستلام', 'Received')}</span>
                </li>

                <li className={`order-tracker-step ${currentStatus === 'pending' ? '' : currentStatus === 'processing' ? 'is-current' : 'is-done'}`}>
                  <div className="order-tracker-step-circle">
                    <Icon name="package" size={18} />
                  </div>
                  <span className="order-tracker-step-label">{tr('جاري التجهيز بالفرع', 'Preparing')}</span>
                </li>

                <li className={`order-tracker-step ${currentStatus === 'ready' ? 'is-current' : currentStatus === 'completed' ? 'is-done' : ''}`}>
                  <div className="order-tracker-step-circle">
                    <Icon name="store" size={18} />
                  </div>
                  <span className="order-tracker-step-label">{tr('جاهز للاستلام بالفرع', 'Ready for pickup')}</span>
                </li>

                <li className={`order-tracker-step ${currentStatus === 'completed' ? 'is-done is-current' : ''}`}>
                  <div className="order-tracker-step-circle">
                    <Icon name="check-circle" size={18} />
                  </div>
                  <span className="order-tracker-step-label">{tr('تم الاستلام', 'Completed')}</span>
                </li>
              </ol>
            ) : (
              <ol className="order-tracker-steps">
                <li className="order-tracker-step is-done">
                  <div className="order-tracker-step-circle">
                    <Icon name="check" size={18} stroke={3} />
                  </div>
                  <span className="order-tracker-step-label">{tr('تم الاستلام', 'Received')}</span>
                </li>

                <li className={`order-tracker-step ${currentStatus === 'pending' ? '' : currentStatus === 'processing' ? 'is-current' : 'is-done'}`}>
                  <div className="order-tracker-step-circle">
                    <Icon name="package" size={18} />
                  </div>
                  <span className="order-tracker-step-label">{tr('جاري التجهيز والتغليف', 'Packaging')}</span>
                </li>

                <li className={`order-tracker-step ${currentStatus === 'delivered' || currentStatus === 'shipped' ? 'is-current' : currentStatus === 'completed' ? 'is-done' : ''}`}>
                  <div className="order-tracker-step-circle">
                    <Icon name="truck" size={18} />
                  </div>
                  <span className="order-tracker-step-label">{tr('شحن مبرد', 'Chilled shipping')}</span>
                </li>

                <li className={`order-tracker-step ${currentStatus === 'completed' ? 'is-done is-current' : ''}`}>
                  <div className="order-tracker-step-circle">
                    <Icon name="home" size={18} />
                  </div>
                  <span className="order-tracker-step-label">{tr('تم التوصيل', 'Delivered')}</span>
                </li>
              </ol>
            )}
          </div>

          {/* Unified Order & Shipping Details Card */}
          <div className="checkout-card order-details-card order-details-card-modern">
            <div className="order-section-header">
              <h2 className="order-section-title">
                <Icon name="clipboard-list" size={20} />
                <span>{tr('تفاصيل الطلب والفاتورة', 'Order & invoice details')}</span>
              </h2>
            </div>

            {/* Recipient & Shipping Address */}
            <div className="order-shipping-block">
              <div className="order-shipping-cell">
                <span className="order-shipping-cell-label">
                  <Icon name="user" size={14} />
                  <span>{tr('بيانات المستلم', 'Recipient info')}</span>
                </span>
                <span className="order-shipping-cell-content">
                  {order.customer_name || tr('عميل تمرنا', 'Tamrna customer')}
                </span>
                {order.customer_phone ? (
                  <span className="order-shipping-cell-sub" dir="ltr">
                    {order.customer_phone}
                  </span>
                ) : null}
              </div>

              <div className="order-shipping-cell">
                <span className="order-shipping-cell-label">
                  <Icon name={isBranch ? 'store' : 'map-pin'} size={14} />
                  <span>{isBranch ? tr('فرع الاستلام المعتمد', 'Pickup boutique') : tr('عنوان التوصيل المعتمد', 'Delivery address')}</span>
                </span>
                <span className="order-shipping-cell-content">
                  {isBranch
                    ? (order.branch_name || tr('فرع تمرنا المعتمد', 'Authorized Tamrna Boutique')) + (order.city ? ` (${order.city})` : '')
                    : (order.shipping_address || (order.city ? `${order.city} - ${tr('توصيل منزلي', 'Home delivery')}` : tr('العنوان المعتمد للطلب', 'Registered address')))}
                </span>
                <span className="order-shipping-cell-sub" style={{ color: '#174a37', fontWeight: 600 }}>
                  {isBranch
                    ? `📍 ${order.branch_address || tr('استلام مباشر من الفرع خلال ساعات العمل الرسمية', 'Direct pickup during business hours')}`
                    : `❄️ ${tr('نقل مبرد لضمان جودة وطزاجة التمور', 'Chilled transport to preserve premium date freshness')}`}
                </span>
              </div>
            </div>

            {/* Ordered Items List */}
            <div className="order-items-wrapper">
              <div className="order-section-header" style={{ marginBottom: '14px' }}>
                <h3 className="order-section-title" style={{ fontSize: '15px' }}>
                  <Icon name="boxes" size={16} />
                  <span>{tr('الأصناف المطلوبة', 'Ordered items')} ({items.length})</span>
                </h3>
              </div>

              <ul className="order-items-list">
                {items.map((item) => {
                  const name = pickLang(item, 'product_name', locale, item.product_name);
                  let size = pickLang(item, 'size_name', locale, item.size_name || '');
                  if (!isRtl) size = String(size).replace(/كجم|كيلو/g, 'kg');
                  return (
                    <li key={item.id} className="order-item-row">
                      <div className="order-item-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset(item.featured_image || 'assets/images/home/ajwa.webp')}
                          alt={name}
                          className="order-item-thumb"
                        />
                        <div className="order-item-info">
                          <strong className="order-item-name">{name}</strong>
                          <span className="order-item-badge">
                            {size ? `${size} × ` : ''}{item.quantity} {tr('عبوة', 'units')}
                          </span>
                        </div>
                      </div>
                      <strong className="order-item-price">{money(item.subtotal)}</strong>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Financial Summary Block */}
            <div className="order-summary-block">
              <div className="order-summary-row">
                <span>{tr('المجموع الفرعي', 'Subtotal')}</span>
                <strong>{money(order.subtotal)}</strong>
              </div>

              {order.discount > 0 ? (
                <div className="order-summary-row is-discount">
                  <span>{tr('الخصم المطبق', 'Discount applied')}</span>
                  <strong>- {money(order.discount)}</strong>
                </div>
              ) : null}

              <div className="order-summary-row">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name={isBranch ? 'store' : 'truck'} size={14} />
                  <span>{isBranch ? tr('طريقة الاستلام (استلام من الفرع)', 'Fulfillment (Boutique pickup)') : tr('رسوم الشحن والتوصيل المبرد', 'Chilled shipping fee')}</span>
                </span>
                {isBranch || Number(order.shipping_fee) === 0 ? (
                  <span className="order-free-chip">{tr('مجاناً', 'FREE')}</span>
                ) : (
                  <strong>{money(order.shipping_fee)}</strong>
                )}
              </div>

              <div className="order-summary-divider" />

              <div className="order-summary-row is-total">
                <span>{tr('الإجمالي النهائي المدفوع', 'Total amount paid')}</span>
                <strong>{money(order.total)}</strong>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="checkout-success-actions order-actions-footer">
              <button
                type="button"
                className="order-btn-outline"
                onClick={() => window.print()}
              >
                <Icon name="printer" size={18} />
                <span>{tr('طباعة الفاتورة', 'Print invoice')}</span>
              </button>

              <Link href="/catalog" className="order-btn-primary">
                <span>{tr('متابعة التسوق', 'Continue shopping')}</span>
                <Icon name={isRtl ? 'arrow-left' : 'arrow-right'} size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
