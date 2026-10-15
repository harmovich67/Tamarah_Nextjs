import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { GiftCardsPage } from '@/features/account/SimpleAccountPages';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('بطاقات الهدايا', 'Gift cards'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <GiftCardsPage />;
}
