import { config } from '@/lib/config';
import { contentService } from '@/services';

/** /sitemap.xml — static routes + published products, categories, CMS pages and posts. */
export const revalidate = 3600;

export default async function sitemap() {
  const entries = await contentService.getSitemapEntries();
  const abs = (path) => `${config.siteUrl}${path}`;
  const now = new Date();
  const staticRoutes = ['/', '/catalog', '/catalog?filter=preorder', '/gift-cards', '/about', '/contact'].map((path) => ({
    url: abs(path),
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
  const dated = (rows, prefix, priority) =>
    rows.map((r) => ({ url: abs(`${prefix}${r.slug}`), lastModified: r.updated_at ? new Date(String(r.updated_at).replace(' ', 'T')) : now, changeFrequency: 'weekly', priority }));
  return [
    ...staticRoutes,
    ...entries.categories.map((c) => ({ url: abs(`/catalog?cat=${c.slug}`), lastModified: now, changeFrequency: 'weekly', priority: 0.6 })),
    ...dated(entries.products, '/product/', 0.8),
    ...dated(entries.pages, '/page/', 0.4),
    ...dated(entries.posts, '/post/', 0.4),
  ];
}
