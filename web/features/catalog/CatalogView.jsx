'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@tamrna/shared/components/Icon';
import { pickLang } from '@tamrna/shared/utils';
import { CATALOG_SORTS, AVAILABILITY_FILTERS } from '@tamrna/shared/constants';
import { safeStorage } from '@tamrna/shared/api';
import { useLocale } from '@/components/LocaleProvider';
import ProductCard from '@/components/product/ProductCard';
import { asset } from '@/lib/asset';

const VIEW_KEY = 'tamrna_catalog_view';

/** Build the /catalog URL for a set of filter params (empty values are dropped). */
export function catalogHref(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else q.append(k, String(v));
  });
  const s = q.toString();
  return `/catalog${s ? `?${s}` : ''}`;
}

/**
 * Catalog listing (resources/views/storefront/catalog.php). Every filter lives in the URL (cat, filter, search,
 * sort, price_min, price_max, availability) so results are shareable and server-rendered; this component only
 * edits the URL.
 */
export default function CatalogView({ products, categories, bounds, params }) {
  const { locale, isRtl, tr } = useLocale();
  const router = useRouter();
  const { cat, filter, search, sort, price_min: priceMin, price_max: priceMax, availability } = params;
  const filterPreorder = filter === 'preorder';

  const activeCategory = categories.find((c) => cat && (cat === c.slug || String(cat) === String(c.id))) || null;

  let heroTitle;
  let heroText;
  let resultsTitle;
  if (filterPreorder) {
    heroTitle = tr('تشكيلة الحجز المسبق للحصاد', 'Harvest Pre-Orders Collection');
    heroText = tr('احجز حصتك من أجود حصاد الموسم قبل وصوله.', 'Reserve your share of the season’s finest harvest before it arrives.');
    resultsTitle = heroTitle;
  } else if (activeCategory) {
    heroTitle = pickLang(activeCategory, 'name', locale);
    heroText = pickLang(activeCategory, 'description', locale) || tr('تصفح تشكيلة هذا القسم من التمور الفاخرة.', 'Browse this collection of luxury dates.');
    resultsTitle = heroTitle;
  } else {
    heroTitle = tr('اكتشف أقسامنا', 'Discover our categories');
    heroText = tr('مجموعة مختارة من أجود أنواع التمور السعودية لكل الأذواق والمناسبات.', 'A curated selection of the finest Saudi dates for every taste and occasion.');
    resultsTitle = tr('جميع المنتجات', 'All products');
  }
  if (search) resultsTitle = `${tr('نتائج البحث: ', 'Search results: ')}${search}`;

  const sortOptions = {
    featured: tr('مقترحاتنا', 'Recommended'),
    bestseller: tr('الأكثر مبيعًا', 'Best sellers'),
    rating: tr('الأعلى تقييمًا', 'Top rated'),
    price_desc: tr('السعر: من الأعلى إلى الأقل', 'Price: high to low'),
    price_asc: tr('السعر: من الأقل إلى الأعلى', 'Price: low to high'),
  };
  const availabilityOptions = {
    available: tr('متوفر', 'In stock'),
    preorder: tr('حجز مسبق', 'Pre-order'),
    out_of_stock: tr('غير متوفر', 'Out of stock'),
  };

  const sliderMin = Math.max(0, bounds.min);
  const sliderMax = Math.max(sliderMin + 1, bounds.max);
  const hasFilters = priceMin != null || priceMax != null || availability.length > 0 || sort !== 'featured' || !!search;

  const base = useMemo(() => ({ cat, filter: filterPreorder ? 'preorder' : undefined, search, sort: sort !== 'featured' ? sort : undefined, price_min: priceMin, price_max: priceMax, availability }), [cat, filterPreorder, search, sort, priceMin, priceMax, availability]);
  const go = (patch) => router.push(catalogHref({ ...base, ...patch }), { scroll: false });
  const catUrl = (slug) => catalogHref({ filter: filterPreorder ? 'preorder' : undefined, cat: slug || undefined });

  // price inputs keep local state so typing is smooth; URL updates on change / after a pause (range slider)
  const [minVal, setMinVal] = useState(priceMin ?? '');
  const [maxVal, setMaxVal] = useState(priceMax ?? '');
  const [range, setRange] = useState(priceMax ?? sliderMax);
  useEffect(() => {
    setMinVal(priceMin ?? '');
    setMaxVal(priceMax ?? '');
    setRange(priceMax ?? sliderMax);
  }, [priceMin, priceMax, sliderMax]);
  const rangeTimer = useRef(null);

  const [view, setView] = useState('grid');
  useEffect(() => {
    const saved = safeStorage.get(VIEW_KEY);
    if (saved === 'list' || saved === 'grid') setView(saved);
  }, []);
  const chooseView = (v) => {
    setView(v);
    safeStorage.set(VIEW_KEY, v);
  };

  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = panelOpen ? 'hidden' : '';
    if (!panelOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPanelOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [panelOpen]);

  const toggleAvailability = (val) => go({ availability: availability.includes(val) ? availability.filter((a) => a !== val) : [...availability, val] });

  return (
    <div className="category-listing-page">
      <section className="category-listing-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(activeCategory?.image || 'assets/images/home/hero.webp')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <div className="category-listing-hero-shade" />
        <div className="container category-listing-hero-copy">
          <span>{tr('أصالة في كل قضمة', 'Authenticity in every bite')}</span>
          <h1>{heroTitle}</h1>
          <p>{heroText}</p>
        </div>
      </section>

      <nav className="container category-tabs" aria-label={tr('أقسام المنتجات', 'Product categories')}>
        <Link href={catUrl(null)} className={!cat ? 'is-active' : ''} aria-current={!cat ? 'page' : undefined}>
          <Icon name="layout-grid" size={26} stroke={1.6} />
          <span>{tr('جميع المنتجات', 'All products')}</span>
        </Link>
        {categories.map((c) => {
          const active = cat && (cat === c.slug || String(cat) === String(c.id));
          return (
            <Link key={c.id} href={catUrl(c.slug)} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
              <span className="category-tab-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(c.image || 'assets/images/home/ajwa.webp')} alt="" loading="lazy" />
              </span>
              <span>{pickLang(c, 'name', locale)}</span>
            </Link>
          );
        })}
      </nav>

      <section className="container category-listing-layout">
        <aside className={`category-filter-panel${panelOpen ? ' is-open' : ''}`} id="catalog-filters" aria-labelledby="category-filter-title">
          <div className="category-filter-heading">
            <Icon name="sliders-horizontal" size={20} />
            <h2 id="category-filter-title">{tr('تصفية النتائج', 'Filter results')}</h2>
            <button type="button" className="button button--icon catalog-filter-close" id="catalog-filter-close" onClick={() => setPanelOpen(false)} aria-label={tr('إغلاق', 'Close')}>
              <Icon name="x" size={18} />
            </button>
          </div>
          <form className="category-filter-controls" id="catalog-filter-form" onSubmit={(e) => e.preventDefault()}>
            <section className="category-filter-section category-filter-sort">
              <fieldset className="radio-group">
                <legend>{tr('ظهور حسب', 'Sort by')}</legend>
                {CATALOG_SORTS.map((val) => (
                  <label className="choice" key={val}>
                    <input type="radio" name="sort" value={val} checked={sort === val} onChange={() => go({ sort: val === 'featured' ? undefined : val })} />
                    {sortOptions[val]}
                  </label>
                ))}
              </fieldset>
            </section>

            <section className="category-filter-section">
              <h3>{tr('السعر (ر.س)', 'Price (SAR)')}</h3>
              <input
                className="category-price-range"
                id="price-range"
                type="range"
                min={sliderMin}
                max={sliderMax}
                value={Math.min(sliderMax, Number(range))}
                aria-label={tr('إلى', 'To')}
                onChange={(e) => {
                  setRange(e.target.value);
                  setMaxVal(e.target.value);
                  clearTimeout(rangeTimer.current);
                  rangeTimer.current = setTimeout(() => go({ price_max: e.target.value }), 700);
                }}
              />
              <div className="category-price-inputs">
                <label htmlFor="price-min">
                  <span>{tr('من', 'From')}</span>
                  <input id="price-min" type="number" min="0" step="1" name="price_min" className="input" value={minVal} placeholder={sliderMin} onChange={(e) => setMinVal(e.target.value)} onBlur={() => String(minVal) !== String(priceMin ?? '') && go({ price_min: minVal })} onKeyDown={(e) => e.key === 'Enter' && go({ price_min: minVal })} />
                </label>
                <label htmlFor="price-max">
                  <span>{tr('إلى', 'To')}</span>
                  <input id="price-max" type="number" min="0" step="1" name="price_max" className="input" value={maxVal} placeholder={sliderMax} onChange={(e) => setMaxVal(e.target.value)} onBlur={() => String(maxVal) !== String(priceMax ?? '') && go({ price_max: maxVal })} onKeyDown={(e) => e.key === 'Enter' && go({ price_max: maxVal })} />
                </label>
              </div>
            </section>

            <section className="category-filter-section">
              <h3>{tr('توفر المنتج', 'Availability')}</h3>
              <div className="category-filter-options">
                {AVAILABILITY_FILTERS.map((val) => (
                  <label className="choice" htmlFor={`av-${val}`} key={val}>
                    <input id={`av-${val}`} type="checkbox" name="availability" value={val} checked={availability.includes(val)} onChange={() => toggleAvailability(val)} />
                    <span>{availabilityOptions[val]}</span>
                  </label>
                ))}
              </div>
            </section>

            <Link href={catUrl(cat || null)} className={`button button--outline category-filter-reset${hasFilters ? '' : ' is-idle'}`}>
              <Icon name="rotate-ccw" size={16} />
              {tr('إعادة ضبط الفلاتر', 'Reset filters')}
            </Link>
          </form>
        </aside>

        <div className="category-results">
          <div className="category-results-heading">
            <div>
              <span>
                {products.length} {tr('منتج', 'products')}
              </span>
              <h2>{resultsTitle}</h2>
              <p>{tr('استكشف جميع منتجات تمرنا المختارة للضيافة والإهداء.', 'Explore Tamrna’s selection for hospitality and gifting.')}</p>
            </div>
            <div className="category-results-actions">
              <button type="button" className="button button--outline category-mobile-filter" id="catalog-filter-toggle" onClick={() => setPanelOpen(true)}>
                <Icon name="sliders-horizontal" size={18} />
                {tr('الفلاتر', 'Filters')}
              </button>
              <label>
                <span className="sr-only">{tr('ترتيب المنتجات', 'Sort products')}</span>
                <select className="input select" id="catalog-sort-select" aria-label={tr('ترتيب المنتجات', 'Sort products')} value={sort} onChange={(e) => go({ sort: e.target.value === 'featured' ? undefined : e.target.value })}>
                  {Object.entries(sortOptions).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="category-view-toggle" role="group" aria-label={tr('طريقة العرض', 'View mode')}>
                <button type="button" className={`button button--icon${view === 'grid' ? ' is-active' : ''}`} aria-pressed={view === 'grid'} aria-label={tr('عرض شبكي', 'Grid view')} onClick={() => chooseView('grid')}>
                  <Icon name="grid2x2" size={18} />
                </button>
                <button type="button" className={`button button--icon${view === 'list' ? ' is-active' : ''}`} aria-pressed={view === 'list'} aria-label={tr('عرض قائمة', 'List view')} onClick={() => chooseView('list')}>
                  <Icon name="list" size={18} />
                </button>
              </div>
            </div>
          </div>

          {products.length ? (
            <div className={`product-grid category-products category-products--${view}`} id="catalog-products">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="catalog-empty">
              <Icon name="search" size={40} stroke={1.4} />
              <h3>{tr('لا توجد أصناف تطابق معايير البحث الحالية', 'No products matched your search')}</h3>
              <p>{tr('جرّب إزالة بعض الفلاتر أو تصفح كافة الأقسام لاكتشاف تشكيلتنا.', 'Try removing some filters or browse all categories to discover our selection.')}</p>
              <Link href="/catalog" className="button button--primary" style={{ marginTop: '1rem' }}>
                {tr('عرض كافة التمور', 'View all dates')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
