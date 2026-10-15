import LogoutRunner from '@/features/auth/LogoutRunner';

export const metadata = { robots: { index: false, follow: false } };

/** GET /logout — same URL as PHP; clears the session client-side, then goes home. */
export default function Page() {
  return <LogoutRunner />;
}
