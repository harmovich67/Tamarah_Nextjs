'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { pickLang } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { asset } from '@/lib/asset';

/**
 * CMS hero slider (port of initHeroSlider() in assets/js/tumurna.js): auto-advance every 6.5 s, pause on
 * hover/focus, swipe, dot + arrow navigation and a light parallax on scroll. Honors reduced motion.
 */
export default function HeroSlider({ banners }) {
  const { locale, isRtl, tr } = useLocale();
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sliderRef = useRef(null);
  const stageRef = useRef(null);
  const touchStart = useRef(null);
  const total = banners.length;

  useEffect(() => {
    setReduceMotion(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const show = useCallback(
    (index) => {
      if (!total) return;
      const next = (index + total) % total;
      setCurrent((prev) => {
        if (next === prev) return prev;
        setLeaving(prev);
        setTimeout(() => setLeaving(null), 1000);
        return next;
      });
    },
    [total],
  );

  useEffect(() => {
    if (total < 2 || reduceMotion || paused) return undefined;
    const timer = setInterval(() => show(current + 1), 6500);
    return () => clearInterval(timer);
  }, [total, reduceMotion, paused, current, show]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    let ticking = false;
    const update = () => {
      ticking = false;
      const slider = sliderRef.current;
      if (!slider || !stageRef.current) return;
      const progress = Math.min(Math.max(window.scrollY / (slider.offsetHeight || 1), 0), 1);
      stageRef.current.style.transform = `translate3d(0,${(progress * 4).toFixed(2)}%,0)`;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, [reduceMotion]);

  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 50) return;
    const forward = isRtl ? dx > 0 : dx < 0;
    show(current + (forward ? 1 : -1));
  };

  return (
    <section
      id="tumurna-hero-slider"
      ref={sliderRef}
      data-header-hero="true"
      className={`home-hero${total < 2 ? ' home-hero--single' : ''}`}
      aria-labelledby="home-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={onTouchEnd}
    >
      <div className="home-hero-slides" ref={stageRef}>
        {banners.map((banner, index) => {
          const title = pickLang(banner, 'title', locale);
          const subtitle = pickLang(banner, 'subtitle', locale);
          const badge = pickLang(banner, 'badge', locale);
          const cta = pickLang(banner, 'cta', locale, tr('تسوق الآن', 'Shop Now'));
          const cls = ['home-hero-slide', 'tumurna-hero-slide', index === current ? 'is-active' : '', index === leaving ? 'is-leaving' : ''].filter(Boolean).join(' ');
          return (
            <div className={cls} key={banner.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="home-hero-image" src={asset(banner.image || 'assets/images/home/hero.webp')} alt={title} loading={index === 0 ? undefined : 'lazy'} />
              <div className="home-hero-shade" />
              <div className="container hero-content">
                <div className="hero-copy">
                  {badge ? (
                    <span className="hero-slide-badge">
                      <Icon name="sparkles" size={14} />
                      {badge}
                    </span>
                  ) : null}
                  {index === 0 ? <h1 id="home-title">{title}</h1> : <h2 className="hero-h">{title}</h2>}
                  {subtitle ? <p className="hero-description">{subtitle}</p> : null}
                  <Link className="button button--secondary home-cta" href={banner.link || '/catalog'}>
                    {cta}
                    <Icon name="arrow-left" size={19} className="directional-arrow" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <a className="hero-story" href="#our-story">
        <span className="story-circle">
          <Icon name="arrow-up-right" size={24} />
        </span>
        <span>
          <strong>{tr('اكتشف الأصالة', 'Discover authenticity')}</strong>
          <span>{tr('رحلة التمر من أرضنا', 'The journey of dates from our land')}</span>
        </span>
      </a>

      <div className="home-hero-controls">
        <button type="button" className="button button--icon home-hero-nav tumurna-hero-prev" onClick={() => show(current - 1)} aria-label={tr('الشريحة السابقة', 'Previous Slide')}>
          <Icon name={isRtl ? 'chevron-right' : 'chevron-left'} size={20} />
        </button>
        {banners.map((banner, i) => (
          <button key={banner.id} type="button" className={`home-hero-dot tumurna-hero-dot${i === current ? ' is-active' : ''}`} onClick={() => show(i)} aria-label={i + 1} />
        ))}
        <button type="button" className="button button--icon home-hero-nav tumurna-hero-next" onClick={() => show(current + 1)} aria-label={tr('الشريحة التالية', 'Next Slide')}>
          <Icon name={isRtl ? 'chevron-left' : 'chevron-right'} size={20} />
        </button>
      </div>
    </section>
  );
}
