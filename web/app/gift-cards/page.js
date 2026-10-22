import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import GiftCardBuilder from '@/features/gift/GiftCardBuilder';
import { contentService } from '@/services';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return {
    title: tr('بطاقات الإهداء الملكية', 'Royal gift cards'),
    description: tr('أهدِ من تحب بطاقة تمرنا الرقمية أو المطبوعة بقيمة تختارها.', 'Send a digital or printed Tamrna gift card in the amount you choose.'),
    alternates: { canonical: '/gift-cards' },
  };
}

export default async function Page() {
  // With the real backend: the dashboard's preset amounts and the `accept_gift_card_amount` switch ("Other value" button).
  const options = (await contentService.getGiftCardOptions?.().catch(() => null)) ?? {};
  return <GiftCardBuilder amounts={options.amounts ?? undefined} acceptCustomAmount={options.acceptCustomAmount ?? true} />;
}
