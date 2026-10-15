import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import ForgotPasswordForm from '@/features/auth/ForgotPasswordForm';

export async function generateMetadata() {
  const { tr } = makeText(await getLocale());
  return { title: tr('نسيت كلمة المرور؟', 'Forgot password?'), robots: { index: false, follow: false } };
}

export default function Page() {
  return <ForgotPasswordForm />;
}
