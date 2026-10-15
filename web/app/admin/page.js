import { redirect } from 'next/navigation';
import { config } from '@/lib/config';

export default function Page() {
  redirect(`${config.dashboardUrl}/`);
}
