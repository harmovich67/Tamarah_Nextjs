import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import RegisterForm from '@/features/auth/RegisterForm';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('إنشاء حساب جديد', 'Create an account'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <RegisterForm />;
}
