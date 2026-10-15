import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import CheckoutPage from '@/features/checkout/CheckoutPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('إنهاء الطلب والدفع', 'Checkout & Payment'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <CheckoutPage />;
}
