import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { contentService } from '@/services';
import ContactPage from '@/features/content/ContactPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return {
    title: tr('فروعنا وتواصل معنا', 'Branches & Contact'),
    description: tr('تواصل مع تمرنا أو زر أقرب فرع إليك في الرياض وجدة والمدينة المنورة.', 'Contact Tamrna or visit the nearest branch in Riyadh, Jeddah and Madinah.'),
    alternates: { canonical: '/contact' },
  };
}

export default async function Page() {
  const s = await contentService.getSettings();
  return (
    <ContactPage
      phone={s.contact_phone || '8001248888'}
      email={s.contact_email || 'care@tumurna.com'}
      whatsapp={String(s.contact_whatsapp || s.whatsapp_number || '966500000000').replace(/\D+/g, '')}
    />
  );
}
