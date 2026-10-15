'use client';

import { useEffect } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';
import { useLocale } from '@/components/LocaleProvider';

/** Route-level error boundary: never shows raw exceptions, only the friendly 500 card. */
export default function Error({ error, reset }) {
  const { locale } = useLocale();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorCard code={500} locale={locale} onRetry={reset} />;
}
