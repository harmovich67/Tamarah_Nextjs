import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import GiftCardBuilder from '@/features/gift/GiftCardBuilder';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return {
    title: tr('بطاقات الإهداء الملكية', 'Royal gift cards'),
    description: tr('أهدِ من تحب بطاقة تمرنا الرقمية أو المطبوعة بقيمة تختارها.', 'Send a digital or printed Tamrna gift card in the amount you choose.'),
    alternates: { canonical: '/gift-cards' },
  };
}

export default function Page() {
  return <GiftCardBuilder />;
}
