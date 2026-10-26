'use client';

/** True when the line already holds the most the backend can sell (learned from the cart: services/adapters/tamrna). */
export const atStockLimit = (item) => item.stock_limit !== null && item.stock_limit !== undefined && item.quantity >= item.stock_limit;

/** What to tell the customer who presses "+" on a line that already holds the most that can be sold. */
export const limitMessage = (item, tr) =>
  item.stock_limit === 1
    ? tr('هذه آخر قطعة متاحة وهي في سلتك بالفعل', 'This is the last piece and it is already in your cart')
    : tr(`وصلت للحد الأقصى المتاح (${item.stock_limit}) لهذا المنتج`, `You have the most available (${item.stock_limit}) of this item`);

/**
 * The stock message under a cart line (drawer and cart page):
 * - the backend flags the quantity as more than the stock -> "not available in this quantity" + a button that sets it to what is left;
 * - the line is at the most that can be sold -> "last piece" / "maximum available".
 */
export function StockNote({ item, tr, onFit, fitting }) {
  if (item.out_of_stock) {
    return (
      <p className="stock-note stock-note--error" role="alert">
        {tr('الكمية المطلوبة غير متوفرة بالكامل.', 'This quantity is not fully available.')}{' '}
        <button type="button" className="stock-note__action" onClick={onFit} disabled={fitting}>
          {tr('اضبطها على المتاح', 'Set to what is available')}
        </button>
      </p>
    );
  }
  if (atStockLimit(item)) {
    return (
      <p className="stock-note" role="status">
        {item.stock_limit === 1 ? tr('آخر قطعة متاحة', 'Last piece available') : tr(`وصلت للحد الأقصى المتاح (${item.stock_limit})`, `Maximum available (${item.stock_limit})`)}
      </p>
    );
  }
  return null;
}
