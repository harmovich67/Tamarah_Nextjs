'use client';

import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { discountPercent, effectivePrice, oldPrice, pickLang, weightToEnglish } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { useCartActions } from '@/hooks/useCart';
import { useWishlistIds, useWishlistToggle } from '@/hooks/useWishlist';
import { asset } from '@/lib/asset';
import StarRating, { ratingLabel } from './StarRating';

const PREORDER_BADGE = /pre-?\s?order|حجز\s*مسبق/iu;

/**
 * Tamrna Foundation product card (resources/views/components/product_card.php).
 *
 * @param {object} props
 * @param {object} props.product
 * @param {string} [props.extraClass]  e.g. "product-card--compact"
 * @param {number} [props.rank]        1-based rank badge (best sellers)
 */
export default function ProductCard({ product: p, extraClass = '', rank = 0 }) {
  const { locale, isRtl, tr, money } = useLocale();
  const { add } = useCartActions();
  const { data: wishlist = [] } = useWishlistIds();
  const toggle = useWishlistToggle();

  const inWishlist = wishlist.some((id) => Number(id) === Number(p.id));
  const isPreorder = !!p.is_preorder;
  const isOutOfStock = Number(p.stock_quantity ?? p.stock_qty ?? 50) <= 0;
  const price = effectivePrice(p);
  const old = oldPrice(p);
  const discount = discountPercent(p);
  const href = `/product/${p.slug || p.id}`;
  const name = pickLang(p, 'name', locale);
  const badge = pickLang(p, 'badge', locale);
  const category = pickLang(p, 'category_name', locale);
  const weightRaw = p.weight ?? (isRtl ? '1 كجم' : '1 kg');
  const weight = isRtl ? weightRaw : weightToEnglish(weightRaw);
  const rating = Number(p.rating || 0);
  const wishTitle = isRtl ? (inWishlist ? 'إزالة من المفضلة' : 'إضافة للمفضلة') : inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist';

  return (
    <article className={`product-card product-card--storefront ${extraClass}`.trim()} data-product-id={p.id}>
      <div className="product-card-media">
        <Link className="product-image-link" href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(p.featured_image || p.image || 'assets/images/home/ajwa.webp')}
            alt={name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = asset('assets/images/home/ajwa.webp');
            }}
          />
        </Link>

        <div className="product-badges">
          {rank > 0 && (
            <span className="badge rank-badge">
              <bdi>#{rank}</bdi>
            </span>
          )}
          {isOutOfStock ? (
            <span className="badge badge--out_of_stock">{tr('نفد من المخزون', 'Out of Stock')}</span>
          ) : (
            <>
              {isPreorder && <span className="badge badge--preorder">{tr('حجز مسبق', 'Pre-Order')}</span>}
              {Number(p.stock_quantity) === 1 && <span className="badge badge--preorder">{tr('آخر قطعة', 'Last piece')}</span>}
            </>
          )}
          {discount > 0 ? (
            <span className="badge">{isRtl ? `خصم ${discount}%` : `${discount}% OFF`}</span>
          ) : (
            badge && !(isPreorder && PREORDER_BADGE.test(String(badge))) && <span className="badge">{badge}</span>
          )}
          {p.is_fragile ? <span className="badge badge--preorder">{tr('قابل للكسر', 'Fragile')}</span> : null}
        </div>

        <button
          type="button"
          className={`button button--icon wishlist-button${inWishlist ? ' is-saved' : ''}`}
          data-wishlist-id={p.id}
          aria-pressed={inWishlist}
          onClick={(e) => {
            e.stopPropagation();
            toggle.mutate(p.id);
          }}
          title={wishTitle}
          aria-label={`${wishTitle}: ${name}`}
        >
          <Icon name="heart" size={18} />
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-meta">
          {category !== '' && <span>{category}</span>}
          <span>{weight}</span>
        </div>
        <div className="product-card-title">
          <h3>
            <Link href={href}>{name}</Link>
          </h3>
          {rating > 0 && <StarRating value={rating} label={ratingLabel(rating, Number(p.rating_count || 0), isRtl)} />}
        </div>
        <div className="product-price">
          <span>{money(price)}</span>
          {old ? <del>{money(old)}</del> : null}
        </div>
        {isOutOfStock ? (
          <button type="button" className="button button--primary add-to-cart" disabled>
            <span>{tr('غير متوفر', 'Unavailable')}</span>
            <Icon name="shopping-bag" size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="button button--primary add-to-cart"
            disabled={add.isPending}
            onClick={() => add.mutate({ productId: p.id, variantId: null, quantity: 1 })}
          >
            <span>{isPreorder ? tr('احجز مسبقًا', 'Pre-order') : tr('أضف للسلة', 'Add to cart')}</span>
            <Icon name="shopping-bag" size={18} />
          </button>
        )}
      </div>
    </article>
  );
}
