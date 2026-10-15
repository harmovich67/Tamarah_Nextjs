import { config } from '@/lib/config';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/cart', '/checkout', '/profile', '/wishlist', '/login', '/register', '/forgot-password', '/verify-otp', '/order/', '/lang/', '/mock-bridge'] }],
    sitemap: `${config.siteUrl}/sitemap.xml`,
    host: config.siteUrl,
  };
}
