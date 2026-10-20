import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import AboutPage from '@/features/content/AboutPage';
import { contentService } from '@/services';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return {
    title: tr('عن تمرنا وقصة الحصاد', 'About Tamrna'),
    description: tr('تراثٌ عريق من جذورنا إلى آفاق المستقبل: قصة تمرنا ومزارعنا وقيمنا.', 'A rich heritage from our roots to the horizon: the story of Tamrna, our farms and our values.'),
    alternates: { canonical: '/about' },
  };
}

export default async function Page() {
  const locale = await getLocale();
  // Real About content (story, principles, numbers...) when the backend serves it; the bundled copy otherwise.
  const remote = (await contentService.getAboutData?.(locale === 'en' ? 'en' : 'ar').catch(() => null)) ?? null;
  return <AboutPage text={makeText(locale)} remote={remote} />;
}
