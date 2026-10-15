import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { contentService } from '@/services';
import CartPage from '@/features/cart/CartPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('سلة المشتريات', 'Shopping Cart'), robots: { index: false, follow: false } };
}

export default async function Page() {
  const settings = await contentService.getSettings();
  const fee = Number(settings.shipping_standard_fee);
  return <CartPage standardFee={Number.isFinite(fee) && fee >= 0 ? fee : 25} />;
}
