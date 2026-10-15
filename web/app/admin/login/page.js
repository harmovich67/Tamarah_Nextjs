import { redirect } from 'next/navigation';
import { config } from '@/lib/config';

/** Legacy PHP route: the admin portal now lives in the separate dashboard application. */
export default function Page() {
  redirect(`${config.dashboardUrl}/login`);
}
