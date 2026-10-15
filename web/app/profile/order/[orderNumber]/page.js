import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import OrderDetailPage from '@/features/account/OrderDetailPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('تفاصيل الطلب', 'Order details'), robots: { index: false, follow: false } };
}

export default async function Page({ params }) {
  const { orderNumber } = await params;
  return <OrderDetailPage orderNumber={decodeURIComponent(orderNumber)} />;
}
