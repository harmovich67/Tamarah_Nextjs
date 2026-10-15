'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { DEFAULT_STANDARD_SHIPPING_FEE } from '@tamrna/shared/constants';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { useCart, useCartActions } from '@/hooks/useCart';
import { showToast } from '@/store/toastStore';
import { asset } from '@/lib/asset';
import { ErrorState, LoadingState } from '@/components/ui/States';

/** Shopping cart (resources/views/storefront/cart.php). All mutations go through useCartActions(). */
export default function CartPage({ standardFee = DEFAULT_STANDARD_SHIPPING_FEE }) {
  const { tr, currency } = useLocale();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const actions = useCartActions();
  const [coupon, setCoupon] = useState('');

  if (isLoading) return <LoadingState />;
  if (isError || !cart) return <ErrorState onRetry={refetch} />;

  const items = cart.items || [];
  const free = !!cart.is_free_shipping;
  const progress = cart.free_shipping_progress || 0;

  if (!items.length) {
    return (
      <section className="commerce-page cart-page">
        <div className="container">
          <div className="commerce-empty">
            <div className="cart-empty">
              <Icon name="shopping-bag" size={44} stroke={1} />
              <h3>{tr('سلتك بانتظار اختياراتك', 'Your bag awaits')}</h3>
              <p>{tr('أضف منتجات من المتجر لتبدأ طلبك.', 'Add a product to start your order.')}</p>
              <Link href="/catalog" className="button button--primary">{tr('متابعة التصفح', 'Continue browsing')}</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const apply = () => {
    const code = coupon.trim();
    if (!code) return showToast(tr('يرجى إدخال رمز الكوبون', 'Please enter a coupon code'), 'error');
    return actions.applyCoupon.mutate({ code }, { onSuccess: () => setCoupon('') });
  };

  const clear = () => {
    if (window.confirm(tr('هل أنت متأكد من تفريغ سلة المشتريات بالكامل؟', 'Are you sure you want to clear your entire cart?'))) actions.clear.mutate();
  };

  return (
    <section className="commerce-page cart-page">
      <div className="container">
        <header className="commerce-heading">
          <span className="commerce-kicker">
            <Icon name="shopping-bag" size={18} />
            {tr('سلة تمرنا', 'Tamrna bag')}
          </span>
          <h1>{tr('سلة المشتريات', 'Shopping Cart')}</h1>
          <p>{tr('راجع أصناف التمور المختارة وأكمل طلبك', 'Review your selected dates and complete your order')}</p>
          <Link className="commerce-back" href="/catalog">
            <Icon name="arrow-left" size={17} className="directional-arrow" />
            {tr('متابعة التسوق', 'Continue shopping')}
          </Link>
        </header>

        <div className={`free-shipping-meter${free ? ' is-complete' : ''}`}>
          <div>
            <span>
              <Icon name="truck" size={18} />
              {free ? (
                <strong>{tr('تهانينا! لقد حصلت على شحن مبرد مجاني لكافة مدن المملكة 🎉', 'Congratulations! You unlocked free refrigerated shipping across KSA 🎉')}</strong>
              ) : (
                <span>
                  {tr('أضف تمور بقيمة ', 'Add dates worth ')}
                  <strong>{numberFormat(cart.free_shipping_remaining, 2)} {currency}</strong>
                  {tr(' لتحصل على شحن مبرد مجاناً!', ' to unlock free cold freight shipping!')}
                </span>
              )}
            </span>
            <small>{progress}%</small>
          </div>
          <div className="free-shipping-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="cart-page-layout">
          <div>
            <ul className="cart-page-items">
              {items.map((item) => (
                <li className="cart-item" key={item.key}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset(item.image || 'assets/images/home/ajwa.webp')} alt={item.product_name} />
                  <div className="cart-item-info">
                    <h3>{item.product_name}</h3>
                    <span className="muted">
                      {item.size_name}
                      {item.is_preorder ? <span className="badge badge--preorder" style={{ marginInlineStart: '.4rem' }}>{tr('حجز مسبق', 'Pre-Order')}</span> : null}
                    </span>
                    <div className="product-price"><span>{item.unit_price_formatted}</span></div>
                    <div className="quantity-stepper" role="group" aria-label={tr('الكمية', 'Quantity')}>
                      <button type="button" className="button button--icon" onClick={() => actions.update.mutate({ key: item.key, quantity: item.quantity - 1 })} aria-label={tr('تقليل الكمية', 'Decrease')}>
                        <Icon name="minus" size={16} />
                      </button>
                      <output>{item.quantity}</output>
                      <button type="button" className="button button--icon" onClick={() => actions.update.mutate({ key: item.key, quantity: item.quantity + 1 })} aria-label={tr('زيادة الكمية', 'Increase')}>
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                  </div>
                  <button type="button" className="button button--icon remove-item" onClick={() => actions.remove.mutate({ key: item.key })} title={tr('حذف من السلة', 'Remove from cart')} aria-label={`${tr('حذف: ', 'Remove: ')}${item.product_name}`}>
                    <Icon name="trash-2" size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="cart-page-actions">
              <button type="button" className="button button--danger button--sm" onClick={clear}>{tr('تفريغ سلة المشتريات', 'Clear entire cart')}</button>
              <Link href="/catalog" className="button button--outline button--sm">{tr('+ إضافة أصناف أخرى', '+ Add more items')}</Link>
            </div>
          </div>

          <aside className="commerce-summary">
            <h2>{tr('ملخص الفاتورة', 'Order Summary')}</h2>

            <label className="muted" htmlFor="couponInput" style={{ display: 'block', marginBottom: '.5rem' }}>
              {tr('كوبون الخصم أو قسيمة الإهداء', 'Promo code / gift voucher')}
            </label>
            {cart.coupon_code ? (
              <div className="coupon-applied">
                <div>
                  <strong dir="ltr">{cart.coupon_code}</strong>
                  <br />
                  <small>{tr('تم الخصم: ', 'Discount: ')}{cart.discount_formatted}</small>
                </div>
                <button type="button" className="button button--danger button--sm" onClick={() => actions.removeCoupon.mutate()}>{tr('إلغاء', 'Remove')}</button>
              </div>
            ) : (
              <div className="coupon-form">
                <input type="text" id="couponInput" className="input" value={coupon} onChange={(e) => setCoupon(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder={tr('مثال: TAMRNA10', 'e.g. TAMRNA10')} autoComplete="off" />
                <button type="button" className="button button--outline" onClick={apply} disabled={actions.applyCoupon.isPending}>{tr('تطبيق', 'Apply')}</button>
              </div>
            )}

            <div className="summary-row"><span>{tr('إجمالي المنتجات', 'Products subtotal')}</span><strong>{cart.subtotal_formatted}</strong></div>
            {cart.discount > 0 && (
              <div className="summary-row summary-row--discount"><span>{tr('خصم الكوبون', 'Coupon discount')}</span><strong>- {cart.discount_formatted}</strong></div>
            )}
            <div className="summary-row">
              <span>{tr('الشحن والتوصيل المبرد', 'Refrigerated shipping')}</span>
              <strong>{free ? tr('مجاناً', 'FREE') : `${numberFormat(standardFee, 2)} ${currency}`}</strong>
            </div>
            <div className="summary-row summary-row--total">
              <span>
                {tr('المبلغ الإجمالي', 'Estimated total')}
                <br />
                <small className="muted">{tr('شامل الضريبة والشحن', 'Includes 15% VAT & shipping')}</small>
              </span>
              <strong>{numberFormat(Number(cart.total) + (free ? 0 : standardFee), 2)} {currency}</strong>
            </div>

            <Link href="/checkout" className="button button--primary commerce-primary-action">
              {tr('متابعة الشحن والدفع', 'Proceed to checkout')}
              <Icon name="arrow-left" size={18} className="directional-arrow" />
            </Link>
            <p className="commerce-security-note">{tr('دفع مشفر ١٠٠٪ ومتوافق مع البنك المركزي السعودي', '100% encrypted checkout, SAMA compliant')}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
