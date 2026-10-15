import { getLocale } from '@/lib/locale';
import { makeText } from '@/lib/text';
import { parseCatalogParams } from '@/lib/catalogParams';
import { catalogService } from '@/services';
import CatalogView from '@/features/catalog/CatalogView';

export async function generateMetadata({ searchParams }) {
  const locale = await getLocale();
  const params = parseCatalogParams(await searchParams);
  const { tr } = makeText(locale);
  const title = params.filter === 'preorder' ? tr('تشكيلة الحجز المسبق للحصاد', 'Harvest Pre-Orders Collection') : tr('كافة أقسام التمور الملكية', 'All royal date collections');
  return {
    title,
    description: tr('تصفح أجود أنواع التمور السعودية: عجوة، سكري، مجدول وبوكسات إهداء فاخرة.', 'Browse the finest Saudi dates: Ajwa, Sukkari, Medjool and luxury gift boxes.'),
    alternates: { canonical: '/catalog' },
    robots: params.search || params.availability.length ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ searchParams }) {
  const params = parseCatalogParams(await searchParams);
  const { products, categories, bounds } = await catalogService.getCatalog(params);
  return <CatalogView products={products} categories={categories} bounds={bounds} params={params} />;
}
