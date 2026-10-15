'use client';

import { useState } from 'react';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField } from './FormField';

/** Labelled password input with the show / hide toggle (account forms). */
export function PasswordField({ id, label, autoComplete, error, registration, placeholder = '••••••••' }) {
  const { tr } = useLocale();
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label} error={error}>
      <div className="password-input">
        <input id={id} className="input" type={visible ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={error ? 'true' : undefined} {...registration} />
        <button type="button" className="button button--icon" aria-pressed={visible} onClick={() => setVisible((v) => !v)} aria-label={visible ? tr('إخفاء كلمة المرور', 'Hide password') : tr('إظهار كلمة المرور', 'Show password')}>
          <Icon name="eye" size={18} />
        </button>
      </div>
    </FormField>
  );
}
