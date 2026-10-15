import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/locale';

/** GET /checkout/payment/cancel — back to checkout with the cancellation notice. */
export default async function Page() {
  const locale = await getLocale();
  const msg = locale === 'en' ? 'Payment was cancelled. You can choose another method or try again.' : 'تم إلغاء عملية الدفع، يمكنك اختيار وسيلة دفع أخرى أو إعادة المحاولة';
  redirect(`/checkout?error=${encodeURIComponent(msg)}`);
}
