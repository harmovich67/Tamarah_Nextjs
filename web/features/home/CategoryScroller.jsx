'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { pickLang } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { asset } from '@/lib/asset';

/** Category cards with the scroll arrows used on narrow screens (`data-cat-scroll` in the PHP view). */
export default function CategoryScroller({ categories }) {
  const { locale, isRtl, tr } = useLocale();
  const scroller = useRef(null);
  const [atStart, setAtStart] = useState(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const onScroll = () => setAtStart(Math.abs(el.scrollLeft) < 1);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const step = (dir) => {
    const el = scroller.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = Math.max(0, Math.min(max, Math.abs(el.scrollLeft) + dir * el.clientWidth * 0.75));
    el.scrollTo({ left: isRtl ? -next : next, behavior: 'smooth' });
  };

  return (
    <div className="category-collection">
      <div className="home-categories" ref={scroller}>
        {categories.map((cat) => {
          const name = pickLang(cat, 'name', locale);
          return (
            <Link className="category-card category-card--portrait" href={`/catalog?cat=${cat.slug}`} key={cat.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* A picture the server refuses (403 / 404) falls back to the default one instead of a broken icon. */}
              <img
                src={asset(cat.image || 'assets/images/home/ajwa.webp')}
                alt={name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = asset('assets/images/home/ajwa.webp');
                }}
              />
              <div>
                <span>
                  <h3>{name}</h3>
                  <span className="category-count">
                    {Number(cat.count || 0)} {tr('منتج', 'items')}
                  </span>
                </span>
                <Icon name="arrow-left" size={23} className="directional-arrow" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="category-scroll-controls">
        <button type="button" className="button button--icon" disabled={atStart} onClick={() => step(-1)} aria-label={tr('الأقسام السابقة', 'Previous categories')}>
          <Icon name={isRtl ? 'chevron-right' : 'chevron-left'} size={24} />
        </button>
        <button type="button" className="button button--icon" onClick={() => step(1)} aria-label={tr('الأقسام التالية', 'Next categories')}>
          <Icon name={isRtl ? 'chevron-left' : 'chevron-right'} size={24} />
        </button>
      </div>
    </div>
  );
}
