'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scroll-reveal animations (port of initReveal() in assets/js/tumurna.js). The CSS in foundation-ext.css hides
 * `.reveal:not(.is-revealed)` while `html.js-reveal` is present. Honors prefers-reduced-motion.
 */
const REVEALS = [
  ['.benefit-strip li', 22, 0.08],
  ['.section-title', 26, 0],
  ['.promo-banner .promo-copy > *', 22, 0.09],
  ['.category-collection .category-card', 30, 0.09],
  ['.home-section-action', 18, 0],
  ['.home-product-grid .product-card', 34, 0.1],
  ['.home-feature-card', 26, 0.1],
  ['.home-review-card', 26, 0.1],
  ['.home-newsletter-box', 24, 0],
  ['.home-custom-section', 24, 0],
  ['.product-grid .product-card', 28, 0.07],
  ['.product-related-heading', 18, 0],
  ['.category-results-heading', 18, 0],
  ['.category-filter-panel', 24, 0],
  ['.commerce-heading', 20, 0],
  ['.cart-page-items', 22, 0],
  ['.commerce-summary', 22, 0],
  ['.checkout-card', 24, 0.08],
  ['.contact-channels, .contact-form', 28, 0.1],
  ['.about-story-copy', 24, 0],
  ['.about-story-media', 24, 0],
  ['.about-stats article', 20, 0.08],
  ['.about-values-grid article', 24, 0.1],
  ['.about-farms article', 24, 0],
  ['.about-sustainability article', 24, 0],
  ['.about-sustainability-media', 24, 0],
  ['.about-gift article > *', 20, 0.08],
  ['.gift-purchase-card', 24, 0],
  ['.gift-preview-col', 24, 0],
  ['.gift-benefits > div', 20, 0.08],
  ['.legal-hero, .legal-sections section', 22, 0.08],
  ['.account-card, .account-summary-card', 22, 0.07],
  ['.account-order-card', 22, 0.06],
  ['.account-address-grid article', 22, 0.06],
  ['.account-gate', 24, 0],
  ['.product-detail-info > *', 16, 0.05],
  ['.product-gallery', 24, 0],
  ['.catalog-empty', 20, 0],
];

export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    root.classList.add(reduceMotion ? 'no-motion' : 'js-reveal');
    if (reduceMotion) return undefined;

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              io.unobserve(entry.target);
            }
          }),
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
    }

    const scan = () => {
      REVEALS.forEach(([selector, y, step]) => {
        document.querySelectorAll(selector).forEach((el, i) => {
          if (!el.classList.contains('reveal')) {
            el.classList.add('reveal');
            el.style.setProperty('--reveal-y', `${y}px`);
            el.style.setProperty('--reveal-delay', `${(Math.min(i, 8) * step).toFixed(2)}s`);
          }
          // Already-tagged nodes must be re-observed: this effect re-runs (route change, StrictMode) with a fresh observer.
          if (el.classList.contains('is-revealed')) return;
          if (io) io.observe(el);
          else el.classList.add('is-revealed');
        });
      });
    };

    // Content is client-rendered too (cart, account), so keep picking up new nodes.
    scan();
    let timer;
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 60);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      clearTimeout(timer);
      io?.disconnect();
    };
  }, [pathname]);

  return null;
}
