'use client';

import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';

/** Skeleton shown while an async screen loads (never an empty page). */
export function LoadingState({ rows = 3, label }) {
  const { tr } = useLocale();
  return (
    <section className="commerce-page" aria-busy="true" aria-live="polite">
      <div className="container">
        <span className="sr-only">{label || tr('جارٍ التحميل…', 'Loading…')}</span>
        <div style={{ display: 'grid', gap: '1rem', maxWidth: '60rem', margin: '2rem auto' }}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="skeleton-block" style={{ height: i === 0 ? '4rem' : '7rem', borderRadius: '.75rem', background: 'linear-gradient(90deg,var(--color-sand-100),var(--color-cream-100),var(--color-sand-100))', backgroundSize: '200% 100%', animation: 'fnd-skeleton 1.4s linear infinite' }} />
          ))}
        </div>
      </div>
      <style>{'@keyframes fnd-skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}@media (prefers-reduced-motion:reduce){.skeleton-block{animation:none!important}}'}</style>
    </section>
  );
}

/** Friendly error state with an optional retry. */
export function ErrorState({ onRetry, message }) {
  const { tr } = useLocale();
  return (
    <section className="commerce-page error-page">
      <div className="container">
        <div className="account-gate error-card" role="alert">
          <span className="error-card-icon"><Icon name="shield-alert" size={48} stroke={1.4} /></span>
          <h1>{message || tr('تعذر تحميل البيانات', 'We could not load this page')}</h1>
          <p>{tr('تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.', 'Check your connection and try again.')}</p>
          <div className="error-card-actions">
            {onRetry && <button type="button" className="button button--primary" onClick={() => onRetry()}>{tr('إعادة المحاولة', 'Try again')}</button>}
            <Link href="/" className="button button--outline">{tr('العودة للرئيسية', 'Back to home')}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Empty state (`.account-gate`): icon, heading, text and an optional call to action. */
export function EmptyState({ icon = 'package', title, text, actionHref, actionLabel }) {
  return (
    <div className="account-gate">
      <Icon name={icon} size={48} stroke={1.4} />
      <h1>{title}</h1>
      {text ? <p>{text}</p> : null}
      {actionHref ? (
        <Link href={actionHref} className="button button--primary">
          {actionLabel}
          <Icon name="arrow-left" size={18} className="directional-arrow" />
        </Link>
      ) : null}
    </div>
  );
}
