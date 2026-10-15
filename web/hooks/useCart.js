'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { cartService } from '@/services';
import { showToast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';
import { useLocale } from '@/components/LocaleProvider';

export const cartKey = ['cart'];

/** Current cart summary (server state -> TanStack Query). */
export function useCart() {
  return useQuery({ queryKey: cartKey, queryFn: () => cartService.getCart(), staleTime: 10_000 });
}

/**
 * Cart mutations. Every call updates the cached summary from the response, surfaces the API message as a toast
 * and maps failures to friendly localized text.
 */
export function useCartActions() {
  const qc = useQueryClient();
  const openOverlay = useUiStore((s) => s.open);
  const { locale } = useLocale();

  const make = (fn, { openDrawer = false, silent = false } = {}) =>
    useMutation({
      mutationFn: fn,
      onSuccess: (res) => {
        if (res?.cart) qc.setQueryData(cartKey, res.cart);
        else qc.invalidateQueries({ queryKey: cartKey });
        if (!silent && res?.message) showToast(res.message, 'success');
        if (openDrawer) openOverlay('cart-drawer');
      },
      onError: (error) => showToast(toFriendlyMessage(error, locale), 'error'),
    });

  return {
    add: make((input) => cartService.addItem(input), { openDrawer: true }),
    update: make((input) => cartService.updateItem(input), { silent: true }),
    remove: make((input) => cartService.removeItem(input), { silent: true }),
    clear: make(() => cartService.clearCart(), { silent: true }),
    applyCoupon: make((input) => cartService.applyCoupon(input)),
    removeCoupon: make(() => cartService.removeCoupon()),
    addGiftCard: make((input) => cartService.addGiftCard(input), { openDrawer: true }),
  };
}
