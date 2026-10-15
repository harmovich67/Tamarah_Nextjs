'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@tamrna/shared/components/Icon';
import { initialsOf, pickLang } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';

/** Customer reviews carousel (scroll-snap track + pager dots), port of the inline script in home.php. */
export default function ReviewsSlider({ reviews, title }) {
  const { locale, isRtl, tr } = useLocale();
  const track = useRef(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const perView = useCallback(() => {
    const el = track.current;
    const first = el?.children[0];
    return el && first ? Math.max(1, Math.round(el.clientWidth / first.offsetWidth)) : 1;
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el || !el.children.length) return;
    const first = el.children[0];
    const per = perView();
    setPages(Math.max(1, Math.ceil(el.children.length / per)));
    setPage(Math.round(Math.abs(el.scrollLeft) / ((first.offsetWidth + 22) * per)));
  }, [perView]);

  useEffect(() => {
    measure();
    const el = track.current;
    let t;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(measure, 80);
    };
    el?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      el?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const go = (target) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(pages - 1, target));
    const card = el.children[next * perView()];
    if (!card) return;
    const offset = Math.abs(card.offsetLeft - el.children[0].offsetLeft);
    el.scrollTo({ left: isRtl ? -offset : offset, behavior: 'smooth' });
  };

  return (
    <div className="home-review-slider" role="group" aria-roledescription={tr('شريط آراء', 'reviews carousel')} aria-label={title}>
      <ul className="home-review-track" id="home-review-track" ref={track}>
        {reviews.map((rev, i) => {
          const rating = Math.max(0, Math.min(5, Number(rev.rating ?? 5)));
          const comment = pickLang(rev, 'comment', locale, rev.comment || '');
          const name = pickLang(rev, 'name', locale, rev.name || '');
          const city = pickLang(rev, 'city', locale, rev.city || '');
          return (
            <li className="review-card" key={`${name}-${i}`}>
              <Icon name="quote" size={30} className="review-mark" stroke={1.4} />
              <p className="review-rating">
                <span className="sr-only">{isRtl ? `التقييم ${rating} من 5` : `Rated ${rating} out of 5`}</span>
                {Array.from({ length: 5 }, (_, s) => (
                  <Icon key={s} name="star" size={16} stroke={1.4} filled={s < rating} />
                ))}
              </p>
              <blockquote>{comment}</blockquote>
              <footer>
                <span className="review-avatar" aria-hidden="true">{initialsOf(name)}</span>
                <span>
                  <strong>{name}</strong>
                  {city ? <small>{city}</small> : null}
                </span>
              </footer>
            </li>
          );
        })}
      </ul>
      <div className="review-pager" style={{ display: pages > 1 ? '' : 'none' }}>
        <button type="button" className="button button--icon" onClick={() => go(page - 1)} aria-label={tr('الآراء السابقة', 'Previous reviews')}>
          <Icon name={isRtl ? 'chevron-right' : 'chevron-left'} size={18} />
        </button>
        <div className="review-dots" id="home-review-dots">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className="review-dot"
              aria-current={i === page ? 'true' : undefined}
              aria-label={`${isRtl ? 'الانتقال إلى الرأي ' : 'Go to review '}${i + 1}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" className="button button--icon" onClick={() => go(page + 1)} aria-label={tr('الآراء التالية', 'Next reviews')}>
          <Icon name={isRtl ? 'chevron-left' : 'chevron-right'} size={18} />
        </button>
      </div>
    </div>
  );
}
