import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from './routes';
import { useLocaleStore } from './store/localeStore';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx responses are final (validation / auth / not found); only transient failures retry once.
        retry: (count, error) => (error?.status >= 400 && error?.status < 500 ? false : count < 1),
      },
    },
  });
}

export default function App() {
  const [client] = useState(makeQueryClient);
  const dir = useLocaleStore((s) => (s.locale === 'ar' ? 'rtl' : 'ltr'));
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} dir={dir} richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </QueryClientProvider>
  );
}
