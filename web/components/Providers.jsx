'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { LocaleProvider } from './LocaleProvider';
import { useAuthStore } from '@/store/authStore';
import { onUnauthorized } from '@/lib/session';
import { showToast } from '@/store/toastStore';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx responses are final (validation, auth, not found); retry only transient failures once.
        retry: (count, error) => (error?.status >= 400 && error?.status < 500 ? false : count < 1),
      },
    },
  });
}

/** Restores the persisted session and reacts to API 401s (session expiry) from anywhere in the app. */
function SessionBridge({ locale }) {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(
    () =>
      onUnauthorized((error) => {
        if (!useAuthStore.getState().user) return;
        clear();
        showToast(toFriendlyMessage(error, locale), 'info');
        router.push('/login');
      }),
    [clear, router, locale],
  );
  return null;
}

export default function Providers({ locale, children }) {
  const [client] = useState(makeQueryClient);
  return (
    <LocaleProvider locale={locale}>
      <QueryClientProvider client={client}>
        <SessionBridge locale={locale} />
        {children}
      </QueryClientProvider>
    </LocaleProvider>
  );
}
