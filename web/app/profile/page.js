import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import ProfilePage from '@/features/account/ProfilePage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('حسابي', 'My Account'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <ProfilePage />;
}
