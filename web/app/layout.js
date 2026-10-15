import '../styles/legacy/foundation.css';
import '../styles/legacy/foundation-home.css';
import '../styles/legacy/foundation-gift.css';
import '../styles/legacy/foundation-auth.css';
import '../styles/legacy/foundation-ext.css';
import './globals.css';

import { dirOf } from '@tamrna/shared/constants';
import { getLocale } from '@/lib/locale';
import { contentService } from '@/services';
import { deriveShell } from '@/lib/shellData';
import { config } from '@/lib/config';
import Providers from '@/components/Providers';
import StorefrontShell from '@/components/shell/StorefrontShell';

/** Default metadata: titles follow the PHP pattern "<page> | <site name> - <tagline>". */
export async function generateMetadata() {
  const locale = await getLocale();
  const { settings, menus } = await contentService.getShellData();
  const shell = deriveShell(settings, menus, locale);
  return {
    metadataBase: new URL(config.siteUrl),
    title: { default: `${shell.siteName} - ${shell.siteTagline}`, template: `%s | ${shell.siteName} - ${shell.siteTagline}` },
    description: shell.siteTagline,
    icons: { icon: '/assets/images/logo.png' },
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: shell.siteName,
      title: shell.siteName,
      description: shell.siteTagline,
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      images: ['/assets/images/home/hero.webp'],
    },
    twitter: { card: 'summary_large_image', title: shell.siteName, description: shell.siteTagline },
  };
}

export const viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const shellData = await contentService.getShellData();

  return (
    <html lang={locale} dir={dirOf(locale)} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/assets/fonts/thmanyah-sans-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="storefront-page" suppressHydrationWarning>
        <Providers locale={locale}>
          <StorefrontShell data={shellData}>{children}</StorefrontShell>
        </Providers>
      </body>
    </html>
  );
}
