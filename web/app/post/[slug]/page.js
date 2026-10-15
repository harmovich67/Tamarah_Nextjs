import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { loadPost } from '@/lib/cmsPage';
import { contentService } from '@/services';
import LegalPage from '@/features/content/LegalPage';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await loadPost(slug);
  const en = locale === 'en';
  return {
    title: en && post.title_en ? post.title_en : post.title_ar,
    description: (en && post.excerpt_en) || post.excerpt_ar || undefined,
    alternates: { canonical: `/post/${post.slug}` },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const [post, locale, settings] = await Promise.all([loadPost(slug), getLocale(), contentService.getSettings()]);
  const whatsapp = String(settings.contact_whatsapp || settings.whatsapp_number || '966500000000').replace(/\D+/g, '');
  return <LegalPage page={post} text={makeText(locale)} whatsapp={whatsapp} />;
}
