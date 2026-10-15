'use client';

import { useToastStore } from '@/store/toastStore';

/** The Foundation floating toast (`.cart-feedback`), driven by the toast store. */
export default function ToastHost() {
  const { message, type, id } = useToastStore();
  return (
    <div className="cart-feedback" role="status" aria-live="polite" aria-atomic="true">
      <span key={id} id="tumurna-toast" data-type={message ? type : undefined}>
        {message}
      </span>
    </div>
  );
}
