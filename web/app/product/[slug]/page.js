import { notFound } from 'next/navigation';
import { pickLang, effectivePrice } from '@tamrna/shared/utils';
import { getLocale } from '@/lib/locale';
import { config } from '@/lib/config';
import { asset } from '@/lib/asset';
import { catalogService, contentService } from '@/services';
import ProductDetail from '@/features/product/ProductDetail';

async function load(slug) {
  try {
    return await catalogService.getProduct(decodeURIComponent(slug));
  } catch (error) {
    if (error?.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const locale = await getLocale();
  const { product } = await load(slug);
  const name = pickLang(product, 'name', locale);
  const description = pickLang(product, 'description', locale);
  const url = `/product/${product.slug}`;
  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: name, description, url, images: [asset(product.featured_image)] },
    twitter: { card: 'summary_large_image', title: name, description, images: [asset(product.featured_image)] },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const locale = await getLocale();
  const [{ product, variants, related }, settings] = await Promise.all([load(slug), contentService.getSettings()]);
  const whatsapp = String(settings.contact_whatsapp || settings.whatsapp_number || '').replace(/\D+/g, '') || '966500000000';
  const shareUrl = `${config.siteUrl}/product/${product.slug || product.id}`;

  // schema.org Product structured data (SEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: pickLang(product, 'name', locale),
    description: pickLang(product, 'description', locale),
    image: `${config.siteUrl}${asset(product.featured_image)}`,
    sku: product.sku,
    category: pickLang(product, 'category_name', locale),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'SAR',
      price: effectivePrice(variants[0] || product),
      availability: Number(product.stock_quantity) > 0 || product.is_preorder ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: shareUrl,
    },
    ...(Number(product.rating) > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.rating_count || 1 } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductDetail product={product} variants={variants} related={related} whatsapp={whatsapp} shareUrl={shareUrl} />
    </>
  );
}
