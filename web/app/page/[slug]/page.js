import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { loadPage } from '@/lib/cmsPage';
import { contentService } from '@/services';
import LegalPage from '@/features/content/LegalPage';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (slug === 'about' || slug === 'contact') return {};
  const locale = await getLocale();
  const page = await loadPage(slug);
  const en = locale === 'en';
  const title = en && page.title_en ? page.title_en : page.title_ar;
  return {
    title: (en && page.meta_title_en) || page.meta_title_ar || title,
    description: (en && page.meta_desc_en) || page.meta_desc_ar || undefined,
    alternates: { canonical: `/page/${page.slug}` },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  // /page/about and /page/contact have dedicated screens (PageController::show()).
  if (slug === 'about' || slug === 'contact') redirect(`/${slug}`);
  const [page, locale, settings] = await Promise.all([loadPage(slug), getLocale(), contentService.getSettings()]);
  const whatsapp = String(settings.contact_whatsapp || settings.whatsapp_number || '966500000000').replace(/\D+/g, '');
  return <LegalPage page={page} text={makeText(locale)} whatsapp={whatsapp} />;
}
