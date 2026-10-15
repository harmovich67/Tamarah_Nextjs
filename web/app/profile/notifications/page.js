import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { NotificationsPage } from '@/features/account/SimpleAccountPages';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('الإشعارات', 'Notifications'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <NotificationsPage />;
}
