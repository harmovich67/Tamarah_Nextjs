import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { onUnauthorized } from '@/lib/session';
import { authService } from '@/services';
import { PageLoading } from '@/components/ui';
import ForbiddenPage from '@/pages/Forbidden';

/**
 * Redirects to /login when there is no session. The session is re-validated once through authService.currentUser()
 * (so a revoked token or a role change is picked up) and any API 401 anywhere logs the user out.
 */
export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const location = useLocation();

  useEffect(() => onUnauthorized(() => clear()), [clear]);

  const { isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const fresh = await authService.currentUser();
      setUser(fresh);
      return fresh;
    },
    enabled: !!user,
    retry: false,
    staleTime: 5 * 60_000,
    meta: { silent: true },
  });

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading && !user) return <PageLoading />;
  return <Outlet />;
}

/** Forbidden screen (403) when the signed-in user lacks the permission. Laravel stays authoritative. */
export function RequirePermission({ permission, children }) {
  const { can } = usePermissions();
  if (permission && !can(permission)) return <ForbiddenPage />;
  return children;
}
