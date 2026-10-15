import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { SettingsPage } from '@/features/account/SimpleAccountPages';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('الإعدادات', 'Settings'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <SettingsPage />;
}
