import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon';
import { BTN, cx } from './classes';
import { useT } from '@/hooks/useT';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: Escape + backdrop click close it, focus is trapped and restored, body scroll is
 * locked, and on phones it slides up as a bottom sheet.
 */
export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer, closeOnBackdrop = true }) {
  const { dir, tr } = useT();
  const panel = useRef(null);
  const previous = useRef(null);
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };

  const prevOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return undefined;
    }
    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;

    if (justOpened) {
      previous.current = document.activeElement;
    }
    document.body.style.overflow = 'hidden';

    let t;
    if (justOpened) {
      t = setTimeout(() => {
        // If focus is already inside the modal panel, do not steal it
        if (!panel.current?.contains(document.activeElement)) {
          // Prioritize form fields (textarea, input) over close 'X' button
          const formField = panel.current?.querySelector('textarea, input:not([disabled])');
          const target = formField || panel.current?.querySelector(FOCUSABLE);
          target?.focus();
        }
      }, 50);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
      if (e.key === 'Tab' && panel.current) {
        const nodes = [...panel.current.querySelectorAll(FOCUSABLE)];
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      if (t) clearTimeout(t);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (!open) {
        previous.current?.focus?.();
      }
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
          dir={dir}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden="true" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={cx('relative w-full bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200/80 shadow-2xl max-h-[92vh] flex flex-col', widths[size])}
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
                {subtitle ? <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                aria-label={tr('إغلاق', 'Close')}
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
            {footer ? (
              <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap bg-slate-50/50 rounded-b-2xl">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Confirmation dialog replacing window.confirm(). */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, tone = 'danger', loading }) {
  const { tr } = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title || tr('تأكيد الإجراء', 'Confirm action')}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN.secondary}>{tr('إلغاء', 'Cancel')}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={tone === 'danger' ? BTN.danger : BTN.primary}>
            {loading ? <Icon name="loader-2" className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel || tr('تأكيد', 'Confirm')}
          </button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <div className={cx('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs', tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-[#0f764a]')}>
          <Icon name={tone === 'danger' ? 'alert-triangle' : 'check-circle'} className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-700 leading-relaxed pt-1.5">{message}</p>
      </div>
    </Modal>
  );
}
