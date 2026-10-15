import { forwardRef, useId, useState } from 'react';
import { Icon } from './Icon';
import { INPUT, INPUT_SM, INPUT_LG, INPUT_INVALID, LABEL, cx } from './classes';

const INPUT_SIZES = {
  sm: INPUT_SM,
  md: INPUT,
  lg: INPUT_LG,
};

/** Label + control + hint + inline error. Works with React Hook Form `register()` spreads. */
export function Field({ label, required, error, hint, className, id, children }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={id} className={LABEL}>
          <span>{label}</span>
          {required ? <span className="text-rose-500 ms-1 font-bold" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 animate-fadeIn">
          <Icon name="alert-circle" className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef(function TextField({
  label,
  required,
  error,
  hint,
  size = 'md',
  className,
  inputClassName,
  prefix,
  suffix,
  type = 'text',
  ...rest
}, ref) {
  const auto = useId();
  const id = rest.id || auto;
  const sizeClass = INPUT_SIZES[size] || INPUT;

  const inputElement = (
    <input
      id={id}
      ref={ref}
      type={type}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cx(
        sizeClass,
        prefix && 'ps-10',
        suffix && 'pe-10',
        error && INPUT_INVALID,
        inputClassName,
      )}
      {...rest}
    />
  );

  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      {prefix || suffix ? (
        <div className="relative flex items-center">
          {prefix ? (
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
              {prefix}
            </div>
          ) : null}
          {inputElement}
          {suffix ? (
            <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400">
              {suffix}
            </div>
          ) : null}
        </div>
      ) : (
        inputElement
      )}
    </Field>
  );
});

export const TextAreaField = forwardRef(function TextAreaField({
  label,
  required,
  error,
  hint,
  size = 'md',
  className,
  inputClassName,
  rows = 3,
  ...rest
}, ref) {
  const auto = useId();
  const id = rest.id || auto;
  const sizeClass = size === 'sm' ? INPUT_SM : INPUT;

  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(sizeClass, 'resize-y min-h-[80px]', error && INPUT_INVALID, inputClassName)}
        {...rest}
      />
    </Field>
  );
});

export const SelectField = forwardRef(function SelectField({
  label,
  required,
  error,
  hint,
  size = 'md',
  className,
  inputClassName,
  children,
  ...rest
}, ref) {
  const auto = useId();
  const id = rest.id || auto;
  const sizeClass = INPUT_SIZES[size] || INPUT;

  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <select
        id={id}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(sizeClass, 'font-medium cursor-pointer', error && INPUT_INVALID, inputClassName)}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
});

export const CheckField = forwardRef(function CheckField({ label, hint, className, ...rest }, ref) {
  return (
    <label className={cx('flex items-start gap-2.5 text-slate-800 cursor-pointer select-none group', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 w-4 h-4 rounded text-[#0f764a] border-slate-300 focus:ring-2 focus:ring-[#0f764a]/20 transition cursor-pointer accent-[#0f764a]"
        {...rest}
      />
      <span className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-slate-900 transition-colors">
        {label}
        {hint ? <span className="block text-[11px] font-normal text-slate-500 mt-0.5">{hint}</span> : null}
      </span>
    </label>
  );
});

export const RadioField = forwardRef(function RadioField({ label, hint, className, ...rest }, ref) {
  return (
    <label className={cx('flex items-start gap-2.5 text-slate-800 cursor-pointer select-none group', className)}>
      <input
        ref={ref}
        type="radio"
        className="mt-0.5 w-4 h-4 text-[#0f764a] border-slate-300 focus:ring-2 focus:ring-[#0f764a]/20 transition cursor-pointer accent-[#0f764a]"
        {...rest}
      />
      <span className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-slate-900 transition-colors">
        {label}
        {hint ? <span className="block text-[11px] font-normal text-slate-500 mt-0.5">{hint}</span> : null}
      </span>
    </label>
  );
});

/** Controlled on/off switch with smooth iOS/Linear physics (role="switch"). */
export function Switch({ checked, onChange, label, disabled, id }) {
  const auto = useId();
  return (
    <button
      type="button"
      id={id || auto}
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0f764a]/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-[#0f764a]' : 'bg-slate-200 hover:bg-slate-300',
      )}
    >
      <span
        className={cx(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

/** Switch bound to React Hook Form through `Controller`-like props. */
export function SwitchRow({ label, hint, checked, onChange, className }) {
  return (
    <div className={cx('flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors', className)}>
      <div>
        <p className="font-semibold text-slate-900 text-xs sm:text-sm">{label}</p>
        {hint ? <p className="text-[11px] font-medium text-slate-500 mt-0.5">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function PasswordField({ label, error, ...rest }) {
  const [show, setShow] = useState(false);
  const auto = useId();
  const id = rest.id || auto;

  return (
    <Field id={id} label={label} error={error}>
      <div className="relative flex items-center">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={cx(INPUT, 'pe-10 font-mono tracking-wider', error && INPUT_INVALID)}
          aria-invalid={error ? 'true' : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <Icon name={show ? 'eye-off' : 'eye'} className="w-4 h-4" />
        </button>
      </div>
    </Field>
  );
}

/** Native date input styled like the rest (DatePicker). */
export const DateField = forwardRef(function DateField(props, ref) {
  return <TextField ref={ref} type="date" {...props} />;
});
