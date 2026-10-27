/**
 * Orders this browser has reviewed. The backend takes one review per order (a second one is refused) but has no endpoint that tells
 * the customer which orders they already reviewed, so after a refresh the form would come back. The review is kept here, per order
 * number, and shown instead of the form. `rate: null` means "reviewed, details unknown" (the backend refused a second review).
 */
const KEY = 'tamrna.web.order-reviews';

const read = () => {
  try {
    return typeof window === 'undefined' ? {} : JSON.parse(window.localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

/** @returns {{ rate: number|null, comment: string } | null} */
export const getOrderReview = (orderNumber) => read()[String(orderNumber)] ?? null;

export function rememberOrderReview(orderNumber, review) {
  try {
    const all = read();
    all[String(orderNumber)] = { rate: review.rate ?? null, comment: review.comment || '' };
    const keep = Object.keys(all).slice(-200);
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep.map((k) => [k, all[k]]))));
  } catch {
    /* private mode: the form may come back after a refresh; the backend still refuses a second review */
  }
}
