'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { accountService } from '@/services';
import { showToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { useLocale } from '@/components/LocaleProvider';

const key = (userId) => ['wishlist', userId ?? 'guest'];

/** Ids of the signed-in user's wishlist (empty for guests: PHP restricts the wishlist to registered users). */
export function useWishlistIds() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: key(user?.id),
    queryFn: () => accountService.getWishlistIds(),
    enabled: !!user,
    // placeholderData (not initialData): initialData is treated as fresh and would suppress the first fetch for
    // `staleTime`, leaving hearts and the wishlist page empty after every reload.
    placeholderData: [],
    staleTime: 30_000,
  });
}

/** Toggle helper used by product cards and the product page (tumurnaToggleWishlist). */
export function useWishlistToggle() {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { locale } = useLocale();

  return useMutation({
    mutationFn: (productId) => accountService.toggleWishlist(productId),
    onSuccess: (res, productId) => {
      if (res.requires_login) {
        showToast(res.message, 'info');
        setTimeout(() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`), 1000);
        return;
      }
      qc.setQueryData(key(user?.id), (ids = []) =>
        res.in_wishlist ? [...new Set([...ids, Number(productId)])] : ids.filter((id) => Number(id) !== Number(productId)),
      );
      qc.invalidateQueries({ queryKey: ['wishlist-products'] });
      showToast(res.message, res.in_wishlist ? 'success' : 'info');
    },
    onError: (error) => showToast(toFriendlyMessage(error, locale), 'error'),
  });
}
