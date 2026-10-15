import { Icon } from '@tamrna/shared/components/Icon';

/** Fractional star row (`.product-rating-stars`): the CSS clips the filled row to `--rating-fill`. */
export function StarRow({ size = 15, count = 5 }) {
  return (
    <span className="product-rating-stars-row">
      {Array.from({ length: count }, (_, i) => (
        <Icon key={i} name="star" size={size} stroke={1.4} filled />
      ))}
    </span>
  );
}

/**
 * @param {object} props
 * @param {number} props.value        0-5
 * @param {string} props.label       accessible label (screen readers + title)
 * @param {number} [props.size]
 * @param {boolean} [props.showValue] print the numeric rating (product page)
 */
export default function StarRating({ value, label, size = 15, showValue = false }) {
  const fill = Math.min(100, Math.round((value / 5) * 100));
  return (
    <span className="product-rating" title={label}>
      <span className="product-rating-stars" style={{ '--rating-fill': `${fill}%` }} aria-hidden="true">
        <StarRow size={size} />
        <span className="product-rating-stars-clip">
          <StarRow size={size} />
        </span>
      </span>
      {showValue && <span>{value.toFixed(1)}</span>}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** "Rated 4.9 out of 5, based on 158 reviews" in the active language. */
export function ratingLabel(value, count, isRtl) {
  const v = Number(value || 0).toFixed(1);
  return isRtl
    ? `التقييم ${v} من 5${count ? `، بناءً على ${count} تقييم` : ''}`
    : `Rated ${v} out of 5${count ? `, based on ${count} reviews` : ''}`;
}
