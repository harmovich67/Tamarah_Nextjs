/**
 * The most of a pack the backend will sell, as learned from the cart (services/adapters/tamrna: the stock guard). The public
 * product answer carries no stock, so this is what lets the product page and the cart say "last piece" / "out of stock".
 * Kept in this browser for ten minutes; the storage is read in the browser only (the server renders without it).
 */
const KEY = 'tamrna.web.stock-hints';
const TTL = 10 * 60_000;
export const STOCK_HINTS_EVENT = 'tamrna:stock-hints';

const read = () => {
  try {
    return typeof window === 'undefined' ? {} : JSON.parse(window.sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

/** Most of this pack the backend will sell, as last learned; null when unknown. */
export function stockHint(variantId) {
  const hit = read()[String(variantId)];
  return hit && Date.now() - hit.at < TTL ? hit.max : null;
}

export function rememberStock(variantId, max) {
  try {
    const all = read();
    all[String(variantId)] = { max, at: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(STOCK_HINTS_EVENT));
  } catch {
    /* private mode: the check still runs on every add */
  }
}
