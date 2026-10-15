import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import OrderSuccess from '@/features/checkout/OrderSuccess';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('تم تأكيد طلبك بنجاح', 'Order confirmed'), robots: { index: false, follow: false } };
}

export default async function Page({ params }) {
  const { orderNumber } = await params;
  return <OrderSuccess orderNumber={decodeURIComponent(orderNumber)} />;
}
