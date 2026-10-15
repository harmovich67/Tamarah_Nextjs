import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { useLocaleStore } from '@/store/localeStore';

/**
 * Mutation wrapper: shows a success toast, maps API errors to friendly localized toasts, and invalidates the given
 * query keys. Field-level (422) errors are passed to `onFieldErrors` so forms can mark the inputs.
 *
 * @param {(vars:any)=>Promise<any>} mutationFn
 * @param {{ invalidate?: any[][], success?: string | ((data:any, vars:any)=>string), onSuccess?: Function, onFieldErrors?: (errors: Record<string,string[]>) => void, silentError?: boolean }} [options]
 */
export function useAdminMutation(mutationFn, { invalidate = [], success, onSuccess, onFieldErrors, silentError = false } = {}) {
  const qc = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      invalidate.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      const message = typeof success === 'function' ? success(data, vars) : success;
      if (message) toast.success(message);
      onSuccess?.(data, vars);
    },
    onError: (error) => {
      if (error?.status === 422 && error.errors && onFieldErrors) onFieldErrors(error.errors);
      if (!silentError) toast.error(toFriendlyMessage(error, locale));
    },
  });
}
