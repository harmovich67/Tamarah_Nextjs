import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { cx } from './classes';

/** Underlined / pill tabs with arrow-key navigation. */
export function Tabs({ tabs, value, onChange, className }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    const sign = document.documentElement.dir === 'rtl' ? -1 : 1;
    const next = (i + dir * sign + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].key);
  };

  return (
    <div role="tablist" className={cx('flex flex-wrap gap-2', className)}>
      {tabs.map((t, i) => (
        <button
          key={t.key}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          type="button"
          aria-selected={value === t.key}
          tabIndex={value === t.key ? 0 : -1}
          onKeyDown={(e) => onKey(e, i)}
          onClick={() => onChange(t.key)}
          className={cx(
            'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 inline-flex items-center gap-2 border select-none',
            value === t.key
              ? 'bg-[#0f764a] text-white border-[#0f764a] shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs',
          )}
        >
          {t.icon ? <Icon name={t.icon} className="w-3.5 h-3.5" /> : null}
          <span>{t.label}</span>
          {typeof t.count === 'number' ? (
            <span
              className={cx(
                'px-1.5 py-0.2 rounded-md text-[10px] font-bold',
                value === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {t.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Small dropdown menu (row actions). Closes on outside click / Escape. */
export function Dropdown({ trigger, items, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => !root.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={root}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {trigger}
      </button>
      {open && (
        <ul
          role="menu"
          className={cx(
            'absolute z-30 mt-2 min-w-44 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl animate-fadeIn',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {items.filter(Boolean).map((it) => (
            <li key={it.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); it.onClick?.(); }}
                className={cx(
                  'w-full text-start flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                  it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {it.icon ? <Icon name={it.icon} className="w-3.5 h-3.5" /> : null}
                <span>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
