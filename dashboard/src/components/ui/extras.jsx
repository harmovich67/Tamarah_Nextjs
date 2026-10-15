import { Icon } from './Icon';
import { cx } from './classes';

/** Small KPI card used by list pages (icon tile + label + value). */
export function StatCard({
  icon,
  label,
  value,
  tone = 'bg-emerald-50/70 text-[#0f764a] border-emerald-200/60',
  valueClass = 'text-xl sm:text-2xl font-bold text-slate-900 tracking-tight',
}) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center gap-4">
      <div className={cx('w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs', tone)}>
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold text-slate-500 block mb-0.5">{label}</span>
        <span className={cx('block leading-none', valueClass)}>{value}</span>
      </div>
    </div>
  );
}

/** Active / stopped pill that toggles a record (optimistic-friendly, disabled while pending). */
export function StatusToggle({ active, onToggle, pending, activeLabel, inactiveLabel }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={!!active}
      className={cx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 border select-none disabled:opacity-50 disabled:cursor-not-allowed',
        active
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100 shadow-2xs'
          : 'bg-slate-100 text-slate-600 border-slate-200/70 hover:bg-slate-200',
      )}
    >
      <span className={cx('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
      <span>{active ? activeLabel : inactiveLabel}</span>
    </button>
  );
}

/** Round icon-only row action. */
export function IconAction({ icon, label, onClick, tone = 'default', href, ...rest }) {
  const cls = cx(
    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 shadow-2xs',
    tone === 'danger'
      ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/60'
      : 'bg-slate-100/80 hover:bg-emerald-50 text-slate-600 hover:text-[#0f764a] border border-slate-200/50 hover:border-emerald-200',
  );
  return href ? (
    <a href={href} className={cls} title={label} aria-label={label} {...rest}>
      <Icon name={icon} className="w-4 h-4" />
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} title={label} aria-label={label} {...rest}>
      <Icon name={icon} className="w-4 h-4" />
    </button>
  );
}
