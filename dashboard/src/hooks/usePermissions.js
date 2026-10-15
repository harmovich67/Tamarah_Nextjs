import { can as canUser, canAny } from '@tamrna/shared/constants';
import { useAuthStore } from '@/store/authStore';

/** Frontend permission helpers (UX only — Laravel enforces authorization). */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  return {
    user,
    can: (permission) => canUser(user, permission),
    canAny: (permissions) => canAny(user, permissions),
    isSuper: user?.role_name === 'super_admin',
  };
}
