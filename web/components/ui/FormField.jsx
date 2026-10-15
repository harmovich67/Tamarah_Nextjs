import { Icon } from '@tamrna/shared/components/Icon';

/**
 * Foundation form field: `.form-field` wrapper, label with the required marker, optional hint and the inline
 * `.field-error` message (announced to screen readers through role="alert").
 */
export function FormField({ id, label, required = false, error, hint, className = '', children, labelHidden = false }) {
  return (
    <div className={`form-field ${className}`.trim()}>
      {label ? (
        <label htmlFor={id} className={labelHidden ? 'sr-only' : undefined}>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <span className="field-hint">{hint}</span> : null}
      {error ? (
        <span className="field-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** `.flash` banner (error | success | info). */
export function Flash({ type = 'info', icon, children, className = '' }) {
  const iconName = icon || (type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info');
  return (
    <div className={`flash flash--${type} ${className}`.trim()} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={iconName} size={20} />
      <div>{children}</div>
    </div>
  );
}
