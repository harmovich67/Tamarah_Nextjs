'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import ProductCard from '@/components/product/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/hooks/useAuth';
import { useWishlistIds } from '@/hooks/useWishlist';
import { catalogService } from '@/services';
import { showToast } from '@/store/toastStore';

/** Wishlist (registered users only, like PageController::wishlist()). */
export default function WishlistPage() {
  const { tr } = useLocale();
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const { data: ids = [], isPlaceholderData: idsLoading } = useWishlistIds();

  useEffect(() => {
    if (hydrated && !user) {
      showToast(tr('يرجى تسجيل الدخول أو إنشاء حساب لإدارة قائمتك المفضلة.', 'Please sign in or register to manage your wishlist.'), 'info');
      router.replace('/login?redirect=/wishlist');
    }
  }, [hydrated, user, router, tr]);

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['wishlist-products', ids.join(',')],
    queryFn: () => (ids.length ? catalogService.getProductsByIds(ids) : []),
    enabled: !!user,
  });

  if (!hydrated || !user) return <LoadingState rows={2} />;
  if (isLoading || idsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <section className="commerce-page wishlist-page">
      <div className="container">
        <header className="commerce-heading">
          <span className="commerce-kicker">
            <Icon name="heart" size={16} />
            {tr('مختاراتك', 'Your picks')}
          </span>
          <h1>{tr('قائمة المفضلة', 'My Wishlist')}</h1>
          <p>{tr('الأصناف التي قمت بحفظها للرجوع إليها أو إهدائها لاحقاً', 'Dates and gift selections you saved for later')}</p>
          <Link className="commerce-back" href="/catalog">{tr('تصفح الأقسام', 'Browse dates')}</Link>
        </header>

        {products?.length ? (
          <div className="product-grid catalog-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="heart"
            title={tr('قائمة المفضلة فارغة حالياً', 'Your wishlist is currently empty')}
            text={tr('يمكنك الضغط على رمز القلب الموجود على أي صنف من التمور لحفظه في قائمتك المفضلة هنا.', 'Tap the heart icon on any product to save it to your wishlist.')}
            actionHref="/catalog"
            actionLabel={tr('استكشاف التمور', 'Explore dates')}
          />
        )}
      </div>
    </section>
  );
}
