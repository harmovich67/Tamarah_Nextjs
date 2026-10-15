/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared workspace package ships untranspiled JSX / JSON.
  transpilePackages: ['@tamrna/shared'],
  poweredByHeader: false,
  images: { unoptimized: true },
  async redirects() {
    return [
      // Legacy PHP route aliases kept working (see docs/MIGRATION_MAP.md)
      { source: '/account', destination: '/profile', permanent: false },
      { source: '/account/profile', destination: '/profile', permanent: false },
      { source: '/account/orders', destination: '/profile/orders', permanent: false },
      { source: '/account/addresses', destination: '/profile/addresses', permanent: false },
      { source: '/account/gift-cards', destination: '/profile/gift-cards', permanent: false },
      { source: '/account/notifications', destination: '/profile/notifications', permanent: false },
      { source: '/account/settings', destination: '/profile/settings', permanent: false },
      { source: '/schools', destination: '/catalog', permanent: true },
      { source: '/schools/:slug', destination: '/catalog', permanent: true },
      { source: '/checkout/success/:orderNumber', destination: '/order/:orderNumber', permanent: false },
    ];
  },
};

export default nextConfig;
