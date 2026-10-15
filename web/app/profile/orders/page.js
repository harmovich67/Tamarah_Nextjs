import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import OrdersPage from '@/features/account/OrdersPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('طلباتي', 'My Orders'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <OrdersPage />;
}
