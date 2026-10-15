'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { useLocale } from '@/components/LocaleProvider';
import { LoadingState } from '@/components/ui/States';
import { cartKey } from '@/hooks/useCart';
import { checkoutService } from '@/services';

/**
 * Return URL of the payment gateway (/checkout/payment/callback/{provider}). Asks the API to verify the payment,
 * then goes to the confirmation page or back to checkout with the failure message.
 */
function Callback({ provider }) {
  const { locale, tr } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = Object.fromEntries(params.entries());
    checkoutService
      .verifyPayment({ provider, ...query })
      .then((res) => {
        qc.invalidateQueries({ queryKey: cartKey });
        if (res.paid) router.replace(`/order/${res.order_number}?payment_status=success`);
        else router.replace(`/checkout?error=${encodeURIComponent(res.message || tr('تم رفض أو إلغاء عملية الدفع. يمكنك إعادة المحاولة.', 'The payment was declined or cancelled. You can try again.'))}`);
      })
      .catch((error) => router.replace(`/checkout?error=${encodeURIComponent(toFriendlyMessage(error, locale))}`));
  }, [params, provider, qc, router, locale, tr]);

  return <LoadingState rows={1} label={tr('جارٍ التحقق من الدفع…', 'Verifying your payment…')} />;
}

export default function PaymentCallback({ provider }) {
  return (
    <Suspense fallback={<LoadingState rows={1} />}>
      <Callback provider={provider} />
    </Suspense>
  );
}
