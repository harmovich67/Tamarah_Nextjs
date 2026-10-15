'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { effectivePrice, oldPrice, pickLang, weightToEnglish } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import ProductCard from '@/components/product/ProductCard';
import StarRating, { ratingLabel } from '@/components/product/StarRating';
import { useCartActions } from '@/hooks/useCart';
import { useWishlistIds, useWishlistToggle } from '@/hooks/useWishlist';
import { asset } from '@/lib/asset';
import { showToast } from '@/store/toastStore';

/** Gallery: JSON array or comma separated list, falling back to the featured image. */
function buildGallery(product) {
  const main = product.featured_image || 'assets/images/home/ajwa.webp';
  const gallery = [main];
  let extra = product.gallery;
  if (typeof extra === 'string' && extra.trim()) {
    try {
      extra = JSON.parse(extra);
    } catch {
      extra = extra.split(',').map((s) => s.trim());
    }
  }
  if (Array.isArray(extra)) extra.forEach((g) => typeof g === 'string' && g && !gallery.includes(g) && gallery.push(g));
  return gallery;
}

/**
 * Product page body (resources/views/storefront/product_detail.php): gallery with lightbox, variant picker,
 * quantity stepper, add-to-cart, wishlist, WhatsApp inquiry and the share dialog.
 */
export default function ProductDetail({ product, variants, related, whatsapp, shareUrl }) {
  const { locale, isRtl, tr, money } = useLocale();
  const { add } = useCartActions();
  const { data: wishlist = [] } = useWishlistIds();
  const toggleWishlist = useWishlistToggle();

  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [share, setShare] = useState({ open: false, feedback: '' });
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share), []);
  useEffect(() => {
    if (!lightbox && !share.open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setLightbox(false);
      setShare((s) => ({ ...s, open: false }));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, share.open]);

  const isPreorder = !!product.is_preorder;
  const isFragile = !!product.is_fragile;
  const stockQty = Number(product.stock_quantity ?? 50);
  const isOutOfStock = stockQty <= 0;
  const selected = variants.find((v) => v.id === variantId) || null;
  const priceSource = selected || product;
  const price = effectivePrice(priceSource);
  const old = oldPrice(priceSource);

  const name = pickLang(product, 'name', locale);
  const description = pickLang(product, 'description', locale);
  const categoryName = pickLang(product, 'category_name', locale, tr('تمور ملكية فاخرة', 'Royal Luxury Dates'));
  const badge = pickLang(product, 'badge', locale);
  const gallery = buildGallery(product);
  const rating = Number(product.rating || 0);
  const salesCount = Number(product.sales_count || 0);
  const inWishlist = wishlist.some((id) => Number(id) === Number(product.id));
  const shareText = `${name} — ${tr('تمرنا', 'Tamrna')}`;
  const sep = isRtl ? '‹' : '›';
  const stockState = isOutOfStock ? 'stock-out' : stockQty <= 10 ? 'stock-low' : 'stock-ok';
  const stockLabel = isOutOfStock
    ? tr('غير متوفر حالياً', 'Currently unavailable')
    : stockQty <= 10
      ? tr(`كمية محدودة (${stockQty})`, `Limited stock (${stockQty})`)
      : tr('متوفر في المخزون', 'In stock');
  const kg = (text) => (isRtl ? text : String(text).replace(/كجم|كيلو/g, 'kg'));
  const waUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`${tr('مرحباً متجر تمرنا، أود الاستفسار عن وحجز منتج: ', 'Hello Tumurna, I would like to inquire about: ')}${name}`)}`;
  const maxQty = Math.max(1, selected ? selected.stock_quantity : stockQty);

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
    } finally {
      setShare((s) => ({ ...s, feedback: tr('تم نسخ الرابط', 'Link copied') }));
    }
  };

  return (
    <>
      <div className="product-details-shell">
        <section className="product-detail-main">
          <div className="container">
            <nav className="product-breadcrumb" aria-label={tr('مسار التنقل', 'Breadcrumb')}>
              <Link href="/">{tr('الرئيسية', 'Home')}</Link>
              <span>{sep}</span>
              <Link href="/catalog">{tr('المنتجات', 'Products')}</Link>
              <span>{sep}</span>
              <Link href={`/catalog?cat=${product.category_slug || ''}`}>{categoryName}</Link>
              <span>{sep}</span>
              <span>{name}</span>
            </nav>

            <div className="product-detail-layout">
              <div className="product-gallery">
                <div className="product-gallery-stage">
                  <button type="button" className="product-gallery-zoom" id="gallery-zoom" onClick={() => setLightbox(true)} aria-label={tr('اضغط لتكبير الصورة', 'Click to enlarge')}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img id="main-product-image" src={asset(gallery[imageIndex])} alt={name} />
                    <span>
                      <Icon name="maximize2" size={16} />
                      {tr('اضغط لتكبير الصورة', 'Click to enlarge')}
                    </span>
                  </button>
                  {gallery.length > 1 && (
                    <span className="product-gallery-count" dir="ltr" id="gallery-count">
                      {imageIndex + 1} / {gallery.length}
                    </span>
                  )}
                  {product.is_bestseller ? <span className="product-bestseller">{tr('الأكثر طلباً', 'Best seller')}</span> : null}
                </div>
                {gallery.length > 1 && (
                  <div className="product-thumbnails">
                    <div>
                      {gallery.map((img, i) => (
                        <button key={img} type="button" className={`product-thumb-item${i === imageIndex ? ' is-current' : ''}`} aria-label={i + 1} aria-current={i === imageIndex ? 'true' : undefined} onClick={() => setImageIndex(i)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset(img)} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <article className="product-detail-info">
                <div className="product-title-row">
                  <Icon name="tree-palm" size={43} className="palm-decoration" stroke={1.1} />
                  <div>
                    <span className="product-category">{categoryName}</span>
                    <div className="product-heading">
                      <h1>{name}</h1>
                      {rating > 0 && <StarRating value={rating} label={ratingLabel(rating, Number(product.rating_count || 0), isRtl)} size={17} showValue />}
                    </div>
                  </div>
                  <button type="button" className="button button--icon product-share-button" id="product-share-open" onClick={() => setShare({ open: true, feedback: '' })} aria-label={tr('مشاركة المنتج', 'Share product')} title={tr('مشاركة المنتج', 'Share product')}>
                    <Icon name="share2" size={19} />
                  </button>
                </div>

                {description ? <p className="product-description">{description}</p> : null}

                {(salesCount > 0 || (!isOutOfStock && stockQty <= 50)) && (
                  <p className="product-signals">
                    {salesCount > 0 && (
                      <span>
                        <Icon name="repeat2" size={16} />
                        {salesCount.toLocaleString('en-US')} {tr('مرة شراء', 'purchases')}
                      </span>
                    )}
                    {!isOutOfStock && stockQty <= 50 && (
                      <span>
                        <Icon name="boxes" size={16} />
                        {tr(`الكمية المتاحة: ${stockQty} قطعة`, `Available: ${stockQty} pcs`)}
                      </span>
                    )}
                  </p>
                )}

                <div className="product-meta-tags">
                  {isPreorder && <span className="badge badge--preorder">{tr('حجز مسبق للحصاد', 'Harvest Pre-Order')}</span>}
                  {isFragile && <span className="badge badge--preorder">{tr('منتج حساس / زجاجي', 'Fragile / Artisanal')}</span>}
                  {badge ? <span className="badge">{badge}</span> : null}
                </div>

                <div className="product-commerce-row">
                  <div className="product-detail-price">
                    <div className="product-price">
                      <span id="product-display-price">{money(price)}</span>
                      <del id="product-old-price" className={old ? undefined : 'hidden'}>{old ? money(old) : ''}</del>
                    </div>
                  </div>
                  <div className="product-stock">
                    <span className={stockState}>
                      <i />
                      {stockLabel}
                    </span>
                  </div>
                </div>
                <span className="muted">{tr('شامل ضريبة القيمة المضافة', 'Includes 15% VAT')}</span>

                {isPreorder && (
                  <div className="product-preorder">
                    <strong>{tr('معلومات الحجز المسبق لموسم الحصاد', 'Harvest Season Pre-Order Information')}</strong>
                    <p>
                      {tr('هذا الصنف يتم جنيه طازجاً في موسم الحصاد. التاريخ التقديري لبدء الشحن المبرد: ', 'This selection is freshly picked during harvest season. Estimated refrigerated shipping date: ')}
                      <strong>{product.preorder_date || tr('سبتمبر 2026', 'September 2026')}</strong>.
                    </p>
                  </div>
                )}

                {variants.length > 0 && (
                  <fieldset className="product-weight">
                    <legend>{tr('اختر حجم العبوة أو التغليف', 'Select packaging / weight')}</legend>
                    <div>
                      {variants.map((v) => {
                        const vName = isRtl ? v.size_name : kg(v.size_name_en || v.size_name);
                        const isSel = v.id === variantId;
                        return (
                          <button type="button" key={v.id} className={`variant-btn${isSel ? ' is-selected' : ''}`} aria-pressed={isSel} data-variant-id={v.id} onClick={() => { setVariantId(v.id); setQty(1); }}>
                            <strong className="variant-name">{vName}</strong>
                            <span>{money(effectivePrice(v))}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                <section className="product-facts" aria-label={tr('تفاصيل المنتج', 'Product details')}>
                  {product.sku ? (
                    <div>
                      <Icon name="barcode" size={21} />
                      <span>
                        {tr('رمز المنتج', 'SKU')}
                        <strong dir="ltr">{selected?.sku || product.sku}</strong>
                      </span>
                    </div>
                  ) : null}
                  {product.weight ? (
                    <div>
                      <Icon name="package-check" size={21} />
                      <span>
                        {tr('الوزن', 'Weight')}
                        <strong>{isRtl ? product.weight : weightToEnglish(product.weight).replace(/كجم|كيلو/g, 'kg')}</strong>
                      </span>
                    </div>
                  ) : null}
                  <div>
                    <Icon name="truck" size={21} />
                    <span>
                      {tr('التوصيل', 'Delivery')}
                      <strong>{tr('شحن مبرد متاح لجميع مناطق المملكة', 'Chilled shipping across the Kingdom')}</strong>
                    </span>
                  </div>
                </section>

                <div className="product-buy-row">
                  <div className="quantity-stepper" role="group" aria-label={tr('الكمية', 'Quantity')}>
                    <button type="button" className="button button--icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={tr('تقليل الكمية', 'Decrease')}>
                      <Icon name="minus" size={18} />
                    </button>
                    <input type="number" id="product-qty" value={qty} min="1" max={maxQty} aria-live="polite" onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
                    <button type="button" className="button button--icon" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label={tr('زيادة الكمية', 'Increase')}>
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
                  <button
                    type="button"
                    id="addToCartBtn"
                    className="button button--primary product-add-button"
                    disabled={isOutOfStock || add.isPending}
                    onClick={() => add.mutate({ productId: product.id, variantId, quantity: qty })}
                  >
                    <Icon name="shopping-cart" size={20} />
                    {isOutOfStock ? tr('نفد من المخزون', 'Out of Stock') : isPreorder ? tr('حجز مسبق وإضافة للسلة', 'Pre-order & add to cart') : tr('أضف إلى السلة', 'Add to cart')}
                  </button>
                  <div className="product-secondary-actions">
                    <button type="button" className={`button button--outline wishlist-button${inWishlist ? ' is-saved' : ''}`} data-wishlist-id={product.id} aria-pressed={inWishlist} onClick={() => toggleWishlist.mutate(product.id)}>
                      <Icon name="heart" size={18} />
                      <span data-wishlist-label>
                        {isRtl ? (inWishlist ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة') : inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      </span>
                    </button>
                    <a className="button button--outline" href={waUrl} target="_blank" rel="noreferrer">
                      <Icon name="message-circle" size={18} />
                      {tr('طلب فوري واستفسار عبر واتساب', 'Order / inquire via WhatsApp')}
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div className="benefit-strip container">
            <ul>
              {[
                ['tree-palm', tr('تمور سعودية أصيلة', 'Authentic Saudi dates'), tr('من خير أرضنا', 'From our land')],
                ['shield-check', tr('جودة نعتني بها', 'Quality we care for'), tr('اختيارات لمذاق مميز', 'Choices for a distinct taste')],
                ['truck', tr('خيارات توصيل مرنة', 'Flexible delivery'), tr('وفق منطقتك وطلبك', 'By region and order')],
                ['gift', tr('بطاقات إهداء مميزة', 'Special gift cards'), tr('شاركوا لحظات الكرم', 'Share generous moments')],
                ['headphones', tr('خدمة عملاء متعاونة', 'Helpful customer care'), tr('نسعد بتواصلكم', 'We love hearing from you')],
              ].map(([icon, title, sub]) => (
                <li key={icon}>
                  <Icon name={icon} size={35} stroke={1.35} />
                  <div>
                    <strong>{title}</strong>
                    <p>{sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {related.length > 0 && (
            <section className="product-related container">
              <div className="product-related-heading">
                <h2>{tr('منتجات مشابهة', 'You may also like')}</h2>
                <Link href="/catalog">
                  {tr('عرض الكل', 'View all')}
                  <Icon name="arrow-left" size={16} className="directional-arrow" />
                </Link>
              </div>
              <div className="product-grid">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </section>
      </div>

      <div className={`global-overlay${share.open ? '' : ' hidden'}`} id="share-overlay" onClick={() => setShare((s) => ({ ...s, open: false }))} />
      <div className={`dialog${share.open ? '' : ' hidden'}`} id="share-dialog" dir={isRtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="dialog-heading">
          <h2 id="share-title">{tr('مشاركة المنتج', 'Share this product')}</h2>
          <button type="button" className="button button--icon" onClick={() => setShare((s) => ({ ...s, open: false }))} aria-label={tr('إغلاق', 'Close')}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <p className="dialog-description">{name}</p>
        <div className="share-targets">
          <a className="share-target" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}><Icon name="message-circle" size={20} />WhatsApp</a>
          <a className="share-target" target="_blank" rel="noopener" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}><Icon name="send" size={20} />X</a>
          <a className="share-target" target="_blank" rel="noopener" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}><Icon name="globe" size={20} />Facebook</a>
          <a className="share-target" href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`}><Icon name="mail" size={20} />{tr('البريد الإلكتروني', 'Email')}</a>
        </div>
        <button type="button" className="share-link" id="share-copy" onClick={copyLink} style={{ width: '100%', border: 0, cursor: 'pointer', textAlign: 'start' }}>
          <Icon name="copy" size={16} />
          <span dir="ltr">{shareUrl}</span>
        </button>
        {canNativeShare && (
          <button type="button" className="button button--primary share-native" id="share-native" onClick={() => navigator.share({ title: shareText, url: shareUrl }).catch(() => {})}>
            <Icon name="share2" size={18} />
            {tr('مشاركة عبر الجهاز', 'Share via device')}
          </button>
        )}
        <p className="share-feedback" id="share-feedback" role="status">{share.feedback}</p>
      </div>

      <div className={`product-lightbox${lightbox ? '' : ' hidden'}`} id="product-lightbox" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setLightbox(false)}>
        <button type="button" className="button button--icon" id="lightbox-close" onClick={() => setLightbox(false)} aria-label={tr('إغلاق', 'Close')}>
          <Icon name="x" size={22} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="lightbox-image" src={lightbox ? asset(gallery[imageIndex]) : undefined} alt={name} />
      </div>
    </>
  );
}
