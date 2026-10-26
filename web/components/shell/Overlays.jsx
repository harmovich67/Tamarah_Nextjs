'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { useUiStore } from '@/store/uiStore';
import { useCart, useCartActions } from '@/hooks/useCart';
import { asset, FALLBACK_IMAGE } from '@/lib/asset';
import { atStockLimit, limitMessage, StockNote } from '@/components/cart/StockNote';
import { showToast } from '@/store/toastStore';
import { SiteNav } from './Header';

/** Menu drawer, cart drawer and search dialog (one open at a time, Escape / overlay click closes). */
export default function Overlays({ nav }) {
  const { isRtl, tr, locale } = useLocale();
  const overlay = useUiStore((s) => s.overlay);
  const close = useUiStore((s) => s.close);
  const pathname = usePathname();
  const dir = isRtl ? 'rtl' : 'ltr';

  // Navigating closes whatever is open.
  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    document.body.style.overflow = overlay ? 'hidden' : '';
    if (!overlay) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlay, close]);

  return (
    <>
      <div className={`global-overlay${overlay ? '' : ' hidden'}`} data-overlay onClick={close} />

      <div className={`dialog menu-dialog${overlay === 'menu-drawer' ? '' : ' hidden'}`} id="menu-drawer" dir={dir} role="dialog" aria-modal="true" aria-labelledby="menu-dialog-title">
        <div className="dialog-heading">
          <h2 id="menu-dialog-title">{tr('القائمة', 'Menu')}</h2>
          <button type="button" className="button button--icon" onClick={close} aria-label={tr('إغلاق', 'Close')}>
            <Icon name="x" size={22} />
          </button>
        </div>
        <SiteNav items={nav} className="mobile-nav" ariaLabel={tr('القائمة', 'Main menu')} />
      </div>

      <CartDrawer open={overlay === 'cart-drawer'} dir={dir} />
      <SearchDialog open={overlay === 'search-dialog'} dir={dir} key={locale} />
    </>
  );
}

function CartDrawer({ open, dir }) {
  const { tr, money } = useLocale();
  const close = useUiStore((s) => s.close);
  const { data: cart, isLoading, isError, refetch } = useCart();
  const actions = useCartActions();
  const items = cart?.items || [];
  const count = cart?.count || 0;
  const hasStockIssue = items.some((it) => it.out_of_stock);

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  return (
    <aside className={`drawer cart-drawer${open ? '' : ' hidden'}`} id="cart-drawer" dir={dir} role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <div className="dialog-heading">
        <h2 id="cart-drawer-title">
          {tr('سلة التسوق', 'Shopping cart')} (<span id="cart-drawer-count">{count}</span>)
        </h2>
        <button type="button" className="button button--icon" onClick={close} aria-label={tr('إغلاق', 'Close')}>
          <Icon name="x" size={21} />
        </button>
      </div>

      <div className="drawer-scroll" id="cart-drawer-body" aria-busy={isLoading}>
        {isError ? (
          <div className="cart-empty">
            <Icon name="alert-circle" size={48} stroke={1.3} />
            <h3>{tr('تعذر تحميل السلة', 'Could not load your cart')}</h3>
            <button type="button" className="button button--outline" onClick={() => refetch()}>{tr('إعادة المحاولة', 'Try again')}</button>
          </div>
        ) : !items.length ? (
          <div className="cart-empty">
            <Icon name="shopping-bag" size={48} stroke={1.3} />
            <h3>{tr('سلتك بانتظار اختياراتك', 'Your bag awaits')}</h3>
            <p>{tr('أضف منتجات من المتجر لتبدأ طلبك.', 'Add a product to start your order.')}</p>
            <Link className="button button--primary" href="/catalog">{tr('متابعة التصفح', 'Continue browsing')}</Link>
          </div>
        ) : (
          <ul className="cart-items">
            {items.map((it) => (
              <li className="cart-item" key={it.key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(it.image || FALLBACK_IMAGE)} alt={it.product_name} />
                <div className="cart-item-info">
                  <h3>{it.product_name}</h3>
                  <span className="muted">
                    {it.size_name || ''}
                    {it.is_preorder ? ` · ${tr('حجز مسبق', 'Pre-order')}` : ''}
                  </span>
                  <div className="product-price">
                    <span>{it.unit_price_formatted}</span>
                  </div>
                  <div className="quantity-stepper" role="group">
                    <button type="button" className="button button--icon" onClick={() => actions.update.mutate({ key: it.key, quantity: it.quantity - 1, previous: it.quantity })} aria-label={tr('تقليل الكمية', 'Decrease quantity')}>
                      <Icon name="minus" size={16} />
                    </button>
                    <output>{it.quantity}</output>
                    <button type="button" className={`button button--icon${atStockLimit(it) ? ' is-at-limit' : ''}`} onClick={() => (atStockLimit(it) ? showToast(limitMessage(it, tr), 'info') : actions.update.mutate({ key: it.key, quantity: it.quantity + 1, previous: it.quantity }))} disabled={actions.update.isPending} aria-label={tr('زيادة الكمية', 'Increase quantity')}>
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                  <StockNote item={it} tr={tr} onFit={() => actions.fit.mutate({ key: it.key })} fitting={actions.fit.isPending} />
                </div>
                <button type="button" className="button button--icon cart-item-remove" onClick={() => actions.remove.mutate({ key: it.key })} aria-label={tr('حذف المنتج', 'Remove item')} title={tr('حذف المنتج', 'Remove item')}>
                  <Icon name="trash-2" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`drawer-bottom${items.length ? '' : ' hidden'}`} id="cart-drawer-bottom">
        <div className="subtotal">
          <span>{tr('المجموع الفرعي', 'Subtotal')}</span>
          <strong>{cart?.subtotal_formatted}</strong>
        </div>
        {cart?.discount > 0 && (
          <div className="subtotal" style={{ color: 'var(--color-success)' }}>
            <span>{tr('الخصم', 'Discount')}</span>
            <strong>- {cart.discount_formatted}</strong>
          </div>
        )}
        <p className="muted">{tr('يُحدَّد الشحن عند إتمام الطلب وفق العنوان وطريقة التوصيل.', 'Shipping is calculated at checkout based on your address and delivery method.')}</p>
        {hasStockIssue ? (
          <>
            <p className="stock-note stock-note--error" role="alert">{tr('بعض المنتجات غير متوفرة بالكمية المطلوبة. عدّلها لإتمام الطلب.', 'Some items are not available in the quantity you chose. Adjust them to check out.')}</p>
            <button type="button" className="button button--primary" disabled>{tr('إتمام الطلب', 'Checkout')}</button>
          </>
        ) : (
          <Link className="button button--primary" href="/checkout">{tr('إتمام الطلب', 'Checkout')}</Link>
        )}
        <Link className="button button--outline" href="/cart">{tr('عرض السلة كاملة', 'View full cart')}</Link>
      </div>
    </aside>
  );
}

function SearchDialog({ open, dir }) {
  const { tr } = useLocale();
  const close = useUiStore((s) => s.close);
  const router = useRouter();
  const input = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  const suggestions = [
    [tr('عجوة', 'Ajwa'), `/catalog?search=${encodeURIComponent(tr('عجوة', 'Ajwa'))}`],
    [tr('سكري', 'Sukkari'), `/catalog?search=${encodeURIComponent(tr('سكري', 'Sukkari'))}`],
    [tr('مجدول', 'Medjool'), `/catalog?search=${encodeURIComponent(tr('مجدول', 'Medjool'))}`],
    [tr('الحجز المسبق', 'Pre-orders'), '/catalog?filter=preorder'],
  ];

  const onSubmit = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('search')?.toString().trim();
    close();
    router.push(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog');
  };

  return (
    <div className={`dialog search-dialog${open ? '' : ' hidden'}`} id="search-dialog" dir={dir} role="dialog" aria-modal="true" aria-labelledby="search-dialog-title">
      <div className="dialog-heading">
        <h2 id="search-dialog-title">{tr('ابحث في المتجر', 'Search the store')}</h2>
        <button type="button" className="button button--icon" onClick={close} aria-label={tr('إغلاق', 'Close')}>
          <Icon name="x" size={21} />
        </button>
      </div>
      <form action="/catalog" method="GET" onSubmit={onSubmit}>
        <div className="catalog-search">
          <Icon name="search" size={18} />
          <input ref={input} className="input" type="search" name="search" autoComplete="off" placeholder={tr('ابحث عن نوع التمر (عجوة، سكري، بوكسات...)', 'Search dates (Ajwa, Sukkari, Gift Boxes...)')} />
        </div>
        <div className="search-suggestions">
          {suggestions.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
        <button type="submit" className="button button--primary">{tr('بحث', 'Search')}</button>
      </form>
    </div>
  );
}
