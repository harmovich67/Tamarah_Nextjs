import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import WishlistPage from '@/features/account/WishlistPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('قائمة رغباتي والمفضلة', 'My Wishlist'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <WishlistPage />;
}
