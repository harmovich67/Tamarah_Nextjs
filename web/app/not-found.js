import { getLocale } from '@/lib/locale';
import ErrorCard from '@/components/ui/ErrorCard';

export const metadata = { title: '404', robots: { index: false } };

export default async function NotFound() {
  return <ErrorCard code={404} locale={await getLocale()} />;
}
