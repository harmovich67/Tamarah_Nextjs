import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import VerifyOtpForm from '@/features/auth/VerifyOtpForm';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('تأكيد رقم الجوال', 'Verify your mobile'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <VerifyOtpForm />;
}
