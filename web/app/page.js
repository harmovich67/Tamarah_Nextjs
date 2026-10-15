import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { contentService } from '@/services';
import HomePage from '@/features/home/HomePage';

export default async function Page() {
  const locale = await getLocale();
  const data = await contentService.getHomeData();
  return <HomePage data={data} text={makeText(locale)} />;
}
