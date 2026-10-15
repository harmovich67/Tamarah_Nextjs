import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import LoginForm from '@/features/auth/LoginForm';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('تسجيل الدخول', 'Sign in'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <LoginForm />;
}
