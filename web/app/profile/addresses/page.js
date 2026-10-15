import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import AddressesPage from '@/features/account/AddressesPage';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('عناويني', 'My addresses'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <AddressesPage />;
}
