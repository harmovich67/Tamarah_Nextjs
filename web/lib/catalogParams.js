const first = (v) => (Array.isArray(v) ? v[0] : v);
const num = (v) => {
  const n = Number(first(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Normalize the /catalog query string exactly like CatalogController::catalog(). */
export function parseCatalogParams(sp) {
  const rawAvail = sp.availability ?? sp['availability[]'] ?? [];
  const availability = (Array.isArray(rawAvail) ? rawAvail : [rawAvail]).filter((a) => ['available', 'preorder', 'out_of_stock'].includes(a));
  const sort = first(sp.sort);
  return {
    cat: first(sp.cat) || undefined,
    filter: first(sp.filter) === 'preorder' ? 'preorder' : undefined,
    search: String(first(sp.search) || '').trim() || undefined,
    sort: ['featured', 'bestseller', 'rating', 'price_desc', 'price_asc'].includes(sort) ? sort : 'featured',
    price_min: num(sp.price_min),
    price_max: num(sp.price_max),
    availability,
  };
}
