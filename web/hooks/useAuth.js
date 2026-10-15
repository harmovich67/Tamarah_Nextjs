'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/** Current session + convenience flags. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  return { user, hydrated, isAuthenticated: !!user, isStaff: !!user && ['super_admin', 'store_manager'].includes(user.role_name) };
}

/**
 * Redirect to /login?required_login=1&redirect=<current path> when the visitor is not signed in
 * (ProfileController::requireAuth()). Returns the user once known.
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  useEffect(() => {
    if (auth.hydrated && !auth.user) {
      router.replace(`/login?required_login=1&redirect=${encodeURIComponent(pathname)}`);
    }
  }, [auth.hydrated, auth.user, router, pathname]);
  return auth;
}
