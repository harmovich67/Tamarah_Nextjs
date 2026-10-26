'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@tamrna/shared/components/Icon';
import { ORDER_STATUS_LABELS } from '@tamrna/shared/constants';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { accountService } from '@/services';
import { asset } from '@/lib/asset';
import AccountShell from './AccountShell';

/** Order state -> tab. Anything not delivered or cancelled is still in progress. */
const tabOf = (status) => {
  if (['delivered', 'completed'].includes(status)) return 'completed';
  if (['cancelled', 'canceled', 'failed', 'refunded'].includes(status)) return 'cancelled';
  return 'current';
};

/** My orders (resources/views/storefront/profile/orders.php). */
export default function OrdersPage() {
  const { locale, tr, currency } = useLocale();
  const [tab, setTab] = useState('current');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['account', 'orders'], queryFn: () => accountService.listOrders() });

  const tabs = [
    ['current', tr('الطلبات الحالية', 'Current orders')],
    ['completed', tr('الطلبات المكتملة', 'Completed orders')],
    ['cancelled', tr('الطلبات الملغاة', 'Cancelled orders')],
  ];
  const orders = data?.orders || [];
  const statusOf = (o) => String(o.shipping_status || 'processing').toLowerCase();
  const counts = { current: 0, completed: 0, cancelled: 0 };
  orders.forEach((o) => { counts[tabOf(statusOf(o))] += 1; });
  const visible = orders.filter((o) => tabOf(statusOf(o)) === tab);

  return (
    <AccountShell active="orders" heading={tr('طلباتي', 'My Orders')}>
      {isLoading ? <LoadingState rows={2} /> : isError ? <ErrorState onRetry={refetch} /> : !orders.length ? (
        <section className="account-card account-wide-card account-orders-page">
          <header><span><Icon name="package" size={21} /></span><h2>{tr('طلباتي', 'My Orders')}</h2></header>
          <div className="account-empty">
            <p>{tr('لم تقم بإنشاء أي طلبات حتى الآن', 'You have not placed any orders yet.')}</p>
            <Link href="/catalog" className="button button--primary" style={{ marginTop: 12 }}>{tr('تصفح تشكيلات التمور', 'Browse Dates Catalog')}</Link>
          </div>
        </section>
      ) : (
        <section className="account-card account-wide-card account-orders-page" id="orders-board">
          <header><span><Icon name="package" size={21} /></span><h2>{tr('طلباتي', 'My Orders')}</h2></header>
          <p className="account-orders-intro">{tr('اطّلع على سجل طلباتك وتابع حالة كل طلب، واضغط على صورة أي منتج لعرض تفاصيله.', 'Review your order history and status, then select a product image to view its details.')}</p>

          <div className="account-order-tabs" role="tablist" aria-label={tr('تصنيف الطلبات', 'Order categories')}>
            {tabs.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
                <span>{label}</span>
                <b>{counts[key]}</b>
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {!visible.length ? (
              <p className="account-empty">{tr('لا توجد طلبات في هذا القسم.', 'No orders in this section.')}</p>
            ) : (
              <div className="account-order-cards">
                {visible.map((order) => {
                  const status = statusOf(order);
                  const items = data.orderItems[order.id] || [];
                  return (
                    <article className="account-order-card" key={order.id}>
                      <header>
                        <div><small>{tr('رقم الطلب', 'Order number')}</small><b dir="ltr">{order.order_number}</b></div>
                        <em data-status={status}>{ORDER_STATUS_LABELS[status]?.[locale] || status}</em>
                      </header>
                      {items.length > 0 && (
                        <div className="account-order-products">
                          {items.map((item) => {
                            const thumb = asset(item.featured_image || 'assets/images/home/ajwa.webp');
                            const inner = (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={thumb} alt="" loading="lazy" />
                                <i>{item.quantity}</i>
                              </>
                            );
                            return item.slug ? (
                              <Link key={item.id} className="account-order-product" href={`/product/${item.slug}`} aria-label={`${tr('عرض تفاصيل ', 'View details for ')}${item.product_name}`}>{inner}</Link>
                            ) : (
                              <div key={item.id} className="account-order-product">{inner}</div>
                            );
                          })}
                        </div>
                      )}
                      <dl>
                        {order.created_at ? <div><dt>{tr('التاريخ', 'Date')}</dt><dd>{String(order.created_at).slice(0, 10)}</dd></div> : null}
                        <div><dt>{tr('إجمالي الطلب', 'Order total')}</dt><dd>{numberFormat(order.total, 2)} {currency}</dd></div>
                      </dl>
                      {order.tracking_number ? (
                        <div className="account-order-tracking"><span>{tr('رقم التتبع', 'Tracking number')}</span><b dir="ltr">{order.tracking_number}</b></div>
                      ) : null}
                      <div className="account-order-tracking">
                        <span><Icon name="snowflake" size={14} /> {tr('شحن مبرد فاخر', 'Cold Express Delivery')}</span>
                        <Link className="button button--outline button--sm" href={`/profile/order/${order.order_number}`}>
                          {tr('تفاصيل وتتبع الطلب', 'Order Details')}
                          <Icon name="arrow-left" size={15} className="directional-arrow" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </AccountShell>
  );
}
