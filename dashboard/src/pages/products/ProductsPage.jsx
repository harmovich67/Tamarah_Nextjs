import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { numberFormat, pickLang } from '@tamrna/shared/utils';
import { BTN, ConfirmDialog, DataTable, Icon, LinkButton, PageHeader, SearchInput, SelectField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { usePermissions } from '@/hooks/usePermissions';
import { storeService } from '@/services';
import { config } from '@/lib/config';

export const assetSrc = (p) => (!p ? '' : /^(https?:|data:)/.test(p) ? p : `/${String(p).replace(/^\//, '')}`);

/** Products & inventory table (resources/views/admin/products.php). */
export default function ProductsPage() {
  const { t, tr, locale, currency } = useT();
  const { can } = usePermissions();
  const [cat, setCat] = useQueryParam('cat', '');
  const [search, setSearch] = useQueryParam('q', '');
  const [toDelete, setToDelete] = useState(null);

  const { data: products = [], isLoading, error, refetch } = useQuery({ queryKey: ['products', { cat }], queryFn: () => storeService.listProducts({ cat }) });
  const { data: options } = useQuery({ queryKey: ['product-options'], queryFn: () => storeService.listProductFormOptions() });

  const remove = useAdminMutation((id) => storeService.deleteProduct(id), {
    invalidate: [['products'], ['dashboard']],
    success: tr('تم حذف صنف التمور من المتجر.', 'Product removed from store.'),
    onSuccess: () => setToDelete(null),
  });

  const columns = [
    {
      key: 'name',
      header: t('admin_col_product'),
      sortValue: (p) => pickLang(p, 'name', locale),
      cell: (p) => (
        <div className="flex items-center gap-3 font-bold text-stone-900">
          {p.featured_image ? (
            <img src={assetSrc(p.featured_image)} alt="" className="w-12 h-12 rounded-xl object-cover border border-stone-200 bg-stone-50 shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50 shrink-0 flex items-center justify-center text-stone-300">
              <Icon name="image" className="w-5 h-5" />
            </span>
          )}
          <div>
            <a href={`${config.storefrontUrl}/product/${p.slug}`} target="_blank" rel="noreferrer" className="hover:text-primary-700 transition font-black text-sm block">
              {locale === 'en' && p.name_en ? p.name_en : p.name_ar}
            </a>
            {p.badge ? <span className="inline-block text-[10px] font-bold text-gold-700 bg-gold-50 border border-gold-200/60 px-2 py-0.5 rounded-md mt-0.5">{p.badge}</span> : null}
            {p.status !== 'published' && <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md mt-0.5 ms-1">{tr('مسودة', 'Draft')}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('admin_col_category'),
      sortValue: (p) => p.category_name_ar || '',
      cell: (p) => <span className="bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-lg border border-slate-200/60 text-xs">{locale === 'en' && p.category_name_en ? p.category_name_en : p.category_name_ar || tr('عام', 'General')}</span>,
    },
    { key: 'weight', header: t('admin_col_weight'), hideOnMobile: true, cell: (p) => <span className="font-medium text-xs text-slate-600">{p.weight || tr('1 كجم', '1 kg')}</span> },
    {
      key: 'price',
      header: t('admin_col_price'),
      sortValue: (p) => Number(p.min_price),
      cell: (p) => (
        <span className="font-black text-primary-700 text-sm">
          {numberFormat(p.min_price, 2)} {currency}
          {p.max_price > p.min_price ? ` - ${numberFormat(p.max_price, 2)} ${currency}` : ''}
        </span>
      ),
    },
    {
      key: 'stock',
      header: t('admin_col_stock'),
      align: 'center',
      sortValue: (p) => Number(p.total_stock),
      cell: (p) => (
        p.stock_out ? (
          <span className="px-2.5 py-1 rounded-xl font-black text-xs border bg-rose-50 text-rose-700 border-rose-200/70">{tr('نفد', 'Sold out')}</span>
        ) : p.total_stock == null ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className={cx('px-2.5 py-1 rounded-xl font-black text-xs border', p.total_stock <= 15 ? 'bg-amber-50 text-amber-800 border-amber-200/70' : 'bg-emerald-50 text-emerald-800 border-emerald-200/70')}>
            {Number(p.total_stock)} {tr('عبوة', 'units')}
          </span>
        )
      ),
    },
    {
      key: 'type',
      header: t('admin_col_product_type'),
      align: 'center',
      hideOnMobile: true,
      cell: (p) =>
        p.is_preorder ? (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary-800 text-white shadow-xs">{tr('حجز مسبق', 'Pre-order')}</span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">{tr('متوفر فوري', 'In Stock')}</span>
        ),
    },
    {
      key: 'actions',
      header: t('admin_col_actions'),
      align: 'center',
      cell: (p) => (
        <div className="flex items-center justify-center gap-1.5">
          <a href={`${config.storefrontUrl}/product/${p.slug}`} target="_blank" rel="noreferrer" className={BTN.icon} title={tr('معاينة بالمتجر', 'Preview')} aria-label={tr('معاينة بالمتجر', 'Preview')}>
            <Icon name="eye" className="w-4 h-4" />
          </a>
          {can('products.edit') && (
            <Link to={`/products/${p.id}/edit`} className={BTN.iconGold} title={tr('تعديل', 'Edit')} aria-label={tr('تعديل', 'Edit')}>
              <Icon name="edit-3" className="w-4 h-4" />
            </Link>
          )}
          {can('products.delete') && (
            <button type="button" onClick={() => setToDelete(p)} className={BTN.iconDanger} title={tr('حذف', 'Delete')} aria-label={tr('حذف', 'Delete')}>
              <Icon name="trash-2" className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={t('admin_all_products_title')}
        subtitle={t('admin_all_products_sub')}
        actions={can('products.create') && (
          <LinkButton to="/products/create" icon="plus-circle" className="[&_svg]:text-gold-300">
            {t('admin_add_new_product')}
          </LinkButton>
        )}
      />

      <DataTable
        columns={columns}
        rows={products}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(p) => `${p.name_ar} ${p.name_en || ''} ${p.sku || ''} ${p.badge || ''}`}
        empty={{ icon: 'package-open', title: tr('لا توجد أصناف بعد', 'No products yet'), action: can('products.create') ? <LinkButton to="/products/create" icon="plus">{t('admin_add_new_product')}</LinkButton> : null }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('ابحث بالاسم أو رمز SKU…', 'Search by name or SKU…')} className="w-full sm:w-72" />
            <SelectField className="w-full sm:w-56 [&_select]:text-xs [&_select]:py-2" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('admin_col_category')}>
              <option value="">{tr('كل الأقسام', 'All categories')}</option>
              {(options?.categories || []).map((c) => (
                <option key={c.id} value={c.slug}>{locale === 'en' && c.name_en ? c.name_en : c.name_ar}</option>
              ))}
            </SelectField>
          </>
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate(toDelete.id)}
        loading={remove.isPending}
        message={tr(`هل أنت متأكد من حذف هذا الصنف؟ (${toDelete?.name_ar || ''})`, `Are you sure you want to delete this product? (${toDelete?.name_en || toDelete?.name_ar || ''})`)}
        confirmLabel={tr('حذف', 'Delete')}
      />
    </div>
  );
}
