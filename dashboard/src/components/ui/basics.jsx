import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { ALERT, BADGE, BTN, CARD, H1, HEADER_CARD, SUBTITLE, cx } from './classes';

/** Page heading card with an optional action button / link. */
export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cx(HEADER_CARD, className)}>
      <div>
        <h1 className={H1}>{title}</h1>
        {subtitle ? <p className={SUBTITLE}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2.5 flex-wrap">{actions}</div> : null}
    </div>
  );
}

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx(CARD, className)} {...rest}>
      {children}
    </div>
  );
}

/** Section heading inside a form card. */
export function SectionHeading({ icon, children, action }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        {icon ? (
          <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#0f764a] flex items-center justify-center">
            <Icon name={icon} className="w-3.5 h-3.5" />
          </span>
        ) : null}
        <span>{children}</span>
      </h3>
      {action}
    </div>
  );
}

/** Feedback banner (success | warning | error | info). */
export function Alert({ type = 'info', icon, children, className }) {
  const iconName = icon || { success: 'check-circle', warning: 'alert-triangle', error: 'alert-circle', info: 'info' }[type];
  const iconColor = { success: 'text-emerald-600', warning: 'text-amber-600', error: 'text-rose-600', info: 'text-sky-600' }[type];
  return (
    <div className={cx(ALERT[type], className)} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={iconName} className={cx('w-4 h-4 shrink-0', iconColor)} />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

export function Badge({ tone = 'stone', className, children, dot = true }) {
  return (
    <span className={cx(BADGE[tone] || BADGE.stone, className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

export function Button({ variant = 'primary', icon, loading, className, children, type = 'button', ...rest }) {
  return (
    <button type={type} className={cx(BTN[variant], className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Icon name="loader-2" className="w-4 h-4 animate-spin" /> : icon ? <Icon name={icon} className="w-4 h-4" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', icon, className, children, ...rest }) {
  return (
    <Link to={to} className={cx(BTN[variant], className)} {...rest}>
      {icon ? <Icon name={icon} className="w-4 h-4" /> : null}
      {children}
    </Link>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-xl bg-slate-200/80', className)} />;
}

/** Table-shaped loading skeleton. */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="p-5 space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, text, action, className }) {
  return (
    <div className={cx('text-center py-14 px-4 text-slate-400', className)}>
      <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100/90 text-slate-400 flex items-center justify-center mb-3.5 shadow-2xs">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {text ? <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{text}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, text, onRetry, retryLabel }) {
  return (
    <div className={cx(CARD, 'p-10 text-center space-y-3.5')} role="alert">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-2xs">
        <Icon name="alert-triangle" className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {text ? <p className="text-xs text-slate-500 max-w-sm mx-auto">{text}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className={cx(BTN.secondary, 'mx-auto mt-2')}>
          <Icon name="refresh-cw" className="w-4 h-4" />
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

/** Full-page loading placeholder used while a route chunk or its first query loads. */
export function PageLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.to ? (
            <Link to={it.to} className="hover:text-[#0f764a] transition-colors">
              {it.label}
            </Link>
          ) : (
            <span className="text-slate-800">{it.label}</span>
          )}
          {i < items.length - 1 ? <span className="text-slate-300" aria-hidden="true">/</span> : null}
        </span>
      ))}
    </nav>
  );
}

export function Tooltip({ label, children }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span role="tooltip" className="pointer-events-none absolute z-30 -top-8 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition shadow-sm">
        {label}
      </span>
    </span>
  );
}
