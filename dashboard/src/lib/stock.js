/**
 * Stock of a regular (non-box) product on the Tamrna backend is a WEIGHT in grams, not a count: every sale takes the pack
 * weight off it (checked on the live server: 500 -> 250 after one 250 g pack, 5000 -> 4000 after two 500 g packs), and the
 * checkout refuses a pack heavier than what is left ("Available: 0"). So "100" means 100 g, which is not even one 500 g pack.
 */
const GRAMS = { g: 1, kg: 1000, t: 1_000_000 };

/** Pack weight in grams (`250`, `kg` -> 250000); null when the weight is missing. */
export function gramsOf(weight, unit = 'g') {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  return w * (GRAMS[unit] ?? 1);
}

/** How many whole packs of this weight the stock (grams) still covers; null when either is unknown. */
export function packsFromGrams(stockGrams, weight, unit) {
  const per = gramsOf(weight, unit);
  const stock = Number(stockGrams);
  if (per === null || stockGrams === null || stockGrams === undefined || stockGrams === '' || !Number.isFinite(stock)) return null;
  return Math.max(0, Math.floor(stock / per));
}

/** "4000" -> "4 كجم" / "750" -> "750 جرام". */
export function gramsLabel(grams, tr) {
  const g = Number(grams) || 0;
  return g >= 1000 ? `${+(g / 1000).toFixed(2)} ${tr('كجم', 'kg')}` : `${g} ${tr('جرام', 'g')}`;
}

/**
 * The form asks for the stock as a number of PACKS of the default (first) pack and the backend keeps grams: this is the
 * conversion both ways (null when the pack weight is missing, so the caller can fall back to the number as typed).
 */
export function packsToGrams(packs, weight, unit) {
  const per = gramsOf(weight, unit);
  const n = Number(packs);
  return per === null || !Number.isFinite(n) ? null : Math.round(n * per);
}

/** Grams -> packs of that weight, two decimals at most (750 g of 500 g packs is 1.5). */
export function gramsToPacks(grams, weight, unit) {
  const per = gramsOf(weight, unit);
  const g = Number(grams);
  return per === null || grams === null || grams === undefined || grams === '' || !Number.isFinite(g) ? null : Math.round((g / per) * 100) / 100;
}
